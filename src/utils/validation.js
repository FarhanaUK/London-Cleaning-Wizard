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

  postcode:  { test: v => /^(EC[1-4]|WC[1-2]|E[1-9]|E1[0-8]|N[1-9]|N1[0-9]|N20|N21|N22|NW[1-9]|NW1[0-1]|SE[1-9]|SE1[0-9]|SE2[0-8]|SW[1-9]|SW1[0-9]|W[1-9]|W1[0-4]|WC[1-2]|BR[1-8]|CR[0-9]|DA[1-9]|DA1[0-8]|EN[1-9]|EN1[0-1]|HA[0-9]|IG[1-9]|IG1[0-1]|KT[1-9]|KT1[0-9]|KT2[0-4]|RM[1-9]|RM1[0-9]|RM2[0]|SM[1-7]|TW[1-9]|TW1[0-9]|TW2[0]|UB[1-9]|UB1[0-1])\s?[0-9][A-Z]{2}$/i.test(v.trim()), msg: 'We currently serve London. If your postcode is outside London, please call us on 020 8137 0026 to check availability.' },
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
  if (!booking.supplies)     return 'Please select your supplies preference.';
  if (!booking.mopAck)       return 'Please confirm you have a working mop and vacuum at the property.';
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