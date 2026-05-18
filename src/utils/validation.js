export const RULES = {
  firstName: { test: v => v.trim().length >= 2,                                                        msg: 'Please enter your first name.' },
  lastName:  { test: v => v.trim().length >= 2,                                                        msg: 'Please enter your last name.' },
  email:     { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),                                msg: 'Please enter a valid email address.' },
  phone: {
    test: v => {
      const cleaned = v.replace(/\s/g, '');
      // UK mobile: 07xxxxxxx or +447xxxxxxx
      const mobile = /^(\+44?7\d{9}|07\d{9})$/.test(cleaned);
      // UK landline: 01xxxxxxx, 02xxxxxxx or +441xxxxxxx, +442xxxxxxx
      const landline = /^(\+44?[12]\d{8}|0[12]\d{8})$/.test(cleaned);
      return mobile || landline;
    },
    msg: 'Please enter a valid UK mobile or landline number.'
  },

  postcode:  { test: v => /^(E1W|E[1-9]|E1[0-7]|EC[1-4][A-Z]|WC[1-2][A-Z]|N[1-8]|N16|NW[1-3]|NW5|NW6|NW8|SE[1-9]|SE1[0-7]|SW1[A-Z]|SW[2-9]|SW1[0-2]|W1[A-Z]|W[2-9]|W1[0-4])\s?[0-9][A-Z]{2}$/i.test(v.trim()), msg: 'We currently serve across central and east London. If your postcode is outside our area, please call us on 020 8137 0026 to check availability.' },
  addr1:     { test: v => v.trim().length >= 5,                                                        msg: 'Please enter your address.' },
};

export function validateForm(form) {
  const errors = {};
  Object.entries(RULES).forEach(([field, rule]) => {
    if (!rule.test(form[field] || '')) errors[field] = rule.msg;
  });
  return errors;
}

export function validateField(field, value) {
  const rule = RULES[field];
  if (!rule) return null;
  return rule.test(value) ? null : rule.msg;
}

export function validateStep1(booking) {
  if (!booking.pkg) return 'Please select a package.';
  if (booking.pkg?.isHourly && !booking.size) return 'Please select how many hours.';
  if (booking.pkg?.isHourly && !booking.notes?.trim()) return 'Please tell us what you need done so we can prepare your cleaner.';
  if (booking.pkg?.id === 'office_cleaning' && !booking.size) return 'Please select how many hours.';
  if (booking.pkg?.id === 'office_cleaning' && !booking.notes?.trim()) return 'Please tell us what you need done so we can prepare your cleaner.';
  return null;
}

export function validateStep1b(booking) {
  const isHourly = booking.pkg?.isHourly;
  const isOffice = booking.pkg?.id === 'office_cleaning';
  if (!isHourly && !isOffice && !booking.propertyType) return 'Please select flat or house.';
  if (!isHourly && !isOffice && !booking.size) return 'Please select your property size.';
  return null;
}

export function validateStep2(booking) {
  if (booking.pkg?.showFreq && !booking.freq) return 'Please select how often you would like us to clean.';
  if (!booking.cleanDate) return 'Please select a date.';
  if (!booking.cleanTime) return 'Please select a time slot.';
  const sel   = new Date(booking.cleanDate);
  const today = new Date(); today.setHours(0,0,0,0);
  if (sel < today) return 'Please select a future date.';
  return null;
}