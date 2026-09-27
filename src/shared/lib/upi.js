// UPI deep link (NPCI "upi://pay" format) understood by Google Pay, PhonePe, Paytm, BHIM…
// Opening it on a phone shows the UPI app chooser with payee, amount and note filled in.
export const buildUpiLink = ({ upiId, name, amount, note }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name || '',
    am: Number(amount || 0).toFixed(2),
    cu: 'INR',
    tn: (note || '').slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
};

export const isValidUpiId = (value) => /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.]{1,64}$/i.test(String(value || ''));

// Phones hand upi:// links to installed UPI apps; desktops can't, so they show a QR instead.
export const canOpenUpiApps = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);
