const API_BASE = import.meta.env.VITE_API_URL || '/api';
const ORG_KEY = 'organizationId';
const TIMEOUT_MS = 20000;

const readStoredOrg = () => {
  try {
    return localStorage.getItem(ORG_KEY) || '';
  } catch {
    return '';
  }
};

let organizationId = readStoredOrg();

const storeOrg = (id) => {
  organizationId = id || '';
  try {
    if (id) localStorage.setItem(ORG_KEY, id);
    else localStorage.removeItem(ORG_KEY);
  } catch {
    // storage unavailable (private mode); the id still lives in memory
  }
};

const qs = (params) => {
  if (!params) return '';
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

async function request(endpoint, options = {}, retried = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(organizationId ? { 'x-organization-id': organizationId } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    throw new Error(
      err.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : navigator.onLine
          ? 'Cannot reach the server. Check that the backend is running.'
          : 'You’re offline. Reconnect to the internet and try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));

  // A stale org id in storage (e.g. after switching databases): reset it once and retry.
  if (res.status === 400 && /Unknown organization/.test(data.message || '') && !retried) {
    storeOrg('');
    await initOrg();
    return request(endpoint, options, true);
  }

  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const body = (method, payload) => ({ method, body: JSON.stringify(payload ?? {}) });

export async function initOrg() {
  const org = await request('/org');
  storeOrg(org.organizationId);
  return org;
}

export const api = {
  dashboard: () => request('/dashboard'),
  org: {
    get: () => request('/org'),
    update: (payload) => request('/org', body('PUT', payload)),
  },
  staff: {
    getAll: (params) => request(`/staff${qs(params)}`),
    get: (id) => request(`/staff/${id}`),
    create: (payload) => request('/staff', body('POST', payload)),
    update: (id, payload) => request(`/staff/${id}`, body('PUT', payload)),
    delete: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
  },
  sites: {
    getAll: () => request('/sites'),
    get: (id) => request(`/sites/${id}`),
    create: (payload) => request('/sites', body('POST', payload)),
    update: (id, payload) => request(`/sites/${id}`, body('PUT', payload)),
    delete: (id) => request(`/sites/${id}`, { method: 'DELETE' }),
    getStaff: (id) => request(`/sites/${id}/staff`),
    assign: (id, staffIds) => request(`/sites/${id}/assign`, body('POST', { staffIds })),
    unassign: (id, staffId) => request(`/sites/${id}/assign/${staffId}`, { method: 'DELETE' }),
    progress: (id) => request(`/sites/${id}/progress`),
    finance: (id) => request(`/sites/${id}/finance`),
  },
  attendance: {
    getBySite: (params) => request(`/attendance${qs(params)}`),
    bulk: (payload) => request('/attendance/bulk', body('POST', payload)),
    getByStaff: (staffId, params) => request(`/attendance/staff/${staffId}${qs(params)}`),
  },
  payments: {
    getAll: (params) => request(`/payments${qs(params)}`),
    preview: (params) => request(`/payments/preview${qs(params)}`),
    outstanding: (params) => request(`/payments/outstanding${qs(params)}`),
    create: (payload) => request('/payments', body('POST', payload)),
    markPaid: (id, payload) => request(`/payments/${id}/mark-paid`, body('PUT', payload)),
    cancel: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
    get: (id) => request(`/payments/${id}`),
  },
  advances: {
    getAll: (params) => request(`/advances${qs(params)}`),
    balances: () => request('/advances/balances'),
    create: (payload) => request('/advances', body('POST', payload)),
    delete: (id) => request(`/advances/${id}`, { method: 'DELETE' }),
  },
  payroll: {
    list: () => request('/payroll'),
    preview: (params) => request(`/payroll/preview${qs(params)}`),
    create: (payload) => request('/payroll', body('POST', payload)),
    get: (id) => request(`/payroll/${id}`),
    markPaid: (id, payload) => request(`/payroll/${id}/mark-paid`, body('PUT', payload)),
    cancel: (id) => request(`/payroll/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    getAll: (params) => request(`/expenses${qs(params)}`),
    create: (payload) => request('/expenses', body('POST', payload)),
    update: (id, payload) => request(`/expenses/${id}`, body('PUT', payload)),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  receipts: {
    getAll: (params) => request(`/receipts${qs(params)}`),
    create: (payload) => request('/receipts', body('POST', payload)),
    delete: (id) => request(`/receipts/${id}`, { method: 'DELETE' }),
  },
  leaves: {
    get: (params) => request(`/leaves${qs(params)}`),
    create: (payload) => request('/leaves', body('POST', payload)),
    update: (id, payload) => request(`/leaves/${id}`, body('PUT', payload)),
    delete: (id) => request(`/leaves/${id}`, { method: 'DELETE' }),
  },
  performance: {
    get: (params) => request(`/performance${qs(params)}`),
    save: (payload) => request('/performance', body('POST', payload)),
    delete: (id) => request(`/performance/${id}`, { method: 'DELETE' }),
  },
  reports: {
    summary: (params) => request(`/reports/summary${qs(params)}`),
    muster: (params) => request(`/reports/muster${qs(params)}`),
  },
};
