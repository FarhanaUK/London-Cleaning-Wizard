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

  postcode:  { test: v => /^E\d{1,2}\s?\d[A-Z]{2}$/i.test(v.trim()),                                  msg: 'Please enter an East London postcode (E1–E18).' },
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
  if (!booking.pkg)          return 'Please select a package.';
  if (!booking.propertyType) return 'Please select flat or house.';
  if (!booking.size)         return 'Please select your property size.';
  if (booking.pkg?.showFreq && !booking.freq) return 'Please select how often you would like us to clean.';
  return null;
}

export function validateStep2(booking) {
  if (!booking.cleanDate) return 'Please select a date.';
  if (!booking.cleanTime) return 'Please select a time slot.';
  const sel   = new Date(booking.cleanDate);
  const today = new Date(); today.setHours(0,0,0,0);
  if (sel < today) return 'Please select a future date.';
  return null;
}