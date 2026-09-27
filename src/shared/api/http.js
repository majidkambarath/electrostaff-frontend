// HTTP adapter shared by every feature's API module: base URL, auth token, timeouts and
// error normalisation. Features never call fetch directly.
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'electrostaff.token';
const TIMEOUT_MS = 20000;

const storage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set: (value) => {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // private mode: the token still lives in memory for this tab
    }
  },
};

let token = storage.get();
const unauthorizedListeners = new Set();

export const getToken = () => token;
export const setToken = (value) => {
  token = value || '';
  storage.set(token);
};
// Called when the server rejects the session (expired, password changed, access revoked).
export const onUnauthorized = (fn) => {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
};

export const qs = (params) => {
  if (!params) return '';
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const json = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) });

async function send(endpoint, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    const error = new Error(
      err.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : navigator.onLine
          ? 'Cannot reach the server. Check your connection or that the backend is running.'
          : 'You’re offline. Reconnect to the internet and try again.'
    );
    error.network = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const fail = (res, data) => {
  const error = new Error(data?.message || `Request failed (${res.status})`);
  error.status = res.status;
  // A rejected session signs the app out, except on the sign-in call itself.
  if (res.status === 401 && token) unauthorizedListeners.forEach((fn) => fn(error));
  return error;
};

export async function request(endpoint, options) {
  const res = await send(endpoint, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw fail(res, data);
  return data;
}

// Binary responses (e.g. payment proof images) as an object URL.
export async function requestBlobUrl(endpoint) {
  const res = await send(endpoint);
  if (!res.ok) throw fail(res, await res.json().catch(() => ({})));
  return URL.createObjectURL(await res.blob());
}
