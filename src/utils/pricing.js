export const SUPPLIES_FEE      = 8;
export const DEEP_SUPPLIES_FEE = 15;

export function applyPromotion(rawT, promotion, pkgId = null) {
  if (!promotion || !promotion.active) return rawT;

  const targeted =
    !pkgId ||
    (promotion.packages || []).includes('all') ||
    (promotion.packages || []).includes(pkgId);
  if (!targeted) return rawT;

  let discountAmount;
  if (promotion.discount?.type === 'percentage') {
    discountAmount = parseFloat((rawT.subtotal * promotion.discount.value / 100).toFixed(2));
  } else {
    discountAmount = parseFloat(Math.min(promotion.discount?.value || 0, rawT.subtotal).toFixed(2));
  }

  const newSubtotal = parseFloat((rawT.subtotal - discountAmount).toFixed(2));
  const newDeposit  = Math.round(newSubtotal * 30) / 100;

  return {
    ...rawT,
    originalSubtotal:     rawT.subtotal,
    subtotal:             newSubtotal,
    deposit:              newDeposit,
    remaining:            parseFloat((newSubtotal - newDeposit).toFixed(2)),
    launchDiscount:       discountAmount,
    promotionLabel:       promotion.label || 'Promotion discount',
    promotionAppliesTo:   promotion.appliesTo || 'first_clean',
  };
}

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
