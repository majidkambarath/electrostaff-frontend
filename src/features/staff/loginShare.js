import { whatsappUrl } from '@/shared/lib/format';

// Staff-app login message, formatted for WhatsApp (*bold*), sent to the worker's own number.
export const loginMessage = ({ name, phone, password }, business) =>
  [
    `Hello ${name.split(' ')[0]} 👋`,
    `Your *${business || 'ElectroStaff'}* staff app login:`,
    '',
    `🔗 App: ${window.location.origin}`,
    `📱 Mobile: *${phone}*`,
    `🔑 Password: *${password}*`,
    '',
    'Open the link, sign in, then set your own password. You can mark attendance, see payslips and apply for leave.',
  ].join('\n');

export const loginWhatsappUrl = (credentials, business) => whatsappUrl(credentials.phone, loginMessage(credentials, business));

// Opens WhatsApp on the worker's chat with the login typed in. Returns false when the browser
// blocked the new tab, so the caller can leave a "Send on WhatsApp" button to tap instead.
// With { navigate: true } a blocked tab falls back to opening WhatsApp in this tab.
export const sendLoginOnWhatsApp = (credentials, business, { navigate = false } = {}) => {
  const url = loginWhatsappUrl(credentials, business);
  try {
    // No 'noopener' feature: with it window.open always returns null and a block can't be detected.
    const tab = window.open(url, '_blank');
    if (tab) {
      tab.opener = null;
      return true;
    }
  } catch {
    // blocked
  }
  if (navigate) {
    window.location.assign(url);
    return true;
  }
  return false;
};

export const businessLabel = (org) => (org?.name && org.name !== 'Default Organization' ? org.name : 'ElectroStaff');
