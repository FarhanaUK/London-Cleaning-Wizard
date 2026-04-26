export const SUPPLIES_FEE      = 8;
export const DEEP_SUPPLIES_FEE = 15;

export function calculateTotal({ sizePrice, propertyType, frequency, addons, surcharge, supplies, suppliesFeeOverride }) {
  const mult        = propertyType === 'house' ? 1.10 : 1.0;
  const base        = Math.round(sizePrice * mult);
  const freqSave    = frequency?.saving || 0;
  const addnSum     = (addons || []).reduce((s, a) => s + a.price, 0);
  const sur         = surcharge || 0;
  const suppliesFee = supplies === 'cleaner' ? (suppliesFeeOverride ?? SUPPLIES_FEE) : 0;
  const subtotal    = base - freqSave + addnSum + sur + suppliesFee;
  const depositRaw  = Math.round(subtotal * 30) / 100;
  return {
    base,
    houseExtra: propertyType === 'house' ? Math.round(sizePrice * 0.10) : 0,
    freqSave, addnSum, surcharge: sur, suppliesFee, subtotal,
    deposit:   depositRaw,
    remaining: subtotal - depositRaw,
  };
}
