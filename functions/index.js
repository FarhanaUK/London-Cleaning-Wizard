// v2
const { onRequest }        = require('firebase-functions/v2/https');
const { onSchedule }       = require('firebase-functions/v2/scheduler');
const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin            = require('firebase-admin');
const Stripe           = require('stripe');
const { google }       = require('googleapis');
const emailjs          = require('@emailjs/nodejs');
const crypto           = require('crypto');
const { guard, clean } = require('./middleware');
const { toUTCISO, todayUK } = require('./timeUtils');

if (!admin.apps.length) { admin.initializeApp(); }

const FREQ_SAVINGS = { weekly: 30, fortnightly: 15, monthly: 7 };

const { recurringPackages: PACKAGE_BASE_PRICES, houseMultiplier: HOUSE_MULTIPLIER } = require('./pricing.json');

const STRIPE_KEY            = defineSecret('STRIPE_SECRET_KEY');
const EMAILJS_KEY           = defineSecret('EMAILJS_PRIVATE_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

async function sendEmail(templateId, params, privateKey) {
  return emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    templateId,
    params,
    { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey }
  );
}

async function sendContractReceipt(b, periodKey, amount, prevAddons, addonsFromVisits, paymentRef, emailjsKey) {
  const template = process.env.EMAILJS_CONTRACT_RECEIPT_TEMPLATE;
  if (!template) return;
  const start = new Date(periodKey + 'T12:00:00');
  const end   = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(end.getDate() - 1);
  const prev  = new Date(start); prev.setMonth(prev.getMonth() - 1);
  const fmt   = (d, y) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), timeZone: 'Europe/London' });
  const period      = `${fmt(start)} – ${fmt(end, true)}`;
  const addonsPeriod = `${fmt(prev)} – ${fmt(new Date(start.getTime() - 86400000), true)}`;
  const addonsList  = addonsFromVisits.length > 0 ? [...new Set(addonsFromVisits)].join(', ') : 'None';
  const base        = parseFloat(b.monthlyBaseValue || 0);
  await sendEmail(template, {
    to_name:              b.contactName || b.firstName,
    to_email:             b.email,
    business_name:        b.bizName || `${b.firstName} ${b.lastName}`.trim(),
    booking_ref:          b.bookingRef || '',
    package_name:         b.packageName || '',
    period,
    address:              [b.addr1, b.postcode].filter(Boolean).join(', '),
    base_charge:          `£${base.toFixed(2)}`,
    addons_period:        addonsPeriod,
    addons_list:          addonsList,
    addons_charge:        `£${prevAddons.toFixed(2)}`,
    total_charged:        `£${amount.toFixed(2)}`,
    payment_ref:          paymentRef,
    intro_text:           `Your monthly contract payment has been collected — thank you. Please find your payment breakdown below for the period ${period}.`,
    payment_note_display: 'none',
    payment_note:         '',
  }, emailjsKey).catch(() => {});
}

// Cache calendar clients per scope so auth is only initialised once per container instance
const _calCache = {};
async function getCalendarClient(scope) {
  const s = scope || 'https://www.googleapis.com/auth/calendar';
  if (!_calCache[s]) {
    const auth = new google.auth.GoogleAuth({ keyFile: 'service-account.json', scopes: [s] });
    const client = google.calendar({ version: 'v3', auth: await auth.getClient() });
    // Wrap events.insert so a transient failure (network blip, brief rate-limit) retries
    // instead of leaving a booking saved with no calendarEventId (which makes it undeletable
    // from Google Calendar later). Retries 3 times with a short backoff, then throws.
    const rawInsert = client.events.insert.bind(client.events);
    client.events.insert = async (...args) => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { return await rawInsert(...args); }
        catch (e) {
          lastErr = e;
          if (attempt < 2) await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        }
      }
      throw lastErr;
    };
    _calCache[s] = client;
  }
  return _calCache[s];
}

// Returns a Google Calendar colorId based on booking status and frequency
function calColorId(status, frequency) {
  if (frequency && frequency !== 'one-off') {
    const depositCollected = status === 'deposit_paid' || status === 'fully_paid';
    return depositCollected ? '3' : '5'; // Grape = purple (recurring paid), Banana = yellow (scheduled recurring)
  }
  switch (status) {
    case 'deposit_paid':   return '7';  // Peacock = blue
    case 'fully_paid':     return '2';  // Sage = green
    case 'payment_failed': return '11'; // Tomato = red
    case 'cancelled_full_refund':
    case 'cancelled_partial_refund':
    case 'cancelled_no_refund':
    case 'cancelled_late_fee': return '8'; // Graphite = grey
    default:               return '6';  // Tangerine = orange (pending deposit)
  }
}

function buildBookingEmailData(b) {
  return {
    booking_ref:     b.bookingRef,
    package_name:    b.packageName,
    date:            b.cleanDate.split('-').reverse().join('/'),
    date_subject:    b.cleanDate.split('-').reverse().join('.'),
    time:            b.cleanTime,
    address:         `${b.addr1}, ${b.postcode}`,
    total:           `£${parseFloat(b.total).toFixed(2)}`,
    deposit_paid:    `£${parseFloat(b.deposit).toFixed(2)}`,
    remaining:       `£${parseFloat(b.remaining).toFixed(2)}`,
    notes:           clean(b.notes||''),
    keys:            clean(b.keys||''),
    addons:          (b.addons||[]).map(a => a.name).join(', ') || 'None',
    supplies:        b.supplies === 'cleaner' ? `Cleaner brings supplies (+£${b.suppliesFee || 8})` : 'Customer provides supplies',
    property_type:   `${b.propertyType} · ${b.size}`,
    frequency:       b.frequency || 'One-off',
    floor:           clean(b.floor||'—'),
    parking:         clean(b.parking||'—'),
    bathrooms:       b.bathrooms ? `${b.bathrooms}` : '—',
    pets:            ['hourly','office_cleaning'].includes(b.package) ? '' : (b.hasPets ? `Yes — ${clean(b.petTypes||'not specified')}` : 'No'),
    signature_touch: b.package === 'standard' ? (b.signatureTouch !== false ? 'Opted in' : `Opted out${b.signatureTouchNotes ? ` — ${clean(b.signatureTouchNotes)}` : ''}`) : '',
    source:          clean(b.source||'—'),
    is_returning:    b.isReturning ? 'Returning customer' : 'New customer',
    media_consent:   b.mediaConsent ? 'Yes - consented to photos and videos on social media' : 'No consent given',
    media_consent_row: b.mediaConsentDiscount
      ? `<tr><td style="padding: 4px 16px 4px 0; color: rgba(200,184,154,0.6);">Photo consent discount</td><td style="padding: 4px 0; color: #22c55e; text-align: right; font-weight: bold;">-£${parseFloat(b.mediaConsentDiscount).toFixed(2)}</td></tr>`
      : '',
    stripe_deposit_pi:  b.stripeDepositIntentId || '—',
    stripe_customer_id: b.stripeCustomerId || '—',
    booking_channel: b.isPhoneBooking ? '📞 Phone booking' : '🌐 Online booking',
    booking_type:    b.bookingType || 'New Booking',
    recurring_note:  b.bookingType === 'Recurring Booking'
      ? `This is your next scheduled recurring clean. You are saving £${FREQ_SAVINGS[b.frequency] || 0} with your ${b.frequency} discount. No deposit is required — the full amount will be charged automatically once your clean is marked as complete.`
      : '',
    terms_summary: `By completing this booking you agreed to the following key terms:

1. Payment: A 30% deposit was charged at the time of booking. The remaining 70% balance will be charged automatically once your clean is marked as complete by our team.

2. Cancellation: All cancellations must be made by phone call only on 020 8137 0026. Email, text or WhatsApp will not be accepted as valid notice. One-off bookings: full refund if cancelled more than 48 hours before your clean; no refund if cancelled with less than 48 hours notice. Recurring services: free to cancel with 48 hours notice; a 30% charge applies for cancellations with less than 48 hours notice. If our cleaner is refused access at the door, the applicable charge will apply.

3. Satisfaction: Any issues must be reported within 24 hours of your clean. We will arrange a free re-clean where appropriate. Refunds are not provided if a re-clean is offered and declined.

4. Pets: All pets must be secured away from our team for the entire duration of the clean.

5. Equipment: Our cleaners do not bring mops or vacuums. A working mop and vacuum must be available at the property.

6. Cleaner Allocation: We will always aim to send the same cleaner for recurring bookings, but this cannot be guaranteed.

Full Terms & Conditions: https://londoncleaningwizard.com/terms-and-conditions`,
  };
}

// ── 1. Send verification code ─────────────────────────────────
exports.sendVerificationCode = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email address' }); return;
  }
  const db      = admin.firestore();
  const customerDoc = await db.collection('customers').doc(email.toLowerCase()).get();
  if (!customerDoc.exists) {
    res.status(404).json({ error: 'No account found for this email. Please select "First time booking" instead.' }); return;
  }
  const hourAgo = new Date(Date.now() - 3600000);
  const recent  = await db.collection('verificationCodes')
    .where('email','==',email.toLowerCase()).where('createdAt','>=',hourAgo).get();
  if (recent.size >= 3) {
    res.status(429).json({ error: 'Too many requests. Please wait before requesting another code.' }); return;
  }
  const code      = crypto.randomInt(100000, 999999).toString();
  const hashed    = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 600000);
  const docId     = `${email.toLowerCase()}_${Date.now()}`;
  await db.collection('verificationCodes').doc(docId).set({
    email: email.toLowerCase(), code: hashed, expiresAt,
    createdAt: new Date(), used: false, attempts: 0,
  });
  try {
    await sendEmail(process.env.EMAILJS_VERIFY_TEMPLATE,
      { to_email:email, to_name:email.split('@')[0], code, expires:'10 minutes' },
      EMAILJS_KEY.value());
    res.json({ success:true, expiresAt:expiresAt.toISOString() });
  } catch(e) {
    await db.collection('verificationCodes').doc(docId).delete();
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

// ── 2. Verify code and load customer profile ──────────────────
exports.verifyCode = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { email, code } = req.body;
  if (!email || !code || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error:'Invalid request' }); return;
  }
  const db     = admin.firestore();
  const now    = new Date();
  const hashed = crypto.createHash('sha256').update(code).digest('hex');
  const snap   = await db.collection('verificationCodes')
    .where('email','==',email.toLowerCase())
    .where('used','==',false)
    .where('expiresAt','>',now)
    .orderBy('createdAt','desc').limit(1).get();
  if (snap.empty) {
    res.status(401).json({ error:'Code expired or not found. Please request a new one.' }); return;
  }
  const ref  = snap.docs[0].ref;
  const data = snap.docs[0].data();
  if (data.attempts >= 5) {
    await ref.update({ used:true });
    res.status(429).json({ error:'Too many attempts. Please request a new code.' }); return;
  }
  if (data.code !== hashed) {
    await ref.update({ attempts:data.attempts + 1 });
    const left = 5 - (data.attempts + 1);
    res.status(401).json({ error:`Incorrect code. ${left} attempt${left===1?'':'s'} remaining.` }); return;
  }
  await ref.update({ used:true, usedAt:now });
  const profileDoc = await db.collection('customers').doc(email.toLowerCase()).get();
  res.json({ success:true, profile: profileDoc.exists ? profileDoc.data() : null });
});

// ── 2b. Track step 3 abandonment (before payment intent exists) ──
exports.trackStep3Abandonment = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { email, firstName, packageName, frequency, cleanDate, marketingOptOut } = req.body;
  if (!email) { res.status(400).json({ error: 'Missing email' }); return; }

  const db  = admin.firestore();
  const now = new Date();
  const key = 's3_' + Buffer.from(email.toLowerCase()).toString('base64url');
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const week = Math.ceil((dayOfYear + new Date(now.getFullYear(), 0, 1).getDay()) / 7);

  await db.collection('abandonmentStats').doc(key).set({
    piId: null, createdAt: now,
    date: now.toISOString().slice(0, 10),
    week, month: now.getMonth() + 1, year: now.getFullYear(),
    step: 3,
    packageName: packageName || '',
    depositAmount: 0, totalAmount: 0,
    frequency: frequency || 'one-off',
    email: email.toLowerCase(),
    marketingOptOut: marketingOptOut === true,
    emailSent: false, emailSentAt: null,
    converted: false, convertedAt: null,
  });

  // Only queue for recovery email if they opted in
  if (marketingOptOut !== true) {
    await db.collection('pendingBookings').doc(key).set({
      email: email.toLowerCase(), firstName: firstName || '',
      packageName: packageName || '', cleanDate: cleanDate || '',
      frequency: frequency || 'one-off',
      createdAt: now, abandonedEmailSent: false, marketingOptOut: false, step: 3,
    });
  }

  res.json({ success: true });
});

// ── 3. Create Stripe PaymentIntent ────────────────────────────
exports.createPaymentIntent = onRequest({ secrets:[STRIPE_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { amount, bookingData } = req.body;
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000000) {
    res.status(400).json({ error:'Invalid amount' }); return;
  }
  const stripe   = new Stripe(STRIPE_KEY.value());
  const customer = await stripe.customers.create();
  const intent   = await stripe.paymentIntents.create({
    amount, currency: 'gbp',
    customer: customer.id,
    setup_future_usage: 'off_session',
    metadata: { bookingRef: 'pending' },
  });

  // Save booking data so the webhook can create the booking if the browser closes after payment
  if (bookingData) {
    try {
      const db  = admin.firestore();
      const now = new Date();
      await db.collection('pendingBookings').doc(intent.id).set({
        ...bookingData,
        stripeCustomerId: customer.id,
        createdAt: now,
      });
      // Stats record — email kept for 30 days for conversion attribution, then stripped
      const d = now;
      const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
      const week = Math.ceil((dayOfYear + new Date(d.getFullYear(), 0, 1).getDay()) / 7);
      await db.collection('abandonmentStats').doc(intent.id).set({
        piId: intent.id, createdAt: now,
        date: now.toISOString().slice(0, 10),
        week, month: now.getMonth() + 1, year: now.getFullYear(),
        step: 4,
        packageName: bookingData.packageName || '',
        depositAmount: amount / 100,
        totalAmount: (Number(bookingData.total) > 0 ? Number(bookingData.total) : Math.round((amount / 100) / 0.3 * 100) / 100),
        frequency: bookingData.frequency || 'one-off',
        email: (bookingData.email || '').toLowerCase(),
        marketingOptOut: bookingData.marketingOptOut === true,
        emailSent: false, emailSentAt: null,
        converted: false, convertedAt: null,
      });

      // Promote from step 3 — customer reached payment, delete partial records
      if (bookingData.email) {
        const s3Key = 's3_' + Buffer.from(bookingData.email.toLowerCase()).toString('base64url');
        await Promise.all([
          db.collection('abandonmentStats').doc(s3Key).delete().catch(() => {}),
          db.collection('pendingBookings').doc(s3Key).delete().catch(() => {}),
        ]);
      }
    } catch (e) {
      console.error('Failed to save pendingBooking:', e.message);
      // Cancel the PI so the customer is never charged without a booking fallback
      await stripe.paymentIntents.cancel(intent.id).catch(() => {});
      res.status(500).json({ error: 'Could not initialise booking. Please try again.' });
      return;
    }
  }

  res.json({ clientSecret: intent.client_secret, customerId: customer.id, piId: intent.id });
});

// ── 4. Save booking after payment succeeds ────────────────────
// Option B: writes booking events to GOOGLE_CALENDAR_ID (bookings calendar)
// Availability is checked against GOOGLE_AVAILABILITY_CALENDAR_ID (separate)
exports.saveBooking = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const db  = admin.firestore();
  const d   = req.body;

  // Final availability check — reject if the date is blocked on the availability calendar
  if (d.cleanDate) {
    try {
      const date    = new Date(d.cleanDate + 'T12:00:00');
      const y       = date.getFullYear();
      const m       = date.getMonth(); // 0-based
      const timeMin = new Date(y, m, 1).toISOString();
      const timeMax = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
      const calendar = await getCalendarClient('https://www.googleapis.com/auth/calendar.readonly');
      const { data } = await calendar.events.list({
        calendarId: process.env.GOOGLE_AVAILABILITY_CALENDAR_ID,
        timeMin, timeMax, singleEvents: true,
      });
      const blocked = (data.items || []).map(e =>
        e.start.date
          ? e.start.date
          : new Date(e.start.dateTime).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
      );
      if (blocked.includes(d.cleanDate)) {
        res.status(409).json({ error: 'This date is no longer available. Please go back and choose another day.' });
        return;
      }
    } catch (e) {
      console.error('Availability check failed in saveBooking:', e.message);
      // Do not block the booking if the calendar check itself errors
    }
  }

  const ref        = `LCW-${Date.now().toString().slice(-6)}`;
  const id         = db.collection('bookings').doc().id;
  const recurringId = (d.frequency && d.frequency !== 'one-off') ? 'RS' + Date.now().toString(36).toUpperCase() : null;

  // If this is a real Stripe payment, claim the pendingBookings doc atomically.
  // This ensures only one path (saveBooking or webhook) creates the booking.
  let claimed = true;
  const isRealStripePI = d.stripeDepositIntentId?.startsWith('pi_');

  await db.runTransaction(async tx => {
    // ── ALL reads first (Firestore requires reads before writes) ──
    const pendingRef  = isRealStripePI ? db.collection('pendingBookings').doc(d.stripeDepositIntentId) : null;
    const pendingSnap = pendingRef ? await tx.get(pendingRef) : null;

    if (isRealStripePI && !pendingSnap.exists) {
      // Webhook already claimed and processed this — return early
      claimed = false;
      return;
    }

    const bRef  = db.collection('bookings').doc(id);
    const cRef  = db.collection('customers').doc(d.email.toLowerCase());
    const cSnap = await tx.get(cRef);
    const count = cSnap.exists ? (cSnap.data().bookingCount || 0) : 0;

    // ── ALL writes after reads ──
    if (isRealStripePI) tx.delete(pendingRef);
    tx.set(bRef, {
      bookingRef: ref, bookingId: id,
      email: d.email.toLowerCase(), firstName: clean(d.firstName), lastName: clean(d.lastName),
      phone: clean(d.phone), addr1: clean(d.addr1), postcode: clean(d.postcode).toUpperCase(),
      propertyType: d.propertyType, floor: clean(d.floor||''), parking: clean(d.parking||''),
      bathrooms: d.bathrooms || null,
      airbnbListing: clean(d.airbnbListing||''),
      keys: clean(d.keys||''), notes: clean(d.notes||''),
      hasPets: d.hasPets || false, petTypes: clean(d.petTypes||''),
      signatureTouch: d.signatureTouch !== false, signatureTouchNotes: clean(d.signatureTouchNotes||''),
      package: d.package, packageName: d.packageName, size: d.size,
      frequency: d.frequency || 'one-off', addons: d.addons || [], isAirbnb: d.isAirbnb || false,
      supplies: d.supplies || 'customer', suppliesFee: d.suppliesFee || null,
      cleanDate: d.cleanDate, cleanTime: d.cleanTime,
      cleanDateUTC: toUTCISO(d.cleanDate, d.cleanTime),
      total: Math.round(parseFloat(d.total || 0) * 100) / 100, deposit: Math.round(parseFloat(d.deposit || 0) * 100) / 100, remaining: Math.round(parseFloat(d.remaining || 0) * 100) / 100,
      ...(d.launchDiscount ? { launchDiscount: d.launchDiscount, originalTotal: d.originalTotal } : {}),
      ...(d.mediaConsentDiscount ? { mediaConsentDiscount: d.mediaConsentDiscount } : {}),
      stripeDepositIntentId: d.stripeDepositIntentId,
      stripeCustomerId: d.stripeCustomerId || '',
      status: d.stripeDepositIntentId === 'manual' ? 'pending_deposit' : 'deposit_paid',
      isPhoneBooking: d.isPhoneBooking || false,
      source: clean(d.source||''), createdAt: new Date(),
      marketingOptOut: d.marketingOptOut === true,
      doNotContact:    d.marketingOptOut === true,
      mediaConsent:    d.mediaConsent === true,
    });
    tx.set(cRef, {
      firstName: clean(d.firstName), lastName: clean(d.lastName), phone: clean(d.phone),
      addr1: clean(d.addr1), postcode: clean(d.postcode).toUpperCase(),
      floor: clean(d.floor||''), parking: clean(d.parking||''),
      bathrooms: d.bathrooms || null,
      airbnbListing: clean(d.airbnbListing||''),
      keys: clean(d.keys||''), notes: clean(d.notes||''),
      hasPets: d.hasPets || false, petTypes: clean(d.petTypes||''),
      signatureTouch: d.signatureTouch !== false, signatureTouchNotes: clean(d.signatureTouchNotes||''),
      bookingCount: count + 1, lastBookingId: id, lastBookingRef: ref,
      lastPackage: d.package, lastPackageName: d.packageName, lastSize: d.size,
      lastPrice: d.total, lastDate: d.cleanDate, lastCleaner: '',
      source: clean(d.source||''),
      mediaConsent: d.mediaConsent === true,
      updatedAt: new Date(),
      ...(cSnap.exists ? {} : { firstBookingDate: new Date() }),
      ...(d.stripeCustomerId ? { stripeCustomerId: d.stripeCustomerId } : {}),
      ...(d.frequency && d.frequency !== 'one-off' ? {
        recurringActive:      true,
        recurringId:          recurringId,
        recurringFrequency:   d.frequency,
        recurringDay:         new Date(d.cleanDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }),
        recurringTime:        d.cleanTime,
        recurringPackage:     d.package,
        recurringPackageName: d.packageName,
        recurringSize:        d.size,
        recurringAddons:      d.addons || [],
        recurringPropertyType: d.propertyType,
        recurringTotal:       d.recurringTotal || d.total,
        recurringDeposit:     d.deposit,
        recurringRemaining:   d.remaining,
        recurringSource:      clean(d.source||''),
      } : {}),
    }, { merge: true });
  });

  // Mark abandonment stat as converted — try exact PI match first, then fall back to email match
  if (d.stripeDepositIntentId && d.stripeDepositIntentId !== 'manual') {
    db.collection('abandonmentStats').doc(d.stripeDepositIntentId).update({ converted: true, convertedAt: new Date() }).catch(() => {});
  }
  if (d.email) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    db.collection('abandonmentStats')
      .where('email', '==', d.email.toLowerCase())
      .where('converted', '==', false)
      .where('createdAt', '>', thirtyDaysAgo)
      .get()
      .then(snap => {
        snap.forEach(doc => doc.ref.update({ converted: true, convertedAt: new Date() }));
      })
      .catch(() => {});
  }

  // If webhook already handled this payment, look up and return that booking ref
  if (!claimed) {
    const existingSnap = await db.collection('bookings')
      .where('stripeDepositIntentId', '==', d.stripeDepositIntentId)
      .limit(1).get();
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      return res.json({ success: true, bookingRef: existing.bookingRef, bookingId: existing.bookingId });
    }
    return res.status(409).json({ error: 'Booking already processed. Please check your email or call us.' });
  }

  // Write to your bookings calendar — for your reference only
  // Does NOT affect availability checks
  try {
    const calendar  = await getCalendarClient();
    const slotStart = toUTCISO(d.cleanDate, d.cleanTime);
    const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
    const calEvent = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: {
        summary:     `${d.packageName} — ${d.firstName} ${d.lastName}`,
        description: [
            `Ref: ${ref}`,
            `Customer: ${d.firstName} ${d.lastName}`,
            `Email: ${d.email}`,
            `Phone: ${d.phone}`,
            `Address: ${d.addr1}, ${d.postcode}`,
            `Property: ${d.propertyType} · ${d.size}`,
            `Frequency: ${d.frequency || 'One-off'}`,
            `Floor / Lift: ${d.floor || '—'}`,
            `Parking: ${d.parking || '—'}`,
            `Bathrooms: ${d.bathrooms || '—'}`,
            `Keys: ${d.keys || 'N/A'}`,
            `Add-ons: ${(d.addons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Supplies: ${d.supplies === 'cleaner' ? `Cleaner brings (+£${d.suppliesFee || 8})` : 'Customer provides'}`,
            ...(['hourly','office_cleaning'].includes(d.package) ? [] : [`Pets: ${d.hasPets ? `Yes — ${d.petTypes || 'not specified'}` : 'No'}`]),
            ...(d.package === 'standard' ? [`Signature Touch: ${d.signatureTouch !== false ? 'Opted in' : `Opted out${d.signatureTouchNotes ? ` — ${d.signatureTouchNotes}` : ''}`}`] : []),
            `Cleaner: ${d.assignedStaff || 'Unassigned'}`,
            `Notes: ${d.notes || 'None'}`,
            `Media consent: ${d.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
            `Marketing opt-in: ${d.marketingOptOut ? 'Opted out' : 'Opted in'}`,
            `Total: £${parseFloat(d.total||0).toFixed(2)} | Deposit: £${parseFloat(d.deposit||0).toFixed(2)} | Remaining: £${parseFloat(d.remaining||0).toFixed(2)}`,
          ].join('\n'),
        start: { dateTime: slotStart, timeZone: 'Europe/London' },
        end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
        colorId: calColorId('pending_deposit', d.frequency),
      },
    });
    // Save event ID so we can update it later if the booking is edited
    await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
  } catch (e) {
    console.error('Failed to create calendar event:', e.message);
    // Flag so this never becomes a silent orphan with no calendarEventId
    await db.collection('bookings').doc(id).update({ calendarSyncFailed: true }).catch(() => {});
  }

  // Pre-create all recurring follow-up bookings within the 35-day window
  // 35 days (not 28) so monthly bookings always get at least 1 follow-up pre-created
  if (d.frequency && d.frequency !== 'one-off') {
    try {
      // Discount applies from 2nd clean onwards — use recurringTotal (full pre-discount price) if available
      const freqSave     = FREQ_SAVINGS[d.frequency] || 0;
      const discountedTotal = Math.max(0, (d.recurringTotal || d.total) - freqSave);
      console.log(`[pre-create] Starting: freq=${d.frequency} email=${d.email} firstClean=${d.cleanDate} cutoff will be +35d discountedTotal=${discountedTotal}`);

      const LEAD   = 35;
      const firstClean = new Date(d.cleanDate + 'T12:00:00');
      const cutoff = new Date(firstClean); cutoff.setDate(cutoff.getDate() + LEAD);

      let lastDate    = new Date(d.cleanDate + 'T12:00:00');
      let lastDateStr = d.cleanDate;

      while (true) {
        const nextDate = new Date(lastDate);
        if (d.frequency === 'weekly')           nextDate.setDate(nextDate.getDate() + 7);
        else if (d.frequency === 'fortnightly') nextDate.setDate(nextDate.getDate() + 14);
        else if (d.frequency === 'monthly') {
          const originalDay = lastDate.getDate();
          nextDate.setMonth(nextDate.getMonth() + 1);
          const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(originalDay, daysInMonth));
        }
        if (nextDate > cutoff) break;

        const nextStr   = nextDate.toISOString().slice(0, 10);
        console.log(`[pre-create] Checking ${nextStr} for ${d.email}`);
        const existSnap = await db.collection('bookings')
          .where('email', '==', d.email.toLowerCase())
          .where('cleanDate', '==', nextStr).get();
        console.log(`[pre-create] existSnap empty=${existSnap.empty} count=${existSnap.size}`);

        if (existSnap.empty) {
          const rRef = `LCW-${Date.now().toString().slice(-6)}`;
          const rId  = db.collection('bookings').doc().id;
          const recurringData = {
            bookingRef: rRef, bookingId: rId,
            email: d.email.toLowerCase(),
            firstName: clean(d.firstName), lastName: clean(d.lastName),
            phone: clean(d.phone), addr1: clean(d.addr1), postcode: clean(d.postcode).toUpperCase(),
            propertyType: d.propertyType,
            floor: clean(d.floor||''), parking: clean(d.parking||''),
            keys: clean(d.keys||''), notes: clean(d.notes||''),
            hasPets: d.hasPets || false, petTypes: clean(d.petTypes||''),
            signatureTouch: d.signatureTouch !== false,
            signatureTouchNotes: clean(d.signatureTouchNotes||''),
            package: d.package, packageName: d.packageName,
            size: d.size, frequency: d.frequency,
            addons: d.addons || [], isAirbnb: false,
            cleanDate: nextStr, cleanTime: d.cleanTime,
            cleanDateUTC: toUTCISO(nextStr, d.cleanTime),
            total: discountedTotal, deposit: 0, remaining: discountedTotal,
            stripeDepositIntentId: 'auto-recurring',
            stripeCustomerId: d.stripeCustomerId || '',
            status: 'scheduled', isPhoneBooking: false,
            isAutoRecurring: true, source: clean(d.source||''),
            mediaConsent: d.mediaConsent === true,
            recurringId: recurringId || '',
            createdAt: new Date(),
          };
          await db.collection('bookings').doc(rId).set(recurringData);
          console.log(`[pre-create] Created booking for ${nextStr}`);
          try {
            const cal      = await getCalendarClient();
            const slotStart = toUTCISO(nextStr, d.cleanTime);
            const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
            const calEvent  = await cal.events.insert({
              calendarId: process.env.GOOGLE_CALENDAR_ID,
              resource: {
                summary: `${d.packageName} — ${d.firstName} ${d.lastName} (recurring)`,
                description: [
                  `Ref: ${rRef}`,
                  `Customer: ${d.firstName} ${d.lastName}`,
                  `Email: ${d.email}`, `Phone: ${d.phone}`,
                  `Address: ${d.addr1}, ${d.postcode}`,
                  `Property: ${d.propertyType} · ${d.size}`,
                  `Frequency: ${d.frequency}`,
                  `Floor / Lift: ${d.floor || '—'}`, `Parking: ${d.parking || '—'}`, `Bathrooms: ${d.bathrooms || '—'}`,
                  `Keys: ${d.keys || 'N/A'}`,
                  `Add-ons: ${(d.addons||[]).map(a => a.name).join(', ') || 'None'}`,
                  `Supplies: ${d.supplies === 'cleaner' ? `Cleaner brings (+£${d.suppliesFee || 8})` : 'Customer provides'}`,
                  ...(['hourly','office_cleaning'].includes(d.package) ? [] : [`Pets: ${d.hasPets ? `Yes — ${d.petTypes || 'not specified'}` : 'No'}`]),
                  ...(d.package === 'standard' ? [`Signature Touch: ${d.signatureTouch !== false ? 'Opted in' : `Opted out${d.signatureTouchNotes ? ` — ${d.signatureTouchNotes}` : ''}`}`] : []),
                  `Cleaner: ${d.assignedStaff || 'Unassigned'}`,
                  `Notes: ${d.notes || 'None'}`,
                  `Media consent: ${d.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
                  `Total: £${parseFloat(d.total||0).toFixed(2)} | No deposit — full amount charged on completion`,
                  `⚙️ Auto-created at booking time (pre-scheduled)`,
                ].join('\n'),
                start: { dateTime: slotStart, timeZone: 'Europe/London' },
                end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
                colorId: '5',
              },
            });
            await db.collection('bookings').doc(rId).update({ calendarEventId: calEvent.data.id });
          } catch (calErr) {
            console.error('Calendar event failed for pre-scheduled recurring:', calErr.message);
            await db.collection('bookings').doc(rId).update({ calendarSyncFailed: true }).catch(() => {});
          }
          lastDateStr = nextStr;
        }
        lastDate = nextDate;
      }

      // Update customer lastDate to furthest pre-created booking so scheduler picks up correctly
      if (lastDateStr !== d.cleanDate) {
        await db.collection('customers').doc(d.email.toLowerCase()).update({
          lastDate: lastDateStr, updatedAt: new Date(),
        });
      }
    } catch (recurErr) {
      console.error('[pre-create] FAILED:', recurErr.message, recurErr.code);
    }
  }

  // Phone bookings: skip emails until deposit is actually paid
  if (!d.isPhoneBooking) {
    const eData = buildBookingEmailData({ ...d, bookingRef: ref });
    try {
      await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
        { ...eData, to_name: d.firstName, to_email: d.email }, EMAILJS_KEY.value());
      await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
        { ...eData, to_email: 'bookings@londoncleaningwizard.com',
          customer_name: `${d.firstName} ${d.lastName}`,
          customer_phone: d.phone, customer_email: d.email },
        EMAILJS_KEY.value());
    } catch (emailErr) {
      console.error('saveBooking: email send failed:', emailErr.message);
      db.collection('emailFailures').add({
        fn: 'saveBooking', error: emailErr.message,
        bookingRef: ref || null, customer: d.email || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false,
      }).catch(() => {});
    }
  }

  res.json({ success: true, bookingRef: ref, bookingId: id });
});

// ── 5. Get available slots ────────────────────────────────────
// Reads ONLY from your availability calendar — blocks you add manually.
// Customer bookings never appear here so multiple bookings at same time is fine.
exports.getAvailableSlots = onRequest(async (req, res) => {
  if (!guard(req, res, 'GET')) return;
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error:'Invalid date' }); return;
  }
  const ALL = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM','9:00 PM'];
  try {
    const calendar = await getCalendarClient('https://www.googleapis.com/auth/calendar.readonly');
    const { data } = await calendar.events.list({
      calendarId:   process.env.GOOGLE_AVAILABILITY_CALENDAR_ID,
      timeMin:      toUTCISO(date, '8:00 AM'),
      timeMax:      toUTCISO(date, '5:00 PM'),
      singleEvents: true,
    });
    const blocked = (data.items||[]).map(e =>
      new Date(e.start.dateTime).toLocaleTimeString('en-GB',
        { timeZone:'Europe/London', hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()
    );
    res.json({ slots: ALL.map(t => ({ time:t, booked:blocked.includes(t) })) });
  } catch(e) {
    res.status(500).json({ error:e.message });
  }
});

// ── 6. Complete job and charge remaining balance ──────────────
// Called from admin dashboard when you press Mark as Complete.
exports.completeJob = onRequest({ secrets:[STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }

  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();

  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();

  if (b.status === 'fully_paid' || b.status === 'completed') {
    res.status(400).json({ error: 'This booking has already been completed.' }); return;
  }

  // ── Contract visit — mark completed, no Stripe charge ────────
  if (b.contractId) {
    await snap.ref.update({ status: 'completed', completedAt: new Date() });
    res.json({ success: true, status: 'completed' }); return;
  }

  // ── Manual payment — skip Stripe, mark complete ──────────────
  if (b.stripeDepositIntentId === 'manual') {
    if (!['pending_deposit', 'deposit_paid', 'payment_failed'].includes(b.status)) {
      res.status(400).json({ error: 'This booking cannot be completed in its current status.' }); return;
    }
    await snap.ref.update({ status: 'fully_paid', paidAt: new Date() });
    if (b.calendarEventId) { try { const cal = await getCalendarClient(); await cal.events.patch({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId, resource: { colorId: calColorId('fully_paid', b.frequency) } }); } catch {} }
    await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});
    const receiptData = {
      booking_ref:         b.bookingRef,  package_name:   b.packageName,
      date:                b.cleanDate.split('-').reverse().join('/'),
      date_subject:        b.cleanDate.split('-').reverse().join('.'),
      address:             `${b.addr1}, ${b.postcode}`,
      total:               `£${parseFloat(b.total).toFixed(2)}`, deposit_paid: `£${parseFloat(b.deposit).toFixed(2)}`,
      amount_charged:      `£${parseFloat(b.remaining).toFixed(2)}`,
      stripe_deposit_pi:   'Manual payment', stripe_remaining_pi: 'Manual payment', stripe_customer_id: '—',
      booking_type:        'One-off Clean',
      payment_note:        '',
    };
    await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE,
      { ...receiptData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE,
      { ...receiptData, to_name: 'Admin', to_email: 'bookings@londoncleaningwizard.com' }, EMAILJS_KEY.value()).catch(() => {});
    res.json({ success: true, status: 'fully_paid' }); return;
  }

  // ── Auto-recurring — charge full amount via saved card ────────
  if (b.stripeDepositIntentId === 'auto-recurring') {
    if (b.status !== 'scheduled' && b.status !== 'payment_failed') {
      res.status(400).json({ error: 'This booking cannot be completed in its current status.' }); return;
    }
    if (!b.stripeCustomerId) {
      res.status(400).json({ error: 'No saved payment method for this customer. Please charge manually in Stripe.' }); return;
    }
    try {
      const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
      const pm  = pms.data[0];
      if (!pm) {
        res.status(400).json({ error: 'No saved card found for this customer. Please charge manually in Stripe.' }); return;
      }
      const intent = await stripe.paymentIntents.create({
        amount:         Math.round(b.total * 100),
        currency:       'gbp',
        customer:       b.stripeCustomerId,
        payment_method: pm.id,
        confirm:        true,
        off_session:    true,
        metadata:       { bookingRef: b.bookingRef, type: 'recurring_full_payment' },
      });
      if (intent.status !== 'succeeded') {
        const errMsg = `Unexpected intent status: ${intent.status}`;
        await snap.ref.update({ status: 'payment_failed', paymentError: errMsg });
        await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
          to_email: 'bookings@londoncleaningwizard.com', booking_ref: b.bookingRef,
          customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email,
          customer_phone: b.phone, amount: `£${parseFloat(b.total).toFixed(2)}`,
          date: b.cleanDate.split('-').reverse().join('/'), error_message: errMsg,
        }, EMAILJS_KEY.value()).catch(() => {});
        await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
          to_email: b.email, to_name: b.firstName, booking_ref: b.bookingRef,
          customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email,
          customer_phone: b.phone, amount: `£${parseFloat(b.total).toFixed(2)}`,
          date: b.cleanDate.split('-').reverse().join('/'), error_message: errMsg,
        }, EMAILJS_KEY.value()).catch(() => {});
        res.status(400).json({ error: 'Payment was not completed successfully. Please retry.' }); return;
      }
      await snap.ref.update({ status: 'fully_paid', paidAt: new Date(), stripeRemainingIntentId: intent.id });
      if (b.calendarEventId) { try { const cal = await getCalendarClient(); await cal.events.patch({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId, resource: { colorId: calColorId('fully_paid', b.frequency) } }); } catch {} }
      await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});
      const receiptData = {
        booking_ref:         b.bookingRef,  package_name:        b.packageName,
        date:                b.cleanDate.split('-').reverse().join('/'),
        date_subject:        b.cleanDate.split('-').reverse().join('.'),
        address:             `${b.addr1}, ${b.postcode}`,
        total:               `£${parseFloat(b.total).toFixed(2)}`, deposit_paid: '£0 (recurring — no deposit)',
        amount_charged:      `£${parseFloat(b.total).toFixed(2)}`,
        stripe_deposit_pi:   '—',          stripe_remaining_pi: intent.id,
        stripe_customer_id:  b.stripeCustomerId,
        booking_type:        'Recurring Clean',
        payment_note:        '',
      };
      await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE,
        { ...receiptData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE,
        { ...receiptData, to_name: 'Admin', to_email: 'bookings@londoncleaningwizard.com' }, EMAILJS_KEY.value()).catch(() => {});
      res.json({ success: true, status: 'fully_paid' }); return;
    } catch (e) {
      await snap.ref.update({ status: 'payment_failed', paymentError: e.message });
      await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
        to_email: 'bookings@londoncleaningwizard.com', booking_ref: b.bookingRef,
        customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email,
        customer_phone: b.phone, amount: `£${parseFloat(b.total).toFixed(2)}`,
        date: b.cleanDate.split('-').reverse().join('/'), error_message: e.message,
      }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
        to_email: b.email, to_name: b.firstName, booking_ref: b.bookingRef,
        customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email,
        customer_phone: b.phone, amount: `£${parseFloat(b.total).toFixed(2)}`,
        date: b.cleanDate.split('-').reverse().join('/'), error_message: e.message,
      }, EMAILJS_KEY.value()).catch(() => {});
      res.status(500).json({ error: e.message }); return;
    }
  }

  if (b.status !== 'deposit_paid' && b.status !== 'payment_failed') {
    res.status(400).json({ error: 'This booking cannot be completed in its current status.' }); return;
  }

  try {
    const depositIntent   = await stripe.paymentIntents.retrieve(b.stripeDepositIntentId);
    const paymentMethodId = depositIntent.payment_method;
    if (!paymentMethodId) {
      res.status(400).json({ error: 'No saved payment method found for this booking. Please charge manually in Stripe.' }); return;
    }

    let customerId = b.stripeCustomerId || depositIntent.customer;
    if (!customerId) {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      customerId = pm.customer;
    }
    if (!customerId) {
      const customer = await stripe.customers.create();
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      } catch (attachErr) {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        customerId = pm.customer;
      }
      if (!customerId) customerId = customer.id;
    }
    await snap.ref.update({ stripeCustomerId: customerId });

    const intent = await stripe.paymentIntents.create({
      amount:         Math.round(b.remaining * 100),
      currency:       'gbp',
      customer:       customerId,
      payment_method: paymentMethodId,
      confirm:        true,
      off_session:    true,
      metadata: { bookingRef: b.bookingRef, type: 'remaining_balance' },
    });

    if (intent.status !== 'succeeded') {
      const errMsg = `Unexpected intent status: ${intent.status}`;
      await snap.ref.update({ status: 'payment_failed', paymentError: errMsg });
      await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
        to_email:       'bookings@londoncleaningwizard.com',
        booking_ref:    b.bookingRef,
        customer_name:  `${b.firstName} ${b.lastName}`,
        customer_email: b.email,
        customer_phone: b.phone,
        amount:         `£${parseFloat(b.remaining).toFixed(2)}`,
        date:           b.cleanDate.split('-').reverse().join('/'),
        error_message:  errMsg,
      }, EMAILJS_KEY.value());
      await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
        to_email:       b.email, to_name: b.firstName,
        booking_ref:    b.bookingRef,
        customer_name:  `${b.firstName} ${b.lastName}`,
        customer_email: b.email,
        customer_phone: b.phone,
        amount:         `£${parseFloat(b.remaining).toFixed(2)}`,
        date:           b.cleanDate.split('-').reverse().join('/'),
        error_message:  errMsg,
      }, EMAILJS_KEY.value()).catch(() => {});
      res.status(400).json({ error: 'Payment was not completed successfully. Please retry.' }); return;
    }

    await snap.ref.update({
      status: 'fully_paid',
      paidAt: new Date(),
      stripeRemainingIntentId: intent.id,
    });
    if (b.calendarEventId) { try { const cal = await getCalendarClient(); await cal.events.patch({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId, resource: { colorId: calColorId('fully_paid', b.frequency) } }); } catch {} }
    await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});

    const receiptData = {
      booking_ref:          b.bookingRef,
      package_name:         b.packageName,
      date:                 b.cleanDate.split('-').reverse().join('/'),
      date_subject:         b.cleanDate.split('-').reverse().join('.'),
      address:              `${b.addr1}, ${b.postcode}`,
      total:                `£${parseFloat(b.total).toFixed(2)}`,
      deposit_paid:         `£${parseFloat(b.deposit).toFixed(2)}`,
      amount_charged:       `£${parseFloat(b.remaining).toFixed(2)}`,
      stripe_deposit_pi:    b.stripeDepositIntentId || '—',
      stripe_remaining_pi:  intent.id,
      stripe_customer_id:   customerId || '—',
      booking_type:         ['weekly','fortnightly','monthly'].includes(b.frequency) ? 'Recurring Clean' : 'Clean',
      payment_note:         '',
    };
    await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE, {
      ...receiptData, to_name: b.firstName, to_email: b.email,
    }, EMAILJS_KEY.value());
    await sendEmail(process.env.EMAILJS_RECEIPT_TEMPLATE, {
      ...receiptData, to_name: 'Admin', to_email: 'bookings@londoncleaningwizard.com',
    }, EMAILJS_KEY.value());

    res.json({ success: true, status: 'fully_paid' });
  } catch(e) {
    await snap.ref.update({ status: 'payment_failed', paymentError: e.message });
    await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
      to_email:       'bookings@londoncleaningwizard.com',
      booking_ref:    b.bookingRef,
      customer_name:  `${b.firstName} ${b.lastName}`,
      customer_email: b.email,
      customer_phone: b.phone,
      amount:         `£${parseFloat(b.remaining).toFixed(2)}`,
      date:           b.cleanDate.split('-').reverse().join('/'),
      error_message:  e.message,
    }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
      to_email:       b.email, to_name: b.firstName,
      booking_ref:    b.bookingRef,
      customer_name:  `${b.firstName} ${b.lastName}`,
      customer_email: b.email,
      customer_phone: b.phone,
      amount:         `£${parseFloat(b.remaining).toFixed(2)}`,
      date:           b.cleanDate.split('-').reverse().join('/'),
      error_message:  e.message,
    }, EMAILJS_KEY.value()).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

// ── Consecutive cancellation check (shared) ───────────────────
// Fetches all auto-recurring bookings for the customer and checks in memory
// whether the booking immediately before OR after the cancelled one is also cancelled.
// Avoids composite Firestore index requirements.
async function checkConsecutiveCancellations(db, b, emailjsKey) {
  try {
    const email = b.email.toLowerCase();

    // If the booking has a recurringId, only look at bookings in the same series
    let allSnap;
    if (b.recurringId) {
      allSnap = await db.collection('bookings').where('recurringId', '==', b.recurringId).get();
    } else {
      allSnap = await db.collection('bookings')
        .where('email', '==', email)
        .where('isAutoRecurring', '==', true)
        .get();
    }

    if (allSnap.empty) return { consecutiveAlert: false };

    const all = allSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, z) => a.cleanDate.localeCompare(z.cleanDate));

    const idx = all.findIndex(bk => bk.id === b.bookingId || bk.bookingRef === b.bookingRef);
    if (idx === -1) return { consecutiveAlert: false };

    const prev = idx > 0 ? all[idx - 1] : null;
    const next = idx < all.length - 1 ? all[idx + 1] : null;

    const prevCancelled = prev?.status?.startsWith('cancelled');
    const nextCancelled = next?.status?.startsWith('cancelled');

    if (!prevCancelled && !nextCancelled) {
      await db.collection('customers').doc(email).update({ consecutiveCancellations: 1, updatedAt: new Date() }).catch(() => {});
      return { consecutiveAlert: false };
    }

    // Two in a row — stop the series
    await db.collection('customers').doc(email).update({
      recurringActive: false, consecutiveCancellations: 2, updatedAt: new Date(),
    });

    // Cancel only bookings AFTER the later of the two consecutive cancelled dates
    // e.g. if 04/05 and 11/05 are cancelled, cutoff = 11/05 → only cancel 18/05 onwards
    let cutoffDate = b.cleanDate;
    if (nextCancelled && next.cleanDate > cutoffDate) cutoffDate = next.cleanDate;

    const allSchedSnap = await db.collection('bookings')
      .where('email', '==', email)
      .where('status', '==', 'scheduled')
      .get();
    const futureDocs = allSchedSnap.docs.filter(d => d.data().cleanDate > cutoffDate);
    const remainingSnap = { docs: futureDocs, size: futureDocs.length };

    const batch = db.batch();
    for (const fdoc of remainingSnap.docs) {
      batch.update(fdoc.ref, { status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: 'Recurring cancelled — 2 consecutive cancellations' });
      const fd = fdoc.data();
      if (fd.calendarEventId) {
        try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: fd.calendarEventId }); } catch {}
      }
    }
    await batch.commit();

    // One summary email to customer — they already got an email for the booking they just cancelled,
    // this just lets them know the series is now ended and remaining bookings are gone
    if (emailjsKey && remainingSnap.size > 0) {
      await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, {
        to_name:        b.firstName,
        to_email:       email,
        booking_ref:    'Recurring Cancelled',
        package_name:   b.packageName,
        date:           '—',
        time:           '—',
        address:        `${b.addr1}, ${b.postcode}`,
        refund_amount:  'No charge',
        refund_message: 'As two consecutive cleans have been cancelled, your recurring series has now ended and any remaining upcoming bookings have been removed. Please get in touch if you would like to rebook.',
      }, emailjsKey).catch(() => {});
    }

    return { consecutiveAlert: true };
  } catch (e) {
    console.error('Consecutive cancellation check failed:', e.message);
    return { consecutiveAlert: false };
  }
}

// ── 7. Cancel booking and refund ──────────────────────────────
exports.cancelBooking = onRequest({ secrets:[STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, reason } = req.body;
  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error:'Booking not found' }); return; }
  const b           = snap.data();
  // Estate Agent jobs are paid in full upfront (status fully_paid) BEFORE the visit, so they can
  // still be cancelled — but with NO refund (non-refundable per our terms); the payment is retained.
  const estateNoRefundCancel = b.isEstateAgent && b.status === 'fully_paid';
  if (!estateNoRefundCancel && ['fully_paid', 'cancelled_full_refund', 'cancelled_partial_refund', 'cancelled_no_refund'].includes(b.status)) {
    res.status(400).json({ error: 'This booking cannot be cancelled in its current status.' }); return;
  }
  const cleanUTC   = b.cleanDateUTC || (b.cleanDate && b.cleanTime ? new Date(`${b.cleanDate}T${b.cleanTime}:00`).toISOString() : null);
  const hoursUntil = cleanUTC ? (new Date(cleanUTC) - new Date()) / 3600000 : Infinity;

  // ── Estate Agent (paid in full) — cancel with NO refund, retain revenue, GREY the calendar ──
  if (estateNoRefundCancel) {
    const retained = parseFloat(b.total || 0);
    await snap.ref.update({ status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: clean(reason||''), refundAmount: 0, retainedAmount: retained });
    // Grey out (NOT delete) the calendar event so the cancelled visit stays visible as cancelled
    if (b.calendarEventId) {
      try {
        const cal = await getCalendarClient();
        const who = b.bizName || `${b.firstName||''} ${b.lastName||''}`.trim();
        const title = `CANCELLED — ${b.cleanType || b.packageName || 'Estate Agent Clean'}${who ? ' — ' + who : ''}`;
        await cal.events.patch({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId, resource: { colorId: '8', summary: title } });
      } catch (e) { console.error('Estate cancel calendar grey-out failed:', e.message); }
    }
    const name = b.contactName || b.firstName || b.bizName || '';
    const cancelData = {
      booking_ref:  b.bookingRef,
      package_name: b.cleanType || b.packageName || 'Estate Agent Clean',
      date:         b.cleanDate ? b.cleanDate.split('-').reverse().join('/') : '',
      time:         b.cleanTime || '',
      address:      `${b.addr1 || ''}${b.postcode ? ', ' + b.postcode : ''}`,
      refund_amount:  'No refund',
      refund_message: 'This booking has been cancelled. As set out in our terms, payment for estate agent bookings is non-refundable once booked, so no refund applies.',
    };
    await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: name, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${name} ${b.lastName||''}`.trim(), customer_email: b.email, customer_phone: b.phone || '', notice_given: `Estate Agent — non-refundable, £${retained.toFixed(2)} payment retained` }, EMAILJS_KEY.value()).catch(() => {});
    res.json({ success: true, status: 'cancelled_no_refund', refundAmount: 0, retainedAmount: retained }); return;
  }

  // ── Recurring booking cancellation ──────────────────────────
  if (b.isAutoRecurring) {
    if (hoursUntil < 48 && b.stripeCustomerId) {
      // Late cancellation — charge 30% via saved card
      const feePence = Math.round(b.total * 30);
      const feeAmt   = feePence / 100;
      try {
        const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
        const pm  = pms.data[0];
        if (pm) {
          await stripe.paymentIntents.create({
            amount: feePence, currency: 'gbp',
            customer: b.stripeCustomerId, payment_method: pm.id,
            confirm: true, off_session: true,
            metadata: { bookingRef: b.bookingRef, type: 'late_cancellation_fee' },
          });
        }
      } catch (e) {
        console.error('Late cancellation fee charge failed:', e.message);
      }
      await snap.ref.update({ status: 'cancelled_late_fee', cancelledAt: new Date(), cancellationReason: clean(reason||''), lateFeeCharged: feeAmt });
      if (b.calendarEventId) {
        try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
      }
      const cancelData = { booking_ref: b.bookingRef, package_name: b.packageName, date: b.cleanDate.split('-').reverse().join('/'), time: b.cleanTime, address: `${b.addr1}, ${b.postcode}`, refund_amount: `£${feeAmt.toFixed(2)} late cancellation fee charged`, refund_message: `A late cancellation fee of £${feeAmt.toFixed(2)} has been charged as the cancellation was made less than 48 hours before the scheduled clean.` };
      await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email, customer_phone: b.phone, notice_given: `${hoursUntil.toFixed(1)} hours notice — 30% late fee charged` }, EMAILJS_KEY.value()).catch(() => {});
      res.json({ success: true, status: 'cancelled_late_fee', lateFeeCharged: feeAmt }); return;
    }
    // >= 48hrs notice — cancel free
    await snap.ref.update({ status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: clean(reason||''), refundAmount: 0 });
    if (b.calendarEventId) {
      try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
    }
    const cancelData = { booking_ref: b.bookingRef, package_name: b.packageName, date: b.cleanDate.split('-').reverse().join('/'), time: b.cleanTime, address: `${b.addr1}, ${b.postcode}`, refund_amount: 'No charge', refund_message: 'Your recurring clean has been cancelled. No charge has been applied.' };
    await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email, customer_phone: b.phone, notice_given: `${hoursUntil.toFixed(1)} hours notice — no charge` }, EMAILJS_KEY.value()).catch(() => {});

    res.json({ success: true, status: 'cancelled_no_refund', refundAmount: 0, ...(await checkConsecutiveCancellations(db, b, EMAILJS_KEY.value())) }); return;
  }

  // ── Pending deposit — no payment taken yet ──────────────────
  if (b.status === 'pending_deposit') {
    // Cancel the Stripe payment intent so it doesn't sit as "incomplete" in Stripe dashboard
    if (b.stripeDepositIntentId && b.stripeDepositIntentId !== 'manual') {
      try { await stripe.paymentIntents.cancel(b.stripeDepositIntentId); } catch (e) {
        if (!e.message?.includes('cannot be canceled') && !e.message?.includes('already canceled')) {
          console.error('Failed to cancel Stripe intent on pending_deposit cancel:', e.message);
        }
      }
    }
    await snap.ref.update({ status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: clean(reason||''), refundAmount: 0 });
    if (b.calendarEventId) {
      try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
    }
    if (['weekly','fortnightly','monthly'].includes(b.frequency)) {
      try {
        const email    = b.email.toLowerCase();
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
        const schedSnap = await db.collection('bookings').where('email', '==', email).where('status', '==', 'scheduled').get();
        const futureDocs = schedSnap.docs.filter(d => d.data().cleanDate >= todayStr);
        if (futureDocs.length > 0) {
          const batch = db.batch();
          for (const fdoc of futureDocs) {
            batch.update(fdoc.ref, { status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: 'Recurring series cancelled — first booking cancelled before payment' });
            const fd = fdoc.data();
            if (fd.calendarEventId) {
              try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: fd.calendarEventId }); } catch(e) {}
            }
          }
          await batch.commit();
          await db.collection('customers').doc(email).update({ recurringActive: false, updatedAt: new Date() }).catch(() => {});
        }
      } catch (e) { console.error('Failed to cancel recurring series on pending_deposit cancellation:', e.message); }
    }
    res.json({ success: true, status: 'cancelled_no_refund', refundAmount: 0 }); return;
  }

  // ── Contract cancellation ────────────────────────────────────
  if (b.isContract) {
    const visitsSnap = await db.collection('bookings').where('contractId', '==', snap.id).get();
    const contractVisits = visitsSnap.docs.map(d => ({ ref: d.ref, ...d.data() }));

    const today         = new Date();
    const contractStart = new Date((b.contractStartDate || b.cleanDate) + 'T12:00:00');
    const daysSince     = Math.floor((today - contractStart) / (1000 * 60 * 60 * 24));
    const hasCleans     = contractVisits.some(v => v.status === 'completed');

    const payments       = b.monthlyPayments       || {};
    const paymentIntents = b.monthlyPaymentIntents  || {};
    const paidKeys       = Object.keys(payments)
      .filter(k => k !== 'final_settlement' && payments[k] === 'paid')
      .sort();

    const monthlyBase = parseFloat(b.monthlyBaseValue || 0);

    let totalMonths = 0;
    if (b.contractEndDate) {
      const endDate = new Date(b.contractEndDate + 'T12:00:00');
      totalMonths = (endDate.getFullYear() - contractStart.getFullYear()) * 12 + (endDate.getMonth() - contractStart.getMonth());
    }
    const unpaidMonths = Math.max(0, totalMonths - paidKeys.length);

    const getPeriodEnd = key => {
      const e = new Date(key + 'T12:00:00'); e.setMonth(e.getMonth() + 1); e.setDate(e.getDate() - 1);
      return e.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    };
    const getPeriodBasis = async key => {
      if (paymentIntents[key]) {
        try { const pi = await stripe.paymentIntents.retrieve(paymentIntents[key]); return { basis: pi.amount / 100, hasPI: true }; } catch (e) { console.error(`PI retrieve failed for ${key}:`, e.message); }
      }
      const basis = key === (b.contractStartDate || b.cleanDate) ? parseFloat(b.firstMonthCharge || b.monthlyBaseValue || 0) : monthlyBase;
      return { basis, hasPI: false };
    };

    let refundAmt    = 0;
    let chargeAmt    = 0;
    let tier         = 3;
    let uncompletedCount = 0;
    const summaryLines = [];

    // ── Tier 1: ≤14 days, no cleans → full refund ────────────────
    if (!hasCleans && daysSince <= 14) {
      tier = 1;
      for (const key of paidKeys) {
        const { basis, hasPI } = await getPeriodBasis(key);
        if (basis > 0 && hasPI) {
          try { await stripe.refunds.create({ payment_intent: paymentIntents[key], amount: Math.round(basis * 100), reason: 'requested_by_customer' }); } catch (e) { if (!e.message?.includes('already been refunded')) console.error(`Tier 1 refund failed for ${key}:`, e.message); }
        }
        refundAmt += basis;
      }
      summaryLines.push(`Tier 1: cancelled within 14 days, no cleans. Full refund of £${refundAmt.toFixed(2)}.`);

    // ── Tier 2: >14 days, no cleans → £75 admin fee ──────────────
    } else if (!hasCleans && daysSince > 14) {
      tier = 2;
      let totalPaid = 0;
      for (const key of paidKeys) { const { basis } = await getPeriodBasis(key); totalPaid += basis; }
      const netRefund = Math.max(0, totalPaid - 75);
      refundAmt = netRefund;
      if (netRefund > 0 && paidKeys.length > 0 && paymentIntents[paidKeys[0]]) {
        try { await stripe.refunds.create({ payment_intent: paymentIntents[paidKeys[0]], amount: Math.round(netRefund * 100), reason: 'requested_by_customer' }); } catch (e) { if (!e.message?.includes('already been refunded')) console.error(`Tier 2 refund failed:`, e.message); }
      }
      if (totalPaid === 0 && b.stripeCustomerId) {
        try {
          const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
          const pm = pms.data[0];
          if (pm) {
            await stripe.paymentIntents.create({ amount: 7500, currency: 'gbp', customer: b.stripeCustomerId, payment_method: pm.id, confirm: true, off_session: true, metadata: { contractId: snap.id, type: 'admin_fee_tier2' } });
            chargeAmt = 75;
          }
        } catch (e) { console.error('Tier 2 admin fee charge failed:', e.message); }
      }
      summaryLines.push(`Tier 2: cancelled after 14 days, no cleans. £75 admin fee deducted. Refund: £${refundAmt.toFixed(2)}.`);

    // ── Tier 3: cleans done → termination fee + unpaid add-ons ──
    } else {
      tier = 3;

      // Step 1: Refund unserved visits in last paid month only
      if (paidKeys.length > 0) {
        const lastKey = paidKeys[paidKeys.length - 1];
        const lastEnd = getPeriodEnd(lastKey);
        const inLast  = contractVisits.filter(v => v.cleanDate >= lastKey && v.cleanDate <= lastEnd && !v.status?.startsWith('cancelled'));
        const unservedInLast = inLast.filter(v => v.status !== 'completed');
        uncompletedCount = unservedInLast.length;
        if (unservedInLast.length > 0 && inLast.length > 0) {
          const { basis, hasPI } = await getPeriodBasis(lastKey);
          const periodRefundAmt = (unservedInLast.length / inLast.length) * basis;
          refundAmt += periodRefundAmt;
          if (hasPI) {
            try { await stripe.refunds.create({ payment_intent: paymentIntents[lastKey], amount: Math.round(periodRefundAmt * 100), reason: 'requested_by_customer' }); } catch (e) { if (!e.message?.includes('already been refunded')) console.error(`Tier 3 refund failed for ${lastKey}:`, e.message); }
          }
          summaryLines.push(`Refund £${periodRefundAmt.toFixed(2)} for ${unservedInLast.length} unserved visit${unservedInLast.length !== 1 ? 's' : ''} in last paid month.`);
        }
      }

      // Step 2: Add-ons from completed visits in unpaid periods
      const unpaidPeriodAddons = contractVisits
        .filter(v => v.status === 'completed' && !paidKeys.some(k => v.cleanDate >= k && v.cleanDate <= getPeriodEnd(k)))
        .reduce((s, v) => s + parseFloat(v.addonTotal || 0), 0);

      // Step 3: 50% termination fee on unpaid months base
      const termFee = 0.5 * unpaidMonths * monthlyBase;
      chargeAmt = termFee + unpaidPeriodAddons;

      summaryLines.push(`Early termination fee: £${termFee.toFixed(2)} (50% x ${unpaidMonths} unpaid month${unpaidMonths !== 1 ? 's' : ''} x £${monthlyBase.toFixed(2)} base).`);
      if (unpaidPeriodAddons > 0) summaryLines.push(`Add-ons from completed visits in unpaid periods: £${unpaidPeriodAddons.toFixed(2)}.`);

      if (chargeAmt > 0 && b.stripeCustomerId) {
        try {
          const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
          const pm = pms.data[0];
          if (pm) {
            await stripe.paymentIntents.create({
              amount: Math.round(chargeAmt * 100), currency: 'gbp',
              customer: b.stripeCustomerId, payment_method: pm.id,
              confirm: true, off_session: true,
              metadata: { contractId: snap.id, bookingRef: b.bookingRef || '', type: 'early_termination_fee', termFee: termFee.toFixed(2), unpaidAddons: unpaidPeriodAddons.toFixed(2) },
            });
          }
        } catch (e) { console.error('Tier 3 termination charge failed:', e.message); }
      }
    }

    // Cancel all non-completed, non-cancelled visits
    try {
      const batch = db.batch(); let batchSize = 0;
      for (const v of contractVisits) {
        if (v.status !== 'completed' && !v.status?.startsWith('cancelled')) {
          batch.update(v.ref, { status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: 'Contract cancelled' });
          batchSize++;
        }
      }
      if (batchSize > 0) await batch.commit();
    } catch (e) { console.error('Failed to cancel contract visits:', e.message); }

    const status = refundAmt > 0 ? 'cancelled_partial_refund' : 'cancelled_no_refund';
    await snap.ref.update({ status, cancelledAt: new Date(), cancellationReason: clean(reason||''), refundAmount: refundAmt, chargeAmount: chargeAmt, cancellationTier: tier });

    // Send cancellation emails
    try {
      const name = b.contactName || b.bizName || b.firstName || '';
      let refundMsg = '';
      if (tier === 1) {
        refundMsg = `A full refund of £${refundAmt.toFixed(2)} has been issued and will be returned to your original payment method within 5–10 business days.`;
      } else if (tier === 2) {
        refundMsg = `A £75 administration fee applies. ${refundAmt > 0 ? `Remaining balance of £${refundAmt.toFixed(2)} will be refunded within 5–10 business days.` : 'No further refund is applicable.'}`;
      } else {
        refundMsg = uncompletedCount > 0
          ? `A refund of £${refundAmt.toFixed(2)} has been issued for ${uncompletedCount} unserved visit${uncompletedCount !== 1 ? 's' : ''} in your last paid month.`
          : 'All visits in paid periods were completed — no refund applies.';
        if (chargeAmt > 0) refundMsg += ` An early termination charge of £${chargeAmt.toFixed(2)} will be applied to your saved payment method.`;
      }
      const cancelData = {
        booking_ref:    b.bookingRef || snap.id,
        package_name:   b.contractLabel || 'Contract Cleaning',
        date:           (b.contractStartDate || b.cleanDate)?.split('-').reverse().join('/') || '—',
        time:           b.cleanTime || '—',
        address:        `${b.addr1||''}, ${b.postcode||''}`.trim().replace(/^,\s*/, ''),
        refund_amount:  refundAmt > 0 ? `£${refundAmt.toFixed(2)}` : chargeAmt > 0 ? `£${chargeAmt.toFixed(2)} charge` : 'No refund',
        refund_message: refundMsg,
      };
      await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: name, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
      const adminNotice = [`Tier ${tier} cancellation.`, ...summaryLines, uncompletedCount > 0 ? `${uncompletedCount} uncompleted visit${uncompletedCount !== 1 ? 's' : ''}.` : ''].filter(Boolean).join(' ');
      await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: name, customer_email: b.email, customer_phone: b.phone||'', notice_given: adminNotice }, EMAILJS_KEY.value()).catch(() => {});
    } catch (e) { console.error('Contract cancel email failed:', e.message); }

    res.json({ success: true, status, refundAmount: refundAmt, chargeAmount: chargeAmt, tier }); return;
  }

  // ── Airbnb late cancellation — no deposit taken, charge saved card ──
  if (b.isAirbnb && hoursUntil < 48 && parseFloat(b.deposit || 0) === 0) {
    const feePence = Math.round((parseFloat(b.total) || 0) * 30);
    const feeAmt   = feePence / 100;
    let customerId = b.stripeCustomerId;
    if (!customerId) {
      const prevSnap = await db.collection('bookings')
        .where('email', '==', b.email.toLowerCase())
        .where('isAirbnb', '==', true)
        .limit(10).get();
      const prev = prevSnap.docs.find(d => d.data().stripeCustomerId && d.id !== snap.id);
      if (prev) customerId = prev.data().stripeCustomerId;
    }
    if (customerId && feePence > 0) {
      try {
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
        const pm  = pms.data[0];
        if (pm) {
          await stripe.paymentIntents.create({
            amount: feePence, currency: 'gbp',
            customer: customerId, payment_method: pm.id,
            confirm: true, off_session: true,
            metadata: { bookingRef: b.bookingRef, type: 'late_cancellation_fee' },
          });
        }
      } catch (e) { console.error('Airbnb late cancellation fee charge failed:', e.message); }
    }
    await snap.ref.update({ status: 'cancelled_late_fee', cancelledAt: new Date(), cancellationReason: clean(reason||''), lateFeeCharged: feeAmt });
    if (b.calendarEventId) {
      try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
    }
    const airbnbName = b.contactName || b.firstName || b.bizName || '';
    const airbnbCancelData = {
      booking_ref: b.bookingRef, package_name: b.packageName,
      date: b.cleanDate.split('-').reverse().join('/'), time: b.cleanTime,
      address: `${b.addr1}, ${b.postcode}`,
      refund_amount: `£${feeAmt.toFixed(2)} late cancellation fee charged`,
      refund_message: `A late cancellation fee of £${feeAmt.toFixed(2)} has been charged as the cancellation was made less than 48 hours before the scheduled clean.`,
    };
    await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...airbnbCancelData, to_name: airbnbName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...airbnbCancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${airbnbName} ${b.lastName||''}`.trim(), customer_email: b.email, customer_phone: b.phone||'', notice_given: `${hoursUntil.toFixed(1)} hours notice — 30% late fee charged` }, EMAILJS_KEY.value()).catch(() => {});
    res.json({ success: true, status: 'cancelled_late_fee', lateFeeCharged: feeAmt }); return;
  }

  // ── Standard booking cancellation ───────────────────────────
  const refundPence = hoursUntil >= 48 ? b.deposit * 100 : 0;
  const refundAmt   = refundPence / 100;
  const status      = hoursUntil >= 48 ? 'cancelled_full_refund' : 'cancelled_no_refund';
  const refundMsg   = refundPence > 0 ? `£${refundAmt.toFixed(2)} will be returned to your original payment method within 5–10 business days.` : 'No refund is applicable as the cancellation was made less than 48 hours before the scheduled clean.';
  const noticeMsg   = hoursUntil >= 48 ? `${hoursUntil.toFixed(1)} hours notice — full refund applied` : `${hoursUntil > 0 ? hoursUntil.toFixed(1) : '0'} hours notice — no refund applied`;

  if (refundPence > 0 && b.stripeDepositIntentId && b.stripeDepositIntentId !== 'manual') {
    try {
      await stripe.refunds.create({ payment_intent:b.stripeDepositIntentId, amount:refundPence, reason:'requested_by_customer' });
    } catch (e) {
      console.error('Stripe refund failed:', e.message);
      // If already refunded in Stripe, allow Firestore status to update anyway
      if (!e.message?.includes('already been refunded')) {
        res.status(500).json({ error: `Refund failed: ${e.message}` }); return;
      }
    }
  }
  await snap.ref.update({ status, cancelledAt:new Date(), cancellationReason:clean(reason||''), refundAmount:refundAmt });
  if (b.calendarEventId) {
    try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
  }

  const isRecurring = ['weekly','fortnightly','monthly'].includes(b.frequency);
  const cancelData = {
    booking_ref:  b.bookingRef,
    package_name: b.packageName,
    date:         b.cleanDate.split('-').reverse().join('/'),
    time:         b.cleanTime,
    address:      `${b.addr1}, ${b.postcode}`,
    refund_amount: refundAmt > 0 ? `£${refundAmt.toFixed(2)}` : 'No refund',
    refund_message: refundMsg + (isRecurring ? '\n\nPlease note: as this was part of a recurring series, all future scheduled cleans have also been cancelled.' : ''),
  };
  await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE,
    { ...cancelData, to_name: b.firstName, to_email: b.email },
    EMAILJS_KEY.value()).catch(() => {});
  await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE,
    { ...cancelData, to_email: 'bookings@londoncleaningwizard.com',
      customer_name: `${b.firstName} ${b.lastName}`,
      customer_email: b.email, customer_phone: b.phone,
      notice_given: noticeMsg,
    }, EMAILJS_KEY.value()).catch(() => {});

  // If this was the first booking of a recurring series, cancel all future scheduled bookings too
  if (['weekly','fortnightly','monthly'].includes(b.frequency)) {
    try {
      const email    = b.email.toLowerCase();
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const schedSnap = await db.collection('bookings')
        .where('email', '==', email)
        .where('status', '==', 'scheduled')
        .get();
      const futureDocs = schedSnap.docs.filter(d => d.data().cleanDate >= todayStr);
      if (futureDocs.length > 0) {
        const batch = db.batch();
        for (const fdoc of futureDocs) {
          batch.update(fdoc.ref, { status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: 'Recurring series cancelled — first booking cancelled' });
          const fd = fdoc.data();
          if (fd.calendarEventId) {
            try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: fd.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
          }
        }
        await batch.commit();
        await db.collection('customers').doc(email).update({ recurringActive: false, updatedAt: new Date() }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to cancel recurring series on first booking cancellation:', e.message);
    }
  }

  res.json({ success:true, status, refundAmount:refundAmt });
});

// ── 8. Mark deposit as paid (phone/manual bookings) ──────────
exports.markDepositPaid = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.status !== 'pending_deposit') {
    res.status(400).json({ error: 'Booking is not awaiting deposit.' }); return;
  }
  await snap.ref.update({ status: 'deposit_paid', depositPaidAt: new Date() });
  // Update Google Calendar event colour to blue (deposit paid)
  if (b.calendarEventId) {
    try {
      const cal = await getCalendarClient();
      await cal.events.patch({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId, resource: { colorId: calColorId('deposit_paid', b.frequency) } });
    } catch {}
  }
  const eData = buildBookingEmailData(b);
  await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
    { ...eData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
  await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
    { ...eData, to_email: 'bookings@londoncleaningwizard.com',
      customer_name: `${b.firstName} ${b.lastName}`,
      customer_phone: b.phone, customer_email: b.email },
    EMAILJS_KEY.value()).catch(() => {});
  res.json({ success: true });
});

// ── 9. Update booking fields (admin edit) ────────────────────
exports.updateBooking = onRequest({ secrets:[EMAILJS_KEY, STRIPE_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const {
    bookingId, updateCustomerProfile, skipEmail,
    cleanDate, cleanTime,
    firstName, lastName, email, phone,
    packageId, packageName, sizeId, frequency, addons,
    hasPets, petTypes, signatureTouch, signatureTouchNotes,
    addr1, postcode, floor, parking, keys, notes,
    total, remaining, deposit, originalTotal, pricePerVisit, assignedStaff, actualStart, actualFinish,
    isAutoRecurring, mediaConsent, restockCharge, restockPaid,
  } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const current = snap.data();
  const updates = { updatedAt: new Date() };
  if (assignedStaff !== undefined) updates.assignedStaff = assignedStaff;
  if (actualStart   !== undefined) updates.actualStart   = actualStart;
  if (actualFinish  !== undefined) updates.actualFinish  = actualFinish;
  const { actualStart2, actualFinish2 } = req.body;
  if (actualStart2  !== undefined) updates.actualStart2  = actualStart2;
  if (actualFinish2 !== undefined) updates.actualFinish2 = actualFinish2;
  const { secondCleaner } = req.body;
  if (secondCleaner !== undefined) updates.secondCleaner = secondCleaner || '';

  // Track significant changes for email notification
  const changes = [];

  const newDate = cleanDate || current.cleanDate;
  const newTime = cleanTime || current.cleanTime;
  if (cleanDate && cleanDate !== current.cleanDate) { updates.cleanDate = newDate; changes.push(`Date: ${current.cleanDate.split('-').reverse().join('/')} → ${newDate.split('-').reverse().join('/')}`); }
  if (cleanTime && cleanTime !== current.cleanTime) { updates.cleanTime = newTime; changes.push(`Time: ${current.cleanTime} → ${newTime}`); }
  if (cleanDate || cleanTime) updates.cleanDateUTC = toUTCISO(newDate, newTime);

  const newFirstName = firstName !== undefined ? clean(firstName) : current.firstName;
  const newLastName  = lastName  !== undefined ? clean(lastName)  : current.lastName;
  const newEmail     = email     !== undefined ? email.toLowerCase().trim() : current.email;
  const newPhone     = phone     !== undefined ? clean(phone)     : current.phone;
  if (firstName !== undefined) updates.firstName = newFirstName;
  if (lastName  !== undefined) updates.lastName  = newLastName;
  if (email     !== undefined) updates.email     = newEmail;
  if (phone     !== undefined) updates.phone     = newPhone;

  const newPackageId   = packageId   !== undefined ? packageId   : current.package;
  const newPackageName = packageName !== undefined ? packageName : current.packageName;
  const newSizeId      = sizeId      !== undefined ? sizeId      : current.size;
  const newFrequency   = frequency   !== undefined ? frequency   : current.frequency;
  const newAddons      = addons      !== undefined ? addons      : current.addons;
  if (packageId !== undefined && packageId !== current.package) { updates.package = newPackageId; updates.packageName = newPackageName; changes.push(`Package: ${current.packageName} → ${newPackageName}`); }
  if (sizeId    !== undefined && sizeId    !== current.size)    { updates.size = newSizeId; changes.push(`Property size: ${current.size} → ${newSizeId}`); }
  if (frequency !== undefined && frequency !== current.frequency) { updates.frequency = newFrequency; changes.push(`Frequency: ${current.frequency || 'one-off'} → ${newFrequency}`); }
  if (isAutoRecurring !== undefined) updates.isAutoRecurring = isAutoRecurring;
  if (addons !== undefined) {
    updates.addons = newAddons;
    updates.addonsList = (newAddons || []).map(a => a.name || a.label || '').filter(Boolean).join(', ');
    updates.addonTotal = (newAddons || []).reduce((s, a) => s + parseFloat(a.price || 0), 0);
    const oldNames = (current.addons || []).map(a => a.name).sort().join(', ') || 'None';
    const newNames = (newAddons || []).map(a => a.name).sort().join(', ') || 'None';
    if (oldNames !== newNames) changes.push(`Add-ons: ${oldNames} → ${newNames}`);
  }
  if (total !== undefined) {
    updates.total = total;
    const oldTotal = parseFloat(current.total || 0);
    const newTotal = parseFloat(total);
    if (Math.abs(newTotal - oldTotal) >= 0.01) changes.push(`Total: £${oldTotal.toFixed(2)} → £${newTotal.toFixed(2)}`);
  }
  if (pricePerVisit  !== undefined) updates.pricePerVisit  = pricePerVisit;
  if (originalTotal  !== undefined) updates.originalTotal  = originalTotal;
  if (deposit        !== undefined) updates.deposit        = deposit;
  if (remaining      !== undefined) updates.remaining      = remaining;
  if (restockCharge  !== undefined) updates.restockCharge  = restockCharge;
  if (restockPaid    !== undefined) updates.restockPaid    = restockPaid;

  if (hasPets             !== undefined) updates.hasPets             = hasPets;
  if (petTypes            !== undefined) updates.petTypes            = clean(petTypes);
  if (signatureTouch      !== undefined) updates.signatureTouch      = signatureTouch;
  if (signatureTouchNotes !== undefined) updates.signatureTouchNotes = clean(signatureTouchNotes || '');
  if (mediaConsent        !== undefined) updates.mediaConsent        = mediaConsent === true;
  const newMediaConsent = mediaConsent !== undefined ? mediaConsent === true : current.mediaConsent;

  const newAddr1    = addr1    !== undefined ? clean(addr1)                  : current.addr1;
  const newPostcode = postcode !== undefined ? clean(postcode).toUpperCase() : current.postcode;
  const newFloor    = floor    !== undefined ? clean(floor)                  : current.floor    || '';
  const newParking  = parking  !== undefined ? clean(parking)                : current.parking  || '';
  const newKeys     = keys     !== undefined ? clean(keys)                   : current.keys     || '';
  const newNotes    = notes    !== undefined ? clean(notes)                  : current.notes    || '';
  if (addr1    !== undefined) updates.addr1    = newAddr1;
  if (postcode !== undefined) updates.postcode = newPostcode;
  if (floor    !== undefined) updates.floor    = newFloor;
  if (parking  !== undefined) updates.parking  = newParking;
  if (keys     !== undefined) updates.keys     = newKeys;
  if (notes    !== undefined) updates.notes    = newNotes;
  if ((addr1 !== undefined && clean(addr1) !== current.addr1) || (postcode !== undefined && clean(postcode).toUpperCase() !== current.postcode)) {
    changes.push(`Address: ${current.addr1}, ${current.postcode} → ${newAddr1}, ${newPostcode}`);
  }

  await snap.ref.update(updates);

  // If the amount changed while a payment link is still pending, update the Stripe PaymentIntent
  // so the customer is charged the NEW amount — not the stale amount from when the link was made.
  if (updates.deposit !== undefined
      && current.status === 'pending_deposit'
      && current.pendingDepositPIId
      && Math.round(parseFloat(updates.deposit) * 100) !== Math.round(parseFloat(current.deposit || 0) * 100)) {
    try {
      const stripe = new Stripe(STRIPE_KEY.value());
      await stripe.paymentIntents.update(current.pendingDepositPIId, { amount: Math.round(parseFloat(updates.deposit) * 100) });
    } catch (e) {
      console.error('Failed to update pending PaymentIntent amount on edit:', e.message);
    }
  }

  // Send update email when anything meaningful to the customer changed (not for pending_deposit — booking not yet confirmed)
  if (changes.length > 0 && !skipEmail && process.env.EMAILJS_UPDATE_TEMPLATE && current.status !== 'pending_deposit') {
    const addonsList = (newAddons || []).map(a => a.name).join(', ') || 'None';
    const newRemaining = remaining !== undefined ? parseFloat(remaining) : parseFloat(current.remaining || 0);
    const newTotal     = total     !== undefined ? parseFloat(total)     : parseFloat(current.total     || 0);
    const freqForEmail = (() => {
      const f = newFrequency || current.frequency || 'one-off';
      if (f === 'flexible') return current.isEstateAgent ? 'Per visit' : 'Airbnb Flexible';
      return ({ 'one-off': 'One-off', daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' })[f] || f;
    })();
    const updateData = {
      booking_ref:     current.bookingRef,
      package_name:    current.isEstateAgent && current.cleanType ? current.cleanType : newPackageName,
      date:            newDate.split('-').reverse().join('/'),
      time:            newTime,
      address:         `${newAddr1}, ${newPostcode}`,
      frequency:       freqForEmail,
      addons:          addonsList,
      total:           `£${newTotal.toFixed(2)}`,
      deposit_paid:    `£${parseFloat(current.deposit || 0).toFixed(2)}`,
      balance_due:     `£${newRemaining.toFixed(2)}`,
      changes_summary: changes.join('\n'),
    };
    await sendEmail(process.env.EMAILJS_UPDATE_TEMPLATE,
      { ...updateData, to_name: newFirstName, to_email: newEmail }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_UPDATE_TEMPLATE,
      { ...updateData, to_name: 'Admin', to_email: 'bookings@londoncleaningwizard.com' }, EMAILJS_KEY.value()).catch(() => {});
  }

  // Update Google Calendar event
  if (current.calendarEventId) {
    try {
      const calendar  = await getCalendarClient();
      const slotStart = toUTCISO(newDate, newTime);
      const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId:    current.calendarEventId,
        resource: {
          summary: `${newPackageName} — ${newFirstName} ${newLastName}`,
          start:   { dateTime: slotStart, timeZone: 'Europe/London' },
          end:     { dateTime: slotEnd,   timeZone: 'Europe/London' },
          description: [
            `Ref: ${current.bookingRef}`,
            `Customer: ${newFirstName} ${newLastName}`,
            `Email: ${newEmail}`,
            `Phone: ${newPhone}`,
            `Address: ${newAddr1}, ${newPostcode}`,
            `Property: ${updates.propertyType || current.propertyType} · ${newSizeId}`,
            `Frequency: ${newFrequency || 'One-off'}`,
            `Floor / Lift: ${newFloor || '—'}`,
            `Parking: ${newParking || '—'}`,
            `Bathrooms: ${updates.bathrooms !== undefined ? updates.bathrooms : current.bathrooms || '—'}`,
            `Keys: ${newKeys || 'N/A'}`,
            `Add-ons: ${(newAddons||[]).map(a => a.name).join(', ') || 'None'}`,
            ...(['hourly','office_cleaning'].includes(current.package) ? [] : [`Pets: ${(hasPets !== undefined ? hasPets : current.hasPets) ? `Yes — ${petTypes !== undefined ? clean(petTypes||'') : current.petTypes || 'not specified'}` : 'No'}`]),
            ...(current.package === 'standard' ? [`Signature Touch: ${(signatureTouch !== undefined ? signatureTouch : current.signatureTouch) !== false ? 'Opted in' : `Opted out${(signatureTouchNotes !== undefined ? signatureTouchNotes : current.signatureTouchNotes) ? ` — ${signatureTouchNotes !== undefined ? clean(signatureTouchNotes||'') : current.signatureTouchNotes}` : ''}`}`] : []),
            `Cleaner: ${assignedStaff !== undefined ? (assignedStaff || 'Unassigned') : (current.assignedStaff || 'Unassigned')}`,
            `Notes: ${newNotes || 'None'}`,
            `Media consent: ${newMediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
            `Total: £${parseFloat(current.total||0).toFixed(2)} | Deposit: £${parseFloat(current.deposit||0).toFixed(2)} | Remaining: £${parseFloat(current.remaining||0).toFixed(2)}`,
            `⚠️ Edited on ${new Date().toLocaleDateString('en-GB')}`,
          ].join('\n'),
          colorId: calColorId(current.status, newFrequency || current.frequency),
        },
      });
    } catch (e) {
      console.error('Failed to update calendar event:', e.message);
    }
  }

  // Propagate to recurring customer profile if requested
  if (updateCustomerProfile && current.email) {
    const profileUpdates = { updatedAt: new Date() };
    if (cleanTime)      profileUpdates.recurringTime = newTime;
    if (cleanDate)      profileUpdates.recurringDay  = new Date(newDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
    if (packageId)      { profileUpdates.recurringPackage = newPackageId; profileUpdates.recurringPackageName = newPackageName; }
    if (sizeId)         profileUpdates.recurringSize = newSizeId;
    if (frequency)      profileUpdates.recurringFrequency = newFrequency;
    if (addons)         profileUpdates.recurringAddons = newAddons;
    if (addr1    !== undefined) profileUpdates.addr1    = newAddr1;
    if (postcode !== undefined) profileUpdates.postcode = newPostcode;
    if (floor    !== undefined) profileUpdates.floor    = newFloor;
    if (parking  !== undefined) profileUpdates.parking  = newParking;
    if (keys     !== undefined) profileUpdates.keys     = newKeys;
    if (notes    !== undefined) profileUpdates.notes    = newNotes;
    if (mediaConsent !== undefined) profileUpdates.mediaConsent = mediaConsent === true;
    await db.collection('customers').doc(current.email.toLowerCase()).update(profileUpdates).catch(() => {});

    // Also update all existing future scheduled recurring bookings
    const futureSnap = await db.collection('bookings')
      .where('email', '==', current.email.toLowerCase())
      .where('isAutoRecurring', '==', true)
      .where('status', '==', 'scheduled')
      .get();
    const futureDocs = futureSnap.docs.filter(d => d.data().cleanDate > current.cleanDate);
    if (futureDocs.length > 0) {
      const futureBatch = db.batch();
      const calendar = await getCalendarClient().catch(() => null);

      await Promise.allSettled(futureDocs.map(async fdoc => {
        const fd = fdoc.data();
        const fu = { updatedAt: new Date() };
        if (firstName           !== undefined) fu.firstName           = newFirstName;
        if (lastName            !== undefined) fu.lastName            = newLastName;
        if (phone               !== undefined) fu.phone               = newPhone;
        if (email               !== undefined) fu.email               = newEmail;

        // Shift date to match the new day-of-week within the same week
        let fdDateStr = fd.cleanDate;
        if (cleanDate) {
          const fdD = new Date(fd.cleanDate + 'T12:00:00');
          const newDayOfWeek = new Date(newDate + 'T12:00:00').getDay();
          const diff = newDayOfWeek - fdD.getDay();
          fdD.setDate(fdD.getDate() + diff);
          fdDateStr = fdD.toISOString().split('T')[0];
          fu.cleanDate = fdDateStr;
        }
        const fdTime = cleanTime ? newTime : fd.cleanTime;
        if (cleanDate || cleanTime) fu.cleanDateUTC = toUTCISO(fdDateStr, fdTime);
        if (cleanTime) fu.cleanTime = newTime;

        if (packageId)                         { fu.package = newPackageId; fu.packageName = newPackageName; }
        if (sizeId)                            fu.size                = newSizeId;
        if (frequency           !== undefined) fu.frequency           = newFrequency;
        if (addons              !== undefined) fu.addons              = newAddons;
        if (hasPets             !== undefined) fu.hasPets             = hasPets;
        if (petTypes            !== undefined) fu.petTypes            = clean(petTypes);
        if (signatureTouch      !== undefined) fu.signatureTouch      = signatureTouch;
        if (signatureTouchNotes !== undefined) fu.signatureTouchNotes = clean(signatureTouchNotes || '');
        if (mediaConsent        !== undefined) fu.mediaConsent        = mediaConsent === true;
        if (addr1               !== undefined) fu.addr1               = newAddr1;
        if (postcode            !== undefined) fu.postcode            = newPostcode;
        if (floor               !== undefined) fu.floor               = newFloor;
        if (parking             !== undefined) fu.parking             = newParking;
        if (keys                !== undefined) fu.keys                = newKeys;
        if (notes               !== undefined) fu.notes               = newNotes;
        if (total               !== undefined) { fu.total = total; fu.remaining = total; }
        futureBatch.update(fdoc.ref, fu);

        // Update the calendar event for this future booking
        if (calendar && fd.calendarEventId) {
          const fdAddr   = addr1 !== undefined ? newAddr1 : fd.addr1;
          const fdPost   = postcode !== undefined ? newPostcode : fd.postcode;
          const fdSlotStart = toUTCISO(fdDateStr, fdTime);
          const fdSlotEnd   = new Date(new Date(fdSlotStart).getTime() + 60 * 1000).toISOString();
          await calendar.events.patch({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId:    fd.calendarEventId,
            resource: {
              summary: `${packageId ? newPackageName : fd.packageName} — ${newFirstName} ${newLastName}`,
              start:   { dateTime: fdSlotStart, timeZone: 'Europe/London' },
              end:     { dateTime: fdSlotEnd,   timeZone: 'Europe/London' },
              description: [
                `Ref: ${fd.bookingRef}`,
                `Customer: ${newFirstName} ${newLastName}`,
                `Email: ${current.email}`,
                `Phone: ${newPhone}`,
                `Address: ${fdAddr}, ${fdPost}`,
                `Property: ${fd.propertyType || ''} · ${sizeId !== undefined ? newSizeId : fd.size || ''}`,
                `Frequency: ${newFrequency}`,
                `Floor / Lift: ${floor !== undefined ? newFloor : fd.floor || '—'}`,
                `Parking: ${parking !== undefined ? newParking : fd.parking || '—'}`,
                `Bathrooms: ${fd.bathrooms || '—'}`,
                `Keys: ${keys !== undefined ? newKeys : fd.keys || 'N/A'}`,
                `Add-ons: ${((addons !== undefined ? newAddons : fd.addons) || []).map(a => a.name).join(', ') || 'None'}`,
                ...(!['hourly','office_cleaning'].includes(fd.package) ? [`Pets: ${(hasPets !== undefined ? hasPets : fd.hasPets) ? `Yes — ${petTypes !== undefined ? clean(petTypes||'') : fd.petTypes || 'not specified'}` : 'No'}`] : []),
                ...(fd.package === 'standard' ? [`Signature Touch: ${(signatureTouch !== undefined ? signatureTouch : fd.signatureTouch) !== false ? 'Opted in' : `Opted out${(signatureTouchNotes !== undefined ? signatureTouchNotes : fd.signatureTouchNotes) ? ` — ${signatureTouchNotes !== undefined ? clean(signatureTouchNotes||'') : fd.signatureTouchNotes}` : ''}`}`] : []),
                `Cleaner: ${fd.assignedStaff || 'Unassigned'}`,
                `Notes: ${notes !== undefined ? newNotes : fd.notes || 'None'}`,
                `Media consent: ${(mediaConsent !== undefined ? mediaConsent === true : fd.mediaConsent) ? 'Yes - consented to photos/videos on social media' : 'No'}`,
                `Total: £${parseFloat(total !== undefined ? total : fd.total||0).toFixed(2)} | Deposit: £0 | Remaining: £${parseFloat(total !== undefined ? total : fd.remaining||0).toFixed(2)}`,
                `⚠️ Edited on ${new Date().toLocaleDateString('en-GB')}`,
              ].join('\n'),
            },
          }).catch(e => console.error(`Calendar update failed for ${fd.bookingRef}:`, e.message));
        }
      }));

      await futureBatch.commit();
    }
  }

  res.json({ success: true });
});

// ── 10. Generate deposit payment link (phone bookings) ───────
exports.generateDepositLink = onRequest({ secrets:[STRIPE_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.status !== 'pending_deposit') {
    res.status(400).json({ error: 'Booking is not pending deposit.' }); return;
  }
  const customer = await stripe.customers.create({
    email: b.email,
    name:  `${b.firstName} ${b.lastName}`,
    metadata: { bookingRef: b.bookingRef },
  });
  const intent = await stripe.paymentIntents.create({
    amount:              Math.round(b.deposit * 100),
    currency:            'gbp',
    customer:            customer.id,
    setup_future_usage:  'off_session',
    metadata:            { bookingRef: b.bookingRef, bookingId },
  });
  await snap.ref.update({
    pendingDepositClientSecret: intent.client_secret,
    pendingDepositCustomerId:   customer.id,
    pendingDepositPIId:         intent.id,
  });
  res.json({ success: true });
});

// ── 10a. Generate contract first payment link ─────────────────
exports.generateContractPaymentLink = onRequest({ secrets:[STRIPE_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (!b.isContract) { res.status(400).json({ error: 'Not a contract booking.' }); return; }
  if (b.stripeCustomerId) { res.status(400).json({ error: 'First payment already collected.' }); return; }
  const amount   = b.firstMonthCharge || b.monthlyBaseValue || b.monthlyValue || 0;
  const name     = b.bizName || b.contactName || `${b.firstName} ${b.lastName}`.trim();
  const customer = await stripe.customers.create({
    email: b.email, name,
    metadata: { bookingRef: b.bookingRef, contractId: bookingId },
  });
  const intent = await stripe.paymentIntents.create({
    amount:             Math.round(amount * 100),
    currency:           'gbp',
    customer:           customer.id,
    setup_future_usage: 'off_session',
    metadata:           { bookingRef: b.bookingRef, bookingId, isContract: 'true' },
  });
  await snap.ref.update({
    pendingDepositClientSecret: intent.client_secret,
    pendingDepositCustomerId:   customer.id,
    pendingDepositPIId:         intent.id,
  });
  res.json({ success: true });
});

// ── 10b. Email deposit link to customer ──────────────────────
exports.emailDepositLink = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  const paymentLink = `https://londoncleaningwizard.com/pay-deposit?bookingId=${bookingId}`;
  let emailData, linkTemplate;
  if (b.isContract) {
    emailData = {
      to_name:        b.contactName || b.bizName || b.firstName,
      to_email:       b.email,
      booking_ref:    b.bookingRef || bookingId,
      package_name:   b.contractLabel || 'Contract Cleaning',
      clean_date:     b.contractStartDate ? b.contractStartDate.split('-').reverse().join('/') : '',
      clean_time:     b.cleanTime || '',
      address:        `${b.addr1 || ''}, ${b.postcode || ''}`.trim().replace(/^,\s*/, ''),
      deposit_amount: parseFloat(b.firstMonthCharge || b.monthlyBaseValue || 0).toFixed(2),
      payment_link:   paymentLink,
    };
    linkTemplate = process.env.EMAILJS_CONTRACT_PAYMENT_LINK_TEMPLATE || process.env.EMAILJS_DEPOSIT_LINK_TEMPLATE;
  } else if (b.isEstateAgent) {
    // Estate Agent: one-off, paid in full. Dedicated template (no 30% deposit / monthly wording).
    emailData = {
      to_name:       b.contactName || b.firstName || b.bizName || '',
      to_email:      b.email,
      booking_ref:   b.bookingRef || bookingId,
      business_name: b.bizName || '',
      clean_type:    b.cleanType || 'Estate Agent Clean',
      date:          b.cleanDate ? b.cleanDate.split('-').reverse().join('/') : '',
      time:          b.cleanTime || '',
      address:       [b.addr1, b.addr2, b.postcode].filter(Boolean).join(', '),
      amount:        parseFloat(b.deposit || b.total || 0).toFixed(2),
      payment_link:  paymentLink,
    };
    linkTemplate = process.env.EMAILJS_ESTATE_PAYMENT_LINK_TEMPLATE || process.env.EMAILJS_DEPOSIT_LINK_TEMPLATE;
  } else {
    emailData = {
      to_name:        b.firstName,
      to_email:       b.email,
      booking_ref:    b.bookingRef,
      package_name:   b.packageName,
      clean_date:     b.cleanDate.split('-').reverse().join('/'),
      clean_time:     b.cleanTime,
      address:        `${b.addr1}, ${b.postcode}`,
      deposit_amount: parseFloat(b.deposit).toFixed(2),
      payment_link:   paymentLink,
    };
    linkTemplate = process.env.EMAILJS_DEPOSIT_LINK_TEMPLATE;
  }
  await sendEmail(linkTemplate, emailData, EMAILJS_KEY.value());
  res.json({ success: true });
});

// ── 10b. Notify customer of assigned cleaner ─────────────────
exports.notifyCleanerAssigned = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, cleanerName, secondCleaner: reqSecondCleaner, bookingRef: reqBookingRef } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  const assignedCleaner = cleanerName || b.assignedStaff;
  if (!assignedCleaner) { res.status(400).json({ error: 'No cleaner assigned to this booking' }); return; }
  // Prefer the value passed from the client (reflects current UI state) over stale Firestore data
  const secondCleaner = reqSecondCleaner !== undefined ? reqSecondCleaner : (b.secondCleaner || '');
  // For contract visits, fall back to the passed bookingRef or look up the master contract
  let bookingRef = reqBookingRef || b.bookingRef || '';
  if (!bookingRef && b.isContractVisit && b.contractId) {
    try {
      const masterSnap = await db.collection('bookings').doc(b.contractId).get();
      if (masterSnap.exists) bookingRef = masterSnap.data().bookingRef || '';
    } catch {}
  }
  const hasSecond = !!secondCleaner;
  const template  = hasSecond ? process.env.EMAILJS_CLEANER_2_TEMPLATE : process.env.EMAILJS_CLEANER_TEMPLATE;
  if (!template) { res.status(500).json({ error: 'Cleaner notification template not configured' }); return; }
  const FALLBACK_PHOTO = 'https://londoncleaningwizard.com/wizard.png';
  const lookupPhoto = async (name) => {
    try {
      const s = await db.collection('staff').where('name', '==', name).limit(1).get();
      return s.empty ? FALLBACK_PHOTO : (s.docs[0].data().photoURL || FALLBACK_PHOTO);
    } catch { return FALLBACK_PHOTO; }
  };
  const [cleanerPhoto, cleanerPhoto2] = await Promise.all([
    lookupPhoto(assignedCleaner),
    hasSecond ? lookupPhoto(secondCleaner) : Promise.resolve(''),
  ]);
  const combinedName = hasSecond ? `${assignedCleaner} & ${secondCleaner}` : assignedCleaner;
  await sendEmail(template, {
    to_name:         b.firstName,
    to_email:        b.email,
    cleaner_name:    combinedName,
    cleaner_name_1:  assignedCleaner,
    cleaner_photo:   cleanerPhoto,
    cleaner_name_2:  secondCleaner,
    cleaner_photo_2: cleanerPhoto2,
    booking_ref:     bookingRef,
    date:            b.cleanDate.split('-').reverse().join('/'),
    time:            b.cleanTime,
    package_name:    b.packageName,
    address:         [b.addr1, b.postcode].filter(Boolean).join(', '),
  }, EMAILJS_KEY.value());
  await snap.ref.update({ lastNotifiedCleaner: combinedName, lastNotifiedAt: new Date() });
  res.json({ success: true });
});

// ── 11. Get deposit page data (used by payment page) ─────────
exports.getDepositDetails = onRequest(async (req, res) => {
  if (!guard(req, res, 'GET')) return;
  const { bookingId } = req.query;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.isContract) {
    if (!b.pendingDepositClientSecret) {
      res.status(400).json({ error: 'This payment link has expired or the first payment has already been made.' }); return;
    }
    res.json({
      isContract:   true,
      firstName:    b.contactName || b.bizName || b.firstName,
      packageName:  b.contractLabel || 'Contract Cleaning',
      size:         b.frequencyLabel || b.frequency || '',
      cleanDate:    b.contractStartDate ? b.contractStartDate.split('-').reverse().join('/') : '',
      cleanTime:    b.cleanTime || '',
      deposit:      b.firstMonthCharge || b.monthlyBaseValue || 0,
      total:        b.firstMonthCharge || b.monthlyBaseValue || 0,
      remaining:    0,
      bookingRef:   b.bookingRef,
      clientSecret: b.pendingDepositClientSecret,
      bizName:      b.bizName || '',
      frequency:    b.frequency || '',
      freqSaving:   0,
    });
    return;
  }
  if (b.status !== 'pending_deposit' || !b.pendingDepositClientSecret) {
    res.status(400).json({ error: 'This payment link has expired or the deposit has already been paid.' }); return;
  }
  res.json({
    firstName:    b.firstName,
    packageName:  b.packageName,
    size:         b.size,
    cleanDate:    b.cleanDate.split('-').reverse().join('/'),
    cleanTime:    b.cleanTime,
    deposit:      b.deposit,
    total:        b.total,
    remaining:    b.remaining,
    isEstateAgent: b.isEstateAgent === true,
    bookingRef:   b.bookingRef,
    clientSecret: b.pendingDepositClientSecret,
    frequency:    b.frequency || 'one-off',
    freqSaving:   FREQ_SAVINGS[b.frequency] || 0,
    ...(b.launchDiscount ? { launchDiscount: b.launchDiscount, originalTotal: b.originalTotal } : {}),
    ...(b.mediaConsentDiscount ? {
      mediaConsentDiscount: b.mediaConsentDiscount,
      ...(!b.launchDiscount ? { originalTotal: parseFloat((b.total + b.mediaConsentDiscount).toFixed(2)) } : {}),
    } : {}),
  });
});

// ── 12. Confirm deposit payment (called after Stripe success) ─
exports.confirmDepositPayment = onRequest({ secrets:[STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, paymentIntentId, marketingOptOut, mediaConsent } = req.body;
  if (!bookingId || !paymentIntentId) { res.status(400).json({ error: 'Missing required fields' }); return; }
  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== 'succeeded') {
    res.status(400).json({ error: 'Payment not confirmed by Stripe.' }); return;
  }
  const customerId = b.pendingDepositCustomerId || pi.customer;
  if (b.isContract) {
    const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : (pi.payment_method?.id || null);
    const contractUpdate = {
      stripeCustomerId:                                    customerId,
      stripePaymentMethodId:                               pmId,
      depositPaidAt:                                       new Date(),
      [`monthlyPayments.${b.contractStartDate}`]:          'paid',
      [`monthlyPaymentIntents.${b.contractStartDate}`]:    paymentIntentId,
      pendingDepositClientSecret:                          admin.firestore.FieldValue.delete(),
      pendingDepositCustomerId:                            admin.firestore.FieldValue.delete(),
      pendingDepositPIId:                                  admin.firestore.FieldValue.delete(),
    };
    if (typeof marketingOptOut === 'boolean') {
      contractUpdate.marketingOptOut = marketingOptOut;
      contractUpdate.doNotContact    = marketingOptOut;
    }
    await snap.ref.update(contractUpdate);
    if (typeof marketingOptOut === 'boolean' && b.email) {
      await db.collection('customers').doc(b.email.toLowerCase())
        .set({ doNotContact: marketingOptOut, marketingOptOut }, { merge: true })
        .catch(() => {});
    }
    // Send contract confirmation email on first (Stripe link) payment
    const contractConfirmTpl = process.env.EMAILJS_CONTRACT_CONFIRM_TEMPLATE;
    if (contractConfirmTpl && b.email) {
      const base  = parseFloat(b.monthlyBaseValue  || 0);
      const addon = parseFloat(b.monthlyAddonValue || 0);
      const total = base + addon;
      const fmtD  = s => s ? s.split('-').reverse().join('/') : '—';
      const freqMap = { 'one-off': 'One-off', daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', flexible: 'Airbnb Flexible' };
      const addonRows = addon > 0
        ? `<tr><td style="padding:4px 16px 4px 0;color:rgba(200,184,154,0.6);">Add-ons (this billing)</td><td style="padding:4px 0;color:#f5f0e8;text-align:right;">£${addon.toFixed(2)}</td></tr><tr><td style="padding:10px 16px 4px 0;color:#c8b89a;font-weight:bold;border-top:1px solid rgba(200,184,154,0.15);">First billing total</td><td style="padding:10px 0 4px;color:#c8b89a;text-align:right;font-weight:bold;border-top:1px solid rgba(200,184,154,0.15);">£${total.toFixed(2)}</td></tr>`
        : `<tr><td style="padding:10px 16px 4px 0;color:#c8b89a;font-weight:bold;border-top:1px solid rgba(200,184,154,0.15);">First billing total</td><td style="padding:10px 0 4px;color:#c8b89a;text-align:right;font-weight:bold;border-top:1px solid rgba(200,184,154,0.15);">£${total.toFixed(2)}</td></tr>`;
      await sendEmail(contractConfirmTpl, {
        to_name:        b.contactName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.bizName || '',
        to_email:       b.email,
        booking_ref:    b.bookingRef || '',
        business_name:  b.bizName || '',
        package_name:   b.packageName || '—',
        frequency:      freqMap[b.frequency] || b.frequency || '—',
        start_date:     fmtD(b.contractStartDate || b.cleanDate),
        end_date:       fmtD(b.contractEndDate),
        address:        [b.addr1, b.addr2, b.postcode].filter(Boolean).join(', '),
        base_charge:    `£${base.toFixed(2)}`,
        addon_rows:     addonRows,
        notes:          b.notes || '—',
      }, EMAILJS_KEY.value()).catch(e => console.error('Contract confirm email failed:', e.message));
    }
    res.json({ success: true, isContract: true });
    return;
  }
  // If the "deposit" covered the whole amount (e.g. Estate Agent paid in full upfront, so
  // remaining is 0), the booking is fully paid — not a deposit with a balance still due.
  const paidInFull = parseFloat(b.remaining || 0) <= 0;
  const newStatus  = paidInFull ? 'fully_paid' : 'deposit_paid';
  const updateData = {
    status:               newStatus,
    stripeDepositIntentId: paymentIntentId,
    stripeCustomerId:      customerId,
    depositPaidAt:         new Date(),
    ...(paidInFull ? { paidAt: new Date() } : {}),
    pendingDepositClientSecret: admin.firestore.FieldValue.delete(),
    pendingDepositCustomerId:   admin.firestore.FieldValue.delete(),
    pendingDepositPIId:         admin.firestore.FieldValue.delete(),
  };
  if (typeof marketingOptOut === 'boolean') {
    updateData.marketingOptOut = marketingOptOut;
    updateData.doNotContact    = marketingOptOut;
  }
  if (typeof mediaConsent === 'boolean') {
    updateData.mediaConsent = mediaConsent;
  }
  await snap.ref.update(updateData);

  // Update Google Calendar event: colour → blue (deposit paid) + patch description with media consent
  if (b.calendarEventId) {
    try {
      const calendar = await getCalendarClient();
      const resolvedMediaConsent = typeof mediaConsent === 'boolean' ? mediaConsent : (b.mediaConsent || false);
      const description = [
        `Ref: ${b.bookingRef}`,
        `Customer: ${b.firstName} ${b.lastName}`,
        `Email: ${b.email}`,
        `Phone: ${b.phone}`,
        `Address: ${b.addr1}, ${b.postcode}`,
        `Property: ${b.propertyType} · ${b.size}`,
        `Frequency: ${b.frequency || 'One-off'}`,
        `Floor / Lift: ${b.floor || '—'}`,
        `Parking: ${b.parking || '—'}`,
        `Bathrooms: ${b.bathrooms || '—'}`,
        `Keys: ${b.keys || 'N/A'}`,
        `Add-ons: ${(b.addons||[]).map(a => a.name).join(', ') || 'None'}`,
        ...(['hourly','office_cleaning'].includes(b.package) ? [] : [`Pets: ${b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No'}`]),
        ...(b.package === 'standard' ? [`Signature Touch: ${b.signatureTouch !== false ? 'Opted in' : `Opted out${b.signatureTouchNotes ? ` — ${b.signatureTouchNotes}` : ''}`}`] : []),
        `Cleaner: ${b.assignedStaff || 'Unassigned'}`,
        `Notes: ${b.notes || 'None'}`,
        `Media consent: ${resolvedMediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
        `Marketing opt-in: ${(typeof marketingOptOut === 'boolean' ? marketingOptOut : b.marketingOptOut) ? 'Opted out' : 'Opted in'}`,
        `Total: £${parseFloat(b.total||0).toFixed(2)} | Deposit: £${parseFloat(b.deposit||0).toFixed(2)} | Remaining: £${parseFloat(b.remaining||0).toFixed(2)}`,
      ].join('\n');
      await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId:    b.calendarEventId,
        resource:   { colorId: calColorId(newStatus, b.frequency), description },
      });
    } catch (e) {
      console.error('confirmDepositPayment: calendar patch failed:', e.message);
    }
  }

  // Backfill stripeCustomerId onto this customer's other bookings missing it — pre-created
  // recurring cleans AND estate-agent visits charged on completion — so the saved card can be
  // used to charge them later. (Filter in code so both booking types are covered.)
  if (customerId && b.email) {
    const sameCustomer = await db.collection('bookings').where('email', '==', b.email).get();
    const backfills = sameCustomer.docs
      .filter(d => d.id !== snap.id && !d.data().stripeCustomerId)
      .map(d => d.ref.update({ stripeCustomerId: customerId }));
    await Promise.all(backfills).catch(() => {});
  }

  // Estate Agent: send the dedicated estate-agent confirmation (paid in full, one-off, no deposit
  // talk) — the payment-link flow doesn't otherwise email the client.
  if (b.isEstateAgent && process.env.EMAILJS_ESTATE_CONFIRM_TEMPLATE) {
    try {
      await sendEmail(process.env.EMAILJS_ESTATE_CONFIRM_TEMPLATE, {
        to_name:       b.contactName || b.firstName || b.bizName || '',
        to_email:      b.email,
        booking_ref:   b.bookingRef || '',
        business_name: b.bizName || '',
        clean_type:    b.cleanType || 'Estate Agent Clean',
        date:          b.cleanDate ? b.cleanDate.split('-').reverse().join('/') : '',
        time:          b.cleanTime || '',
        address:       [b.addr1, b.addr2, b.postcode].filter(Boolean).join(', '),
        notes:         b.notes || '—',
        total:         `£${parseFloat(b.total || 0).toFixed(2)}`,
      }, EMAILJS_KEY.value());
    } catch (e) { console.error('Estate agent confirmation email failed:', e.message); }
  }

  res.json({ success: true });
});

// ── 13. Trash booking (soft delete — moves to trash, removes calendar event) ──
exports.trashBooking = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.calendarEventId) {
    try {
      const calendar = await getCalendarClient();
      await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId });
    } catch (e) {
      console.error('Failed to delete calendar event on trash:', e.message);
    }
  }
  const now = new Date();
  await snap.ref.update({ deleted: true, deletedAt: now, calendarEventId: null });
  // Cascade to contract visits. A contract is just a series of recurring cleans, so we delete
  // each visit exactly like a single recurring booking above: one event at a time, sequentially.
  // (The old code fired 10 calendar deletes in parallel, which tripped Google's rate limit and
  // left some events behind. Deleting one at a time is what makes recurring cleans reliable.)
  if (b.isContract) {
    const visitsSnap = await db.collection('bookings').where('contractId', '==', bookingId).get();
    for (const d of visitsSnap.docs) {
      const vd = d.data();
      if (vd.calendarEventId) {
        try {
          const calendar = await getCalendarClient();
          await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: vd.calendarEventId });
        } catch (e) {
          console.error('Failed to delete contract visit calendar event on trash:', e.message);
        }
      }
      await d.ref.update({ deleted: true, deletedAt: now, calendarEventId: null });
    }
  }
  res.json({ success: true });
});

// ── 13b. Restore booking from trash ──────────────────────────
exports.restoreBooking = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  await snap.ref.update({ deleted: false, deletedAt: null });

  // Recreate calendar event for the master (non-contract-visit) booking
  if (!b.contractId) {
    try {
      const calendar  = await getCalendarClient();
      const slotStart = toUTCISO(b.cleanDate, b.cleanTime);
      const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
      const calEvent  = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: {
          summary:     `${b.packageName} — ${b.firstName} ${b.lastName}`,
          description: `${b.addr1}, ${b.postcode} | ${b.phone} | ${b.email}`,
          start:       { dateTime: slotStart, timeZone: 'Europe/London' },
          end:         { dateTime: slotEnd,   timeZone: 'Europe/London' },
          colorId:     calColorId(b.status, b.frequency),
        },
      });
      await snap.ref.update({ calendarEventId: calEvent.data.id });
    } catch (e) {
      console.error('Failed to recreate calendar event on restore:', e.message);
    }
  }

  // Cascade restore to all contract visits and recreate their calendar events
  if (b.isContract) {
    const visitsSnap = await db.collection('bookings').where('contractId', '==', bookingId).get();
    if (!visitsSnap.empty) {
      let calClient = null;
      try { calClient = await getCalendarClient(); } catch {}
      const CHUNK = 10;
      for (let i = 0; i < visitsSnap.docs.length; i += CHUNK) {
        const chunk = visitsSnap.docs.slice(i, i + CHUNK);
        await Promise.all(chunk.map(async d => {
          const vd  = d.data();
          const upd = { deleted: false, deletedAt: null };
          if (calClient && !vd.calendarEventId) {
            try {
              const slotStart = toUTCISO(vd.cleanDate, vd.cleanTime);
              const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
              const calEvent  = await calClient.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                resource: {
                  summary:     `${vd.packageName} — ${b.firstName} ${b.lastName}`,
                  description: `${b.addr1}, ${b.postcode} | ${b.phone} | ${b.email}`,
                  start:       { dateTime: slotStart, timeZone: 'Europe/London' },
                  end:         { dateTime: slotEnd,   timeZone: 'Europe/London' },
                  colorId:     calColorId(vd.status, b.frequency),
                },
              });
              upd.calendarEventId = calEvent.data.id;
            } catch {}
          }
          return d.ref.update(upd);
        }));
      }
    }
  }

  res.json({ success: true });
});

// ── 13c. Permanently delete booking from trash ────────────────
exports.deleteBooking = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.calendarEventId) {
    try {
      const calendar = await getCalendarClient();
      await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId });
    } catch (e) {
      console.error('Failed to delete calendar event:', e.message);
    }
  }
  await snap.ref.delete();

  // Cascade permanent deletion to contract visits, one at a time like a single recurring booking
  // (sequential, no parallel burst that trips Google's rate limit and leaves events behind).
  if (b.isContract) {
    try {
      const visitsSnap = await db.collection('bookings').where('contractId', '==', bookingId).get();
      for (const d of visitsSnap.docs) {
        const vd = d.data();
        if (vd.calendarEventId) {
          try {
            const calendar = await getCalendarClient();
            await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: vd.calendarEventId });
          } catch (e) {
            console.error('Failed to delete contract visit calendar event:', e.message);
          }
        }
        await d.ref.delete();
      }
    } catch (e) {
      console.error('Failed to delete contract visits:', e.message);
    }
  }

  // If this was a recurring booking, disable the scheduler for this customer
  if (b.email && (b.isAutoRecurring || b.freq)) {
    try {
      const customerRef = db.collection('customers').doc(b.email.toLowerCase());
      const customerSnap = await customerRef.get();
      if (customerSnap.exists && customerSnap.data().recurringActive) {
        await customerRef.update({ recurringActive: false, updatedAt: new Date() });
      }
    } catch (e) {
      console.error('Failed to disable recurringActive on customer:', e.message);
    }
  }

  res.json({ success: true });
});

// ── 14b. Clean up orphaned contract visits ────────────────────
exports.cleanupOrphanedVisits = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const db = admin.firestore();

  // Get all contract visits that are not deleted
  const visitsSnap = await db.collection('bookings')
    .where('isContractVisit', '==', true)
    .get();
  const activeVisits = visitsSnap.docs.filter(d => !d.data().deleted);
  if (activeVisits.length === 0) { res.json({ fixed: 0 }); return; }

  // Get unique contractIds referenced by those visits
  const contractIds = [...new Set(activeVisits.map(d => d.data().contractId).filter(Boolean))];

  // Look up each master — check if it exists and is not deleted
  const masterSnaps = await Promise.all(contractIds.map(id => db.collection('bookings').doc(id).get()));

  // A contractId is orphaned if its master is gone or has deleted: true
  const orphanedContractIds = new Set();
  masterSnaps.forEach((snap, i) => {
    if (!snap.exists || snap.data().deleted) {
      orphanedContractIds.add(contractIds[i]);
    }
  });

  const orphans = activeVisits.filter(d => orphanedContractIds.has(d.data().contractId));
  if (orphans.length === 0) { res.json({ fixed: 0 }); return; }

  // Permanently delete the orphaned visits so they vanish from all views
  await Promise.all(orphans.map(d => d.ref.delete()));
  res.json({ fixed: orphans.length });
});

// ── 14c. Clean up calendar events for trashed bookings ───────
exports.cleanupTrashCalendar = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const db = admin.firestore();
  const snap = await db.collection('bookings')
    .where('deleted', '==', true)
    .get();
  const withEvents = snap.docs.filter(d => d.data().calendarEventId);
  if (withEvents.length === 0) { res.json({ cleaned: 0 }); return; }
  let calendar = null;
  try { calendar = await getCalendarClient(); } catch (e) {
    res.status(500).json({ error: 'Could not connect to Google Calendar: ' + e.message }); return;
  }
  let cleaned = 0;
  const CHUNK = 5;
  for (let i = 0; i < withEvents.length; i += CHUNK) {
    await Promise.all(withEvents.slice(i, i + CHUNK).map(async d => {
      const calId = d.data().calendarEventId;
      try {
        await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: calId });
      } catch (e) {
        if (!e.message?.includes('404') && !e.message?.includes('410')) return;
      }
      await d.ref.update({ calendarEventId: null });
      cleaned++;
    }));
  }
  res.json({ cleaned });
});

// ── 14d. Stop recurring series ────────────────────────────────
exports.stopRecurringSeries = onRequest({ secrets: [EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { email, fromDate } = req.body;
  if (!email) { res.status(400).json({ error: 'Missing email' }); return; }
  const db = admin.firestore();

  // Stop the series on the customer record
  await db.collection('customers').doc(email.toLowerCase()).update({
    recurringActive: false, updatedAt: new Date(),
  });

  // Cancel all scheduled auto-recurring bookings from the clicked booking's date onwards
  const cutoffDate = fromDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const allSnap = await db.collection('bookings')
    .where('email', '==', email.toLowerCase())
    .get();
  const futureDocs = allSnap.docs.filter(d => {
    const bd = d.data();
    return bd.isAutoRecurring === true && bd.status === 'scheduled' && bd.cleanDate >= cutoffDate;
  });
  const futureSnap = { docs: futureDocs, size: futureDocs.length, empty: futureDocs.length === 0 };

  if (futureSnap.empty) { res.json({ success: true, cancelled: 0 }); return; }

  // Sort cancelled bookings by date for the summary email
  const cancelled = futureSnap.docs
    .map(d => d.data())
    .sort((a, z) => a.cleanDate.localeCompare(z.cleanDate));

  const batch = db.batch();
  for (const fdoc of futureSnap.docs) {
    batch.update(fdoc.ref, {
      status: 'cancelled_no_refund',
      cancelledAt: new Date(),
      cancellationReason: 'Recurring cancelled — stopped by admin',
    });
    const fd = fdoc.data();
    if (fd.calendarEventId) {
      try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: fd.calendarEventId }); } catch {}
    }
  }
  await batch.commit();

  // One summary email to customer
  const first = cancelled[0];
  const dateList = cancelled.map(bk => bk.cleanDate.split('-').reverse().join('/')).join(', ');
  await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, {
    to_name:        first.firstName,
    to_email:       email.toLowerCase(),
    booking_ref:    'Recurring',
    package_name:   first.packageName,
    date:           '—',
    time:           '—',
    address:        `${first.addr1}, ${first.postcode}`,
    refund_amount:  'No charge',
    refund_message: 'Your recurring cleans have been cancelled and any upcoming bookings have been removed. Please get in touch if you would like to rebook.',
  }, EMAILJS_KEY.value()).catch(() => {});

  // One summary email to admin (with dates — for your records)
  await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, {
    to_email:       'bookings@londoncleaningwizard.com',
    customer_name:  `${first.firstName} ${first.lastName}`,
    customer_email: email.toLowerCase(),
    customer_phone: first.phone || '—',
    booking_ref:    'Recurring',
    package_name:   first.packageName,
    date:           dateList,
    time:           first.cleanTime,
    address:        `${first.addr1}, ${first.postcode}`,
    refund_amount:  'No charge',
    refund_message: `Recurring cancelled by admin. ${cancelled.length} upcoming booking(s) removed: ${dateList}`,
    notice_given:   'Admin action',
  }, EMAILJS_KEY.value()).catch(() => {});

  res.json({ success: true, cancelled: futureSnap.size });
});

// ── 14. Auto-create recurring bookings (Daily scheduler) ──────
exports.createRecurringBookings = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Europe/London', secrets: [EMAILJS_KEY] },
  async () => {
    const db      = admin.firestore();
    const LEAD    = 28; // days ahead to create bookings
    const target  = new Date();
    target.setDate(target.getDate() + LEAD);
    const targetStr = target.toISOString().slice(0, 10);

    const results = { attempted: 0, created: 0, skipped: 0, failed: 0, errors: [] };

    const customersSnap = await db.collection('customers')
      .where('recurringActive', '==', true).get();

    for (const cDoc of customersSnap.docs) {
      const c     = cDoc.data();
      const email = cDoc.id;
      const freq  = c.recurringFrequency;

      if (!freq || freq === 'one-off') continue;
      if (!c.lastDate || !c.recurringTime || !c.recurringPackage) continue;

      // Calculate next booking date from the last one
      const lastDate = new Date(c.lastDate + 'T12:00:00');
      const nextDate = new Date(lastDate);
      if (freq === 'weekly')           nextDate.setDate(nextDate.getDate() + 7);
      else if (freq === 'fortnightly') nextDate.setDate(nextDate.getDate() + 14);
      else if (freq === 'monthly') {
        const originalDay = lastDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);
        // Clamp to last day of month (e.g. Jan 31 → Feb 28, not Mar 2/3)
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (originalDay > daysInMonth) nextDate.setDate(daysInMonth);
        else nextDate.setDate(originalDay);
      }
      const nextStr = nextDate.toISOString().slice(0, 10);

      if (nextStr !== targetStr) continue;

      results.attempted++;

      // Duplicate check — booking already exists for this date
      const existSnap = await db.collection('bookings')
        .where('email', '==', email)
        .where('cleanDate', '==', nextStr)
        .get();
      if (!existSnap.empty) { results.skipped++; continue; }

      try {
        const ref = `LCW-${Date.now().toString().slice(-6)}`;
        const id  = db.collection('bookings').doc().id;

        // Recurring cleans — discount applies from 2nd clean onwards
        const freqSave = FREQ_SAVINGS[freq] || 0;
        const total = Math.max(0, (c.recurringTotal || 0) - freqSave);

        const bookingData = {
          bookingRef: ref, bookingId: id,
          email,
          firstName:  c.firstName  || '', lastName: c.lastName || '',
          phone:      c.phone      || '',
          addr1:      c.addr1      || '', postcode: c.postcode || '',
          propertyType: c.recurringPropertyType || 'flat',
          floor:   c.floor   || '', parking: c.parking || '',
          bathrooms: c.bathrooms || null,
          keys:    c.keys    || '', notes:   c.notes   || '',
          hasPets: c.hasPets || false, petTypes: c.petTypes || '',
          signatureTouch: c.signatureTouch !== false,
          signatureTouchNotes: c.signatureTouchNotes || '',
          package:     c.recurringPackage,
          packageName: c.recurringPackageName,
          size:        c.recurringSize,
          frequency:   freq,
          addons:      c.recurringAddons || [],
          isAirbnb:    false,
          cleanDate:   nextStr,
          cleanTime:   c.recurringTime,
          cleanDateUTC: toUTCISO(nextStr, c.recurringTime),
          total,
          deposit:   0,
          remaining: total,
          stripeDepositIntentId: 'auto-recurring',
          stripeCustomerId:      c.stripeCustomerId || '',
          status:          'scheduled',
          isPhoneBooking:  false,
          isAutoRecurring: true,
          recurringId:     c.recurringId || '',
          source:          c.recurringSource || c.source || '',
          assignedStaff:   c.assignedStaff || '',
          mediaConsent:    c.mediaConsent === true,
          createdAt:       new Date(),
        };

        await db.runTransaction(async tx => {
          tx.set(db.collection('bookings').doc(id), bookingData);
          tx.set(db.collection('customers').doc(email), {
            lastBookingId: id, lastBookingRef: ref,
            lastDate: nextStr, lastPrice: total,
            updatedAt: new Date(),
          }, { merge: true });
        });

        // Google Calendar event
        try {
          const calendar  = await getCalendarClient();
          const slotStart = toUTCISO(nextStr, c.recurringTime);
          const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
          const calEvent  = await calendar.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            resource: {
              summary:     `${c.recurringPackageName} — ${c.firstName} ${c.lastName} (recurring)`,
              description: [
                `Ref: ${ref}`,
                `Customer: ${c.firstName} ${c.lastName}`,
                `Email: ${email}`,
                `Phone: ${c.phone || '—'}`,
                `Address: ${c.addr1}, ${c.postcode}`,
                `Property: ${c.recurringPropertyType} · ${c.recurringSize}`,
                `Frequency: ${freq}`,
                `Floor / Lift: ${c.floor || '—'}`,
                `Parking: ${c.parking || '—'}`,
                `Bathrooms: ${c.bathrooms || '—'}`,
                `Keys: ${c.keys || 'N/A'}`,
                `Add-ons: ${(c.recurringAddons||[]).map(a => a.name).join(', ') || 'None'}`,
                ...(['hourly','office_cleaning'].includes(c.recurringPackage) ? [] : [`Pets: ${c.hasPets ? `Yes — ${c.petTypes || 'not specified'}` : 'No'}`]),
                ...(c.recurringPackage === 'standard' ? [`Signature Touch: ${c.signatureTouch !== false ? 'Opted in' : `Opted out${c.signatureTouchNotes ? ` — ${c.signatureTouchNotes}` : ''}`}`] : []),
                `Cleaner: ${c.assignedStaff || 'Unassigned'}`,
                `Notes: ${c.notes || 'None'}`,
                `Media consent: ${c.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
                `Total: £${total} | No deposit — full amount charged on completion`,
                `⚙️ Auto-created by recurring scheduler`,
              ].join('\n'),
              start: { dateTime: slotStart, timeZone: 'Europe/London' },
              end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
              colorId: '5',
            },
          });
          await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
        } catch (calErr) {
          console.error('Calendar event failed for', email, calErr.message);
        }

        const recurringEmailData = buildBookingEmailData({ ...bookingData, bookingRef: ref, bookingType: 'Recurring Booking' });

        // Customer confirmation email
        await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE, {
          ...recurringEmailData,
          to_name:  c.firstName,
          to_email: email,
        }, EMAILJS_KEY.value()).catch(() => {});

        // Admin notification email
        await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE, {
          ...recurringEmailData,
          to_email:       'bookings@londoncleaningwizard.com',
          customer_name:  `${c.firstName} ${c.lastName}`,
          customer_phone: c.phone || '—',
          customer_email: email,
          booking_channel: `🔄 Auto-created recurring booking (${freq}) — deposit pending`,
        }, EMAILJS_KEY.value()).catch(() => {});


        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({ email, error: err.message });
        console.error('Failed to create recurring booking for', email, err.message);
      }
    }

    // Write run log to Firestore — always, even if nothing happened
    await db.collection('schedulerLogs').add({
      runAt:            admin.firestore.Timestamp.now(),
      targetDate:       targetStr,
      customersChecked: customersSnap.size,
      attempted:        results.attempted,
      created:          results.created,
      skipped:          results.skipped,
      failed:           results.failed,
      errors:           results.errors,
    });

    // Email alert only if there were failures
    if (results.failed > 0) {
      const errorList = results.errors.map(e => `${e.email}: ${e.error}`).join('\n');
      await sendEmail(process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE, {
        to_email:       'bookings@londoncleaningwizard.com',
        booking_ref:    `SCHEDULER — ${new Date().toLocaleDateString('en-GB')}`,
        customer_name:  'Auto Scheduler',
        customer_email: 'system',
        customer_phone: '',
        amount:         `${results.failed} booking(s) failed to create`,
        date:           targetStr.split('-').reverse().join('/'),
        error_message:  errorList,
      }, EMAILJS_KEY.value()).catch(() => {});
    }
  }
);

// ── 15. Manual trigger — fills all missing recurring bookings up to 56 days ahead ──
exports.triggerSchedulerNow = onRequest({ secrets: [EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const db     = admin.firestore();
  const LEAD   = 56; // fill 8 weeks ahead so testing shows a good range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + LEAD);

  const results = { created: 0, skipped: 0, failed: 0, errors: [] };

  const customersSnap = await db.collection('customers')
    .where('recurringActive', '==', true).get();

  for (const cDoc of customersSnap.docs) {
    const c     = cDoc.data();
    const email = cDoc.id;
    const freq  = c.recurringFrequency;

    if (!freq || freq === 'one-off') continue;
    if (!c.lastDate || !c.recurringTime || !c.recurringPackage) continue;

    const freqSave = FREQ_SAVINGS[freq] || 0;
    const total    = Math.max(0, (c.recurringTotal || 0) - freqSave);

    let lastDate    = new Date(c.lastDate + 'T12:00:00');
    let lastDateStr = c.lastDate;

    while (true) {
      const nextDate = new Date(lastDate);
      if (freq === 'weekly')           nextDate.setDate(nextDate.getDate() + 7);
      else if (freq === 'fortnightly') nextDate.setDate(nextDate.getDate() + 14);
      else if (freq === 'monthly') {
        const originalDay = lastDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(originalDay, daysInMonth));
      }
      if (nextDate > cutoff) break;

      const nextStr   = nextDate.toISOString().slice(0, 10);
      const existSnap = await db.collection('bookings')
        .where('email', '==', email).where('cleanDate', '==', nextStr).get();

      if (!existSnap.empty) { results.skipped++; lastDate = nextDate; lastDateStr = nextStr; continue; }

      try {
        const ref = `LCW-${Date.now().toString().slice(-6)}`;
        const id  = db.collection('bookings').doc().id;
        const bookingData = {
          bookingRef: ref, bookingId: id, email,
          firstName: c.firstName || '', lastName: c.lastName || '',
          phone: c.phone || '', addr1: c.addr1 || '', postcode: c.postcode || '',
          propertyType: c.recurringPropertyType || 'flat',
          floor: c.floor || '', parking: c.parking || '',
          bathrooms: c.bathrooms || null,
          keys: c.keys || '', notes: c.notes || '',
          hasPets: c.hasPets || false, petTypes: c.petTypes || '',
          signatureTouch: c.signatureTouch !== false,
          signatureTouchNotes: c.signatureTouchNotes || '',
          package: c.recurringPackage, packageName: c.recurringPackageName,
          size: c.recurringSize, frequency: freq,
          addons: c.recurringAddons || [], isAirbnb: false,
          cleanDate: nextStr, cleanTime: c.recurringTime,
          cleanDateUTC: toUTCISO(nextStr, c.recurringTime),
          total, deposit: 0, remaining: total,
          stripeDepositIntentId: 'auto-recurring',
          stripeCustomerId: c.stripeCustomerId || '',
          status: 'scheduled', isPhoneBooking: false,
          isAutoRecurring: true, source: c.recurringSource || c.source || '',
          recurringId: c.recurringId || '',
          mediaConsent: c.mediaConsent === true,
          createdAt: new Date(),
        };

        await db.runTransaction(async tx => {
          tx.set(db.collection('bookings').doc(id), bookingData);
          tx.set(db.collection('customers').doc(email), {
            lastBookingId: id, lastBookingRef: ref,
            lastDate: nextStr, lastPrice: total, updatedAt: new Date(),
          }, { merge: true });
        });

        try {
          const cal       = await getCalendarClient();
          const slotStart = toUTCISO(nextStr, c.recurringTime);
          const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
          const calEvent  = await cal.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            resource: {
              summary: `${c.recurringPackageName} — ${c.firstName} ${c.lastName} (recurring)`,
              description: [`Ref: ${ref}`, `Customer: ${c.firstName} ${c.lastName}`, `Email: ${email}`, `Total: £${total} | No deposit — charged on completion`, `⚙️ Manual trigger`].join('\n'),
              start: { dateTime: slotStart, timeZone: 'Europe/London' },
              end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
              colorId: '5',
            },
          });
          await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
        } catch {}

        results.created++;
        lastDate    = nextDate;
        lastDateStr = nextStr;
      } catch (err) {
        results.failed++;
        results.errors.push({ email, date: nextStr, error: err.message });
        break; // stop this customer on error, move to next
      }
    }
  }

  await db.collection('schedulerLogs').add({
    runAt: admin.firestore.Timestamp.now(),
    targetDate: cutoff.toISOString().slice(0, 10),
    customersChecked: customersSnap.size,
    attempted: results.created + results.failed,
    created: results.created, skipped: results.skipped,
    failed: results.failed, errors: results.errors,
    triggeredManually: true,
  });

  res.json({ success: true, ...results });
});

// ── 16. Get fully-blocked dates for a month ───────────────────
// Returns dates that have ANY event on the availability calendar (all-day or timed).
// The booking form uses this to gray out entire days before the customer picks one.
exports.getBlockedDates = onRequest(async (req, res) => {
  if (!guard(req, res, 'GET')) return;
  const { year, month } = req.query; // month is 1-based
  if (!year || !month || isNaN(year) || isNaN(month)) {
    res.status(400).json({ error: 'Invalid year or month' }); return;
  }
  const y = parseInt(year), m = parseInt(month) - 1;
  const timeMin = new Date(y, m, 1).toISOString();
  const timeMax = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
  try {
    const calendar = await getCalendarClient('https://www.googleapis.com/auth/calendar.readonly');
    const { data } = await calendar.events.list({
      calendarId:   process.env.GOOGLE_AVAILABILITY_CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
    });
    const blocked = [...new Set((data.items || []).map(e => {
      // All-day event: start.date e.g. "2026-04-05"
      if (e.start.date) return e.start.date;
      // Timed event: extract the date portion from start.dateTime
      return new Date(e.start.dateTime).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    }))];
    res.json({ blocked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Set / unset a blocked date on the availability calendar ───────
exports.setBlockedDate = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { date, blocked, reason } = req.body;
  if (!date || typeof blocked !== 'boolean') {
    res.status(400).json({ error: 'date (YYYY-MM-DD) and blocked (boolean) required' }); return;
  }
  const [y, m, d] = date.split('-').map(Number);
  try {
    const calendar = await getCalendarClient();
    if (blocked) {
      // Create all-day event on the availability calendar
      const nextDay = `${y}-${String(m).padStart(2,'0')}-${String(d + 1).padStart(2,'0')}`;
      // Handle month overflow for end date
      const endDate = new Date(y, m - 1, d + 1);
      const endStr = endDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const event = await calendar.events.insert({
        calendarId: process.env.GOOGLE_AVAILABILITY_CALENDAR_ID,
        resource: {
          summary: reason || 'Unavailable',
          start: { date },
          end:   { date: endStr },
        },
      });
      res.json({ success: true, eventId: event.data.id });
    } else {
      // Find and delete all events on this date from the availability calendar
      const timeMin = new Date(y, m - 1, d).toISOString();
      const timeMax = new Date(y, m - 1, d, 23, 59, 59).toISOString();
      const { data } = await calendar.events.list({
        calendarId:   process.env.GOOGLE_AVAILABILITY_CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
      });
      await Promise.all((data.items || []).map(e =>
        calendar.events.delete({ calendarId: process.env.GOOGLE_AVAILABILITY_CALENDAR_ID, eventId: e.id })
      ));
      res.json({ success: true, removed: (data.items || []).length });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 16. Stripe webhook — fallback if browser closes after payment ─
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_KEY, STRIPE_WEBHOOK_SECRET, EMAILJS_KEY], rawBody: true },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).end(); return; }
    let event;
    try {
      const stripe = new Stripe(STRIPE_KEY.value());
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'],
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (e) {
      res.status(400).send(`Webhook signature failed: ${e.message}`); return;
    }

    // ── Handle manual refunds done directly in Stripe dashboard ──
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      // Partial refund (amount refunded is less than total charge) — ignore
      if (charge.amount_refunded < charge.amount) {
        res.json({ received: true }); return;
      }
      const pi     = charge.payment_intent;
      if (pi) {
        const db   = admin.firestore();
        let snap = await db.collection('bookings').where('stripeDepositIntentId', '==', pi).limit(1).get();
        if (snap.empty) snap = await db.collection('bookings').where('stripeRemainingIntentId', '==', pi).limit(1).get();
        if (snap.empty && charge.metadata?.bookingRef) snap = await db.collection('bookings').where('bookingRef', '==', charge.metadata.bookingRef).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const b   = doc.data();
          if (!b.status?.startsWith('cancelled')) {
            const refundAmt = charge.amount_refunded / 100;
            await doc.ref.update({
              status:       'cancelled_full_refund',
              refundAmount: refundAmt,
              cancelledAt:  new Date(),
              cancellationReason: 'Refunded via Stripe dashboard',
            });
            if (b.calendarEventId) {
              try { const cal = await getCalendarClient(); await cal.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId }); } catch(e) { console.error('Calendar delete failed:', e.message); }
            }
          }
        }
      }
      res.json({ received: true }); return;
    }

    if (event.type !== 'payment_intent.succeeded') { res.json({ received: true }); return; }

    const pi        = event.data.object;
    const bookingId = pi.metadata?.bookingId;
    const db        = admin.firestore();

    // ── Admin deposit payment flow ──
    if (bookingId) {
      const snap = await db.collection('bookings').doc(bookingId).get();
      if (!snap.exists) { res.json({ received: true }); return; }
      const b = snap.data();
      if (b.status !== 'pending_deposit') { res.json({ received: true }); return; }
      const customerId = b.pendingDepositCustomerId || pi.customer;
      await snap.ref.update({
        status:                     'deposit_paid',
        stripeDepositIntentId:      pi.id,
        stripeCustomerId:           customerId,
        depositPaidAt:              new Date(),
        pendingDepositClientSecret: admin.firestore.FieldValue.delete(),
        pendingDepositCustomerId:   admin.firestore.FieldValue.delete(),
        pendingDepositPIId:         admin.firestore.FieldValue.delete(),
      });
      const eData = buildBookingEmailData({ ...b, stripeDepositIntentId: pi.id, stripeCustomerId: customerId });
      await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
        { ...eData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
        { ...eData, to_email: 'bookings@londoncleaningwizard.com',
          customer_name: `${b.firstName} ${b.lastName}`,
          customer_phone: b.phone, customer_email: b.email },
        EMAILJS_KEY.value()).catch(() => {});
      res.json({ received: true }); return;
    }

    // ── Customer booking fallback — fires if browser closed after payment ──
    const piId       = pi.id;
    const pendingRef = db.collection('pendingBookings').doc(piId);
    const ref        = `LCW-${Date.now().toString().slice(-6)}`;
    const id         = db.collection('bookings').doc().id;
    let claimed = false;
    let pd      = null;
    let wh_recurringId = null;

    await db.runTransaction(async tx => {
      const pendingSnap = await tx.get(pendingRef);
      if (!pendingSnap.exists) { claimed = false; return; }

      pd = pendingSnap.data();
      wh_recurringId = (pd.frequency && pd.frequency !== 'one-off') ? 'RS' + Date.now().toString(36).toUpperCase() : null;

      const bRef  = db.collection('bookings').doc(id);
      const cRef  = db.collection('customers').doc(pd.email.toLowerCase());
      const cSnap = await tx.get(cRef);
      const count = cSnap.exists ? (cSnap.data().bookingCount || 0) : 0;

      tx.delete(pendingRef);
      tx.set(bRef, {
        bookingRef: ref, bookingId: id,
        email: pd.email.toLowerCase(), firstName: clean(pd.firstName), lastName: clean(pd.lastName),
        phone: clean(pd.phone), addr1: clean(pd.addr1), postcode: clean(pd.postcode).toUpperCase(),
        propertyType: pd.propertyType, floor: clean(pd.floor||''), parking: clean(pd.parking||''),
        bathrooms: pd.bathrooms || null,
        keys: clean(pd.keys||''), notes: clean(pd.notes||''),
        hasPets: pd.hasPets || false, petTypes: clean(pd.petTypes||''),
        signatureTouch: pd.signatureTouch !== false, signatureTouchNotes: clean(pd.signatureTouchNotes||''),
        package: pd.package, packageName: pd.packageName, size: pd.size,
        frequency: pd.frequency || 'one-off', addons: pd.addons || [], isAirbnb: pd.isAirbnb || false,
        supplies: pd.supplies || 'customer', suppliesFee: pd.suppliesFee || null,
        cleanDate: pd.cleanDate, cleanTime: pd.cleanTime,
        cleanDateUTC: toUTCISO(pd.cleanDate, pd.cleanTime),
        total: pd.total, deposit: pd.deposit, remaining: pd.remaining,
        ...(pd.launchDiscount ? { launchDiscount: pd.launchDiscount, originalTotal: pd.originalTotal } : {}),
        ...(pd.mediaConsentDiscount ? { mediaConsentDiscount: pd.mediaConsentDiscount } : {}),
        stripeDepositIntentId: piId,
        stripeCustomerId: pd.stripeCustomerId || pi.customer || '',
        status: 'deposit_paid', isPhoneBooking: false,
        source: clean(pd.source||''), createdAt: new Date(),
        marketingOptOut: pd.marketingOptOut === true,
        doNotContact:    pd.marketingOptOut === true,
        mediaConsent:    pd.mediaConsent === true,
        recurringId:     wh_recurringId || '',
      });
      tx.set(cRef, {
        firstName: clean(pd.firstName), lastName: clean(pd.lastName), phone: clean(pd.phone),
        addr1: clean(pd.addr1), postcode: clean(pd.postcode).toUpperCase(),
        floor: clean(pd.floor||''), parking: clean(pd.parking||''),
        bathrooms: pd.bathrooms || null,
        keys: clean(pd.keys||''), notes: clean(pd.notes||''),
        hasPets: pd.hasPets || false, petTypes: clean(pd.petTypes||''),
        signatureTouch: pd.signatureTouch !== false, signatureTouchNotes: clean(pd.signatureTouchNotes||''),
        bookingCount: count + 1, lastBookingId: id, lastBookingRef: ref,
        lastPackage: pd.package, lastPackageName: pd.packageName, lastSize: pd.size,
        lastPrice: pd.total, lastDate: pd.cleanDate, lastCleaner: '',
        source: clean(pd.source||''),
        mediaConsent: pd.mediaConsent === true,
        updatedAt: new Date(),
        ...(cSnap.exists ? {} : { firstBookingDate: new Date() }),
        stripeCustomerId: pd.stripeCustomerId || pi.customer || '',
        ...(pd.frequency && pd.frequency !== 'one-off' ? {
          recurringActive:       true,
          recurringFrequency:    pd.frequency,
          recurringDay:          new Date(pd.cleanDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' }),
          recurringTime:         pd.cleanTime,
          recurringPackage:      pd.package,
          recurringPackageName:  pd.packageName,
          recurringSize:         pd.size,
          recurringAddons:       pd.addons || [],
          recurringPropertyType: pd.propertyType,
          recurringTotal:        pd.recurringTotal || pd.originalTotal || pd.total,
          recurringDeposit:      pd.deposit,
          recurringRemaining:    pd.remaining,
          recurringSource:       clean(pd.source||''),
          recurringId:           wh_recurringId,
        } : {}),
      }, { merge: true });

      claimed = true;
    });

    if (!claimed) { res.json({ received: true }); return; }

    // Pre-create recurring follow-up bookings within 28-day window
    if (pd.frequency && pd.frequency !== 'one-off') {
      try {
        const freqSave        = FREQ_SAVINGS[pd.frequency] || 0;
        const discountedTotal = Math.max(0, (pd.recurringTotal || pd.total) - freqSave);

        const LEAD       = 28;
        const firstClean = new Date(pd.cleanDate + 'T12:00:00');
        const cutoff     = new Date(firstClean); cutoff.setDate(cutoff.getDate() + LEAD);

        let lastDate    = new Date(pd.cleanDate + 'T12:00:00');
        let lastDateStr = pd.cleanDate;

        while (true) {
          const nextDate = new Date(lastDate);
          if (pd.frequency === 'weekly')           nextDate.setDate(nextDate.getDate() + 7);
          else if (pd.frequency === 'fortnightly') nextDate.setDate(nextDate.getDate() + 14);
          else if (pd.frequency === 'monthly') {
            const originalDay = lastDate.getDate();
            nextDate.setMonth(nextDate.getMonth() + 1);
            const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            nextDate.setDate(Math.min(originalDay, daysInMonth));
          }
          if (nextDate > cutoff) break;

          const nextStr   = nextDate.toISOString().slice(0, 10);
          const existSnap = await db.collection('bookings')
            .where('email', '==', pd.email.toLowerCase())
            .where('cleanDate', '==', nextStr).get();

          if (existSnap.empty) {
            const rRef = `LCW-${Date.now().toString().slice(-6)}`;
            const rId  = db.collection('bookings').doc().id;
            const recurringData = {
              bookingRef: rRef, bookingId: rId,
              email: pd.email.toLowerCase(),
              firstName: clean(pd.firstName), lastName: clean(pd.lastName),
              phone: clean(pd.phone), addr1: clean(pd.addr1), postcode: clean(pd.postcode).toUpperCase(),
              propertyType: pd.propertyType,
              floor: clean(pd.floor||''), parking: clean(pd.parking||''),
              keys: clean(pd.keys||''), notes: clean(pd.notes||''),
              hasPets: pd.hasPets || false, petTypes: clean(pd.petTypes||''),
              signatureTouch: pd.signatureTouch !== false,
              signatureTouchNotes: clean(pd.signatureTouchNotes||''),
              package: pd.package, packageName: pd.packageName,
              size: pd.size, frequency: pd.frequency,
              addons: pd.addons || [], isAirbnb: false,
              cleanDate: nextStr, cleanTime: pd.cleanTime,
              cleanDateUTC: toUTCISO(nextStr, pd.cleanTime),
              total: discountedTotal, deposit: 0, remaining: discountedTotal,
              stripeDepositIntentId: 'auto-recurring',
              stripeCustomerId: pd.stripeCustomerId || pi.customer || '',
              status: 'scheduled', isPhoneBooking: false,
              isAutoRecurring: true, source: clean(pd.source||''),
              mediaConsent: pd.mediaConsent === true,
              recurringId: wh_recurringId || '',
              createdAt: new Date(),
            };
            await db.collection('bookings').doc(rId).set(recurringData);
            try {
              const cal      = await getCalendarClient();
              const slotStart = toUTCISO(nextStr, pd.cleanTime);
              const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
              const calEvent  = await cal.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                resource: {
                  summary: `${pd.packageName} — ${pd.firstName} ${pd.lastName} (recurring)`,
                  description: [
                    `Ref: ${rRef}`,
                    `Customer: ${pd.firstName} ${pd.lastName}`,
                    `Email: ${pd.email}`, `Phone: ${pd.phone}`,
                    `Address: ${pd.addr1}, ${pd.postcode}`,
                    `Property: ${pd.propertyType} · ${pd.size}`,
                    `Frequency: ${pd.frequency}`,
                    `Floor / Lift: ${pd.floor || '—'}`, `Parking: ${pd.parking || '—'}`, `Bathrooms: ${pd.bathrooms || '—'}`,
                    `Keys: ${pd.keys || 'N/A'}`,
                    `Add-ons: ${(pd.addons||[]).map(a => a.name).join(', ') || 'None'}`,
                    `Supplies: ${pd.supplies === 'cleaner' ? `Cleaner brings (+£${pd.suppliesFee || 8})` : 'Customer provides'}`,
                    ...(['hourly','office_cleaning'].includes(pd.package) ? [] : [`Pets: ${pd.hasPets ? `Yes — ${pd.petTypes || 'not specified'}` : 'No'}`]),
                    ...(pd.package === 'standard' ? [`Signature Touch: ${pd.signatureTouch !== false ? 'Opted in' : `Opted out${pd.signatureTouchNotes ? ` — ${pd.signatureTouchNotes}` : ''}`}`] : []),
                    `Cleaner: ${pd.assignedStaff || 'Unassigned'}`,
                    `Notes: ${pd.notes || 'None'}`,
                    `Media consent: ${pd.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
                    `Total: £${parseFloat(pd.total||0).toFixed(2)} | No deposit — full amount charged on completion`,
                    `⚙️ Auto-created at booking time (pre-scheduled)`,
                  ].join('\n'),
                  start: { dateTime: slotStart, timeZone: 'Europe/London' },
                  end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
                  colorId: '5',
                },
              });
              await db.collection('bookings').doc(rId).update({ calendarEventId: calEvent.data.id });
            } catch (calErr) {
              console.error('Webhook: Calendar event failed for pre-scheduled recurring:', calErr.message);
            }
            lastDateStr = nextStr;
          }
          lastDate = nextDate;
        }

        if (lastDateStr !== pd.cleanDate) {
          await db.collection('customers').doc(pd.email.toLowerCase()).update({
            lastDate: lastDateStr, updatedAt: new Date(),
          });
        }
      } catch (recurErr) {
        console.error('Webhook: Failed to pre-create recurring bookings:', recurErr.message);
      }
    }

    try {
      const calendar  = await getCalendarClient();
      const slotStart = toUTCISO(pd.cleanDate, pd.cleanTime);
      const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
      const calEvent  = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: {
          summary:     `${pd.packageName} — ${pd.firstName} ${pd.lastName}`,
          description: [
            `Ref: ${ref}`,
            `Customer: ${pd.firstName} ${pd.lastName}`,
            `Email: ${pd.email}`,
            `Phone: ${pd.phone}`,
            `Address: ${pd.addr1}, ${pd.postcode}`,
            `Property: ${pd.propertyType} · ${pd.size}`,
            `Frequency: ${pd.frequency || 'One-off'}`,
            `Floor / Lift: ${pd.floor || '—'}`,
            `Parking: ${pd.parking || '—'}`,
            `Bathrooms: ${pd.bathrooms || '—'}`,
            `Keys: ${pd.keys || 'N/A'}`,
            `Add-ons: ${(pd.addons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Supplies: ${pd.supplies === 'cleaner' ? `Cleaner brings (+£${pd.suppliesFee || 8})` : 'Customer provides'}`,
            ...(['hourly','office_cleaning'].includes(pd.package) ? [] : [`Pets: ${pd.hasPets ? `Yes — ${pd.petTypes || 'not specified'}` : 'No'}`]),
            ...(pd.package === 'standard' ? [`Signature Touch: ${pd.signatureTouch !== false ? 'Opted in' : `Opted out${pd.signatureTouchNotes ? ` — ${pd.signatureTouchNotes}` : ''}`}`] : []),
            `Cleaner: ${pd.assignedStaff || 'Unassigned'}`,
            `Notes: ${pd.notes || 'None'}`,
            `Media consent: ${pd.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
            `Marketing opt-in: ${pd.marketingOptOut ? 'Opted out' : 'Opted in'}`,
            `Total: £${parseFloat(pd.total||0).toFixed(2)} | Deposit: £${parseFloat(pd.deposit||0).toFixed(2)} | Remaining: £${parseFloat(pd.remaining||0).toFixed(2)}`,
          ].join('\n'),
          start: { dateTime: slotStart, timeZone: 'Europe/London' },
          end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
          colorId: calColorId('deposit_paid', pd.frequency),
        },
      });
      await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
    } catch (e) {
      console.error('Webhook: Failed to create calendar event:', e.message);
    }

    const eData = buildBookingEmailData({ ...pd, bookingRef: ref, stripeDepositIntentId: piId, stripeCustomerId: pd.stripeCustomerId || pi.customer });
    await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
      { ...eData, to_name: pd.firstName, to_email: pd.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
      { ...eData, to_email: 'bookings@londoncleaningwizard.com',
        customer_name: `${pd.firstName} ${pd.lastName}`,
        customer_phone: pd.phone, customer_email: pd.email },
      EMAILJS_KEY.value()).catch(() => {});

    res.json({ received: true });
  }
);

// ── 17a. Convert one-off customer to recurring ────────────────
exports.convertToRecurring = onRequest({ secrets: [STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const db = admin.firestore();
  const { email, frequency, cleanDate, cleanTime, lastBookingId, packageId, packageName, total: passedTotal } = req.body;
  if (!email || !frequency || !cleanDate || !cleanTime || !lastBookingId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const lbDoc = await db.collection('bookings').doc(lastBookingId).get();
  if (!lbDoc.exists) return res.status(404).json({ error: 'Booking not found.' });
  const lb = lbDoc.data();

  // Prevent duplicate: if an auto-recurring booking already exists on this date for this customer, bail out
  const dupSnap = await db.collection('bookings')
    .where('email', '==', email.toLowerCase())
    .where('cleanDate', '==', cleanDate)
    .where('isAutoRecurring', '==', true)
    .get();
  if (!dupSnap.empty) return res.status(409).json({ error: 'A recurring booking already exists for that date.' });

  const custRef = db.collection('customers').doc(email.toLowerCase());
  const custDoc = await custRef.get();
  const c = custDoc.data() || {};

  const freqSave    = FREQ_SAVINGS[frequency] || 0;
  const rawTotal    = passedTotal !== undefined ? parseFloat(passedTotal) : Math.max(0, (parseFloat(lb.total) || 0) - freqSave);
  const total       = Math.round(rawTotal * 100) / 100;
  const pkgId       = packageId   || lb.package;
  const pkgName     = packageName || lb.packageName;
  const ref         = `LCW-${Date.now().toString().slice(-6)}`;
  const id          = db.collection('bookings').doc().id;
  const recurringDay = new Date(cleanDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });

  const bookingData = {
    bookingRef: ref, bookingId: id,
    email: email.toLowerCase(),
    firstName: lb.firstName || '', lastName: lb.lastName || '',
    phone: lb.phone || '',
    addr1: lb.addr1 || '', postcode: lb.postcode || '',
    propertyType: lb.propertyType || 'flat',
    floor: lb.floor || '', parking: lb.parking || '',
    keys: lb.keys || '', notes: lb.notes || '',
    hasPets: lb.hasPets || false, petTypes: lb.petTypes || '',
    signatureTouch: lb.signatureTouch !== false,
    signatureTouchNotes: lb.signatureTouchNotes || '',
    package: pkgId, packageName: pkgName,
    size: lb.size, frequency,
    addons: lb.addons || [],
    supplies: lb.supplies || '',
    suppliesFee: lb.suppliesFee || 0,
    bathrooms: lb.bathrooms || null,
    isAirbnb: false,
    cleanDate, cleanTime,
    cleanDateUTC: toUTCISO(cleanDate, cleanTime),
    total, deposit: 0, remaining: total,
    stripeDepositIntentId: 'auto-recurring',
    stripeCustomerId: c.stripeCustomerId || lb.stripeCustomerId || '',
    status: 'scheduled',
    isPhoneBooking: false,
    isAutoRecurring: true,
    convertedFromOneOff: true,
    source: lb.source || '',
    assignedStaff: c.assignedStaff || lb.assignedStaff || '',
    createdAt: new Date(),
  };

  const profileUpdates = {
    recurringActive: true,
    recurringId:     'RS' + Date.now().toString(36).toUpperCase(),
    recurringFrequency: frequency,
    recurringDay,
    recurringTime: cleanTime,
    recurringPackage: pkgId,
    recurringPackageName: pkgName,
    recurringSize: lb.size,
    recurringTotal: total + freqSave,
    recurringAddons: [],
    recurringPropertyType: lb.propertyType || 'flat',
    lastDate: cleanDate,
    lastPrice: total,
    lastBookingId: id,
    lastBookingRef: ref,
    convertedAt: new Date(),
    updatedAt: new Date(),
  };

  await db.runTransaction(async tx => {
    tx.set(db.collection('bookings').doc(id), bookingData);
    tx.set(custRef, profileUpdates, { merge: true });
  });

  try {
    const calendar  = await getCalendarClient();
    const slotStart = toUTCISO(cleanDate, cleanTime);
    const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
    const calEvent  = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: {
        summary: `${pkgName} — ${lb.firstName} ${lb.lastName} (converted recurring)`,
        description: [
          `Ref: ${ref}`,
          `Customer: ${lb.firstName} ${lb.lastName}`,
          `Email: ${email}`,
          `Phone: ${lb.phone || '—'}`,
          `Address: ${lb.addr1}, ${lb.postcode}`,
          `Property: ${lb.propertyType} · ${lb.size}`,
          `Frequency: ${frequency}`,
          `Floor / Lift: ${lb.floor || '—'}`,
          `Parking: ${lb.parking || '—'}`,
          `Bathrooms: ${lb.bathrooms || '—'}`,
          `Keys: ${lb.keys || 'N/A'}`,
          `Add-ons: ${(lb.addons||[]).map(a => a.name).join(', ') || 'None'}`,
          `Supplies: ${lb.supplies === 'cleaner' ? `Cleaner brings (+£${lb.suppliesFee || 8})` : 'Customer provides'}`,
          ...(['hourly','office_cleaning'].includes(pkgId) ? [] : [`Pets: ${lb.hasPets ? `Yes — ${lb.petTypes || 'not specified'}` : 'No'}`]),
          ...(pkgId === 'standard' ? [`Signature Touch: ${lb.signatureTouch !== false ? 'Opted in' : `Opted out${lb.signatureTouchNotes ? ` — ${lb.signatureTouchNotes}` : ''}`}`] : []),
          `Cleaner: ${c.assignedStaff || lb.assignedStaff || 'Unassigned'}`,
          `Notes: ${lb.notes || 'None'}`,
          `Media consent: ${lb.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
          `Total: £${total.toFixed(2)} | Converted from one-off — full amount charged on completion`,
          `Saving: £${freqSave} per clean`,
          `Converted from one-off to recurring by admin`,
        ].join('\n'),
        start: { dateTime: slotStart, timeZone: 'Europe/London' },
        end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
        colorId: '5',
      },
    });
    await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
  } catch (calErr) {
    console.error('Calendar event failed for convertToRecurring:', calErr.message);
  }

  // Pre-create all recurring follow-up bookings within the 35-day window
  // 35 days (not 28) so monthly bookings always get at least 1 follow-up pre-created
  try {
    const LEAD       = 35;
    const firstClean = new Date(cleanDate + 'T12:00:00');
    const cutoff     = new Date(firstClean); cutoff.setDate(cutoff.getDate() + LEAD);
    let   lastDate   = new Date(cleanDate + 'T12:00:00');

    while (true) {
      const nextDate = new Date(lastDate);
      if (frequency === 'weekly')           nextDate.setDate(nextDate.getDate() + 7);
      else if (frequency === 'fortnightly') nextDate.setDate(nextDate.getDate() + 14);
      else if (frequency === 'monthly') {
        const originalDay = lastDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);
        const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(originalDay, daysInMonth));
      }
      if (nextDate > cutoff) break;

      const nextStr   = nextDate.toISOString().slice(0, 10);
      const existSnap = await db.collection('bookings')
        .where('email', '==', email.toLowerCase())
        .where('cleanDate', '==', nextStr)
        .get();

      if (existSnap.empty) {
        const rRef = `LCW-${Date.now().toString().slice(-6)}`;
        const rId  = db.collection('bookings').doc().id;
        const recurringData = {
          bookingRef: rRef, bookingId: rId,
          email: email.toLowerCase(),
          firstName: lb.firstName || '', lastName: lb.lastName || '',
          phone: lb.phone || '', addr1: lb.addr1 || '', postcode: lb.postcode || '',
          propertyType: lb.propertyType || 'flat',
          floor: lb.floor || '', parking: lb.parking || '',
          keys: lb.keys || '', notes: lb.notes || '',
          hasPets: lb.hasPets || false, petTypes: lb.petTypes || '',
          signatureTouch: lb.signatureTouch !== false,
          signatureTouchNotes: lb.signatureTouchNotes || '',
          package: pkgId, packageName: pkgName,
          size: lb.size, frequency,
          addons: lb.addons || [],
          supplies: lb.supplies || '', suppliesFee: lb.suppliesFee || 0,
          bathrooms: lb.bathrooms || null,
          isAirbnb: false,
          cleanDate: nextStr, cleanTime,
          cleanDateUTC: toUTCISO(nextStr, cleanTime),
          total, deposit: 0, remaining: total,
          stripeDepositIntentId: 'auto-recurring',
          stripeCustomerId: c.stripeCustomerId || lb.stripeCustomerId || '',
          status: 'scheduled',
          isPhoneBooking: false,
          isAutoRecurring: true,
          convertedFromOneOff: true,
          source: lb.source || '',
          assignedStaff: c.assignedStaff || lb.assignedStaff || '',
          recurringId: profileUpdates.recurringId || '',
          mediaConsent: lb.mediaConsent === true,
          createdAt: new Date(),
        };
        await db.collection('bookings').doc(rId).set(recurringData);
        try {
          const cal      = await getCalendarClient();
          const slotStart = toUTCISO(nextStr, cleanTime);
          const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
          const calEvent  = await cal.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            resource: {
              summary: `${pkgName} — ${lb.firstName} ${lb.lastName} (recurring)`,
              description: [
                `Ref: ${rRef}`,
                `Customer: ${lb.firstName} ${lb.lastName}`,
                `Email: ${email}`, `Phone: ${lb.phone || '—'}`,
                `Address: ${lb.addr1}, ${lb.postcode}`,
                `Frequency: ${frequency}`,
                `Cleaner: ${c.assignedStaff || lb.assignedStaff || 'Unassigned'}`,
                `Total: £${total.toFixed(2)} | No deposit — full amount charged on completion`,
                `⚙️ Auto-created at conversion time (pre-scheduled)`,
              ].join('\n'),
              start: { dateTime: slotStart, timeZone: 'Europe/London' },
              end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
              colorId: '5',
            },
          });
          await db.collection('bookings').doc(rId).update({ calendarEventId: calEvent.data.id });
        } catch (calErr) {
          console.error('Calendar event failed for pre-scheduled converted recurring:', calErr.message);
        }
      }
      lastDate = nextDate;
    }
  } catch (preCreateErr) {
    console.error('Pre-create follow-ups failed in convertToRecurring:', preCreateErr.message);
  }

  if (process.env.EMAILJS_CONFIRM_TEMPLATE) {
    await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE, {
      to_name:      lb.firstName,
      to_email:     email,
      booking_ref:  ref,
      package_name: pkgName,
      date:         cleanDate.split('-').reverse().join('/'),
      time:         cleanTime,
      address:      `${lb.addr1}, ${lb.postcode}`,
      frequency,
      total:        `£${total.toFixed(2)}`,
      supplies:     lb.supplies === 'cleaner' ? `Cleaner brings supplies (+£${lb.suppliesFee || 8})` : 'Customer provides supplies',
      booking_type: 'Recurring Booking',
      recurring_note: `You are now on a ${frequency} recurring service. You are saving £${freqSave} per clean. No deposit is required — the full amount will be charged automatically once your clean is marked as complete.`,
    }, EMAILJS_KEY.value()).catch(e => console.error('Confirm email failed:', e.message));
  }

  res.json({ success: true, bookingId: id, bookingRef: ref });
});

// ── 17b. Send recurring upgrade emails on day 5 after a one-off clean ──
exports.sendRecurringUpgradeEmails = onSchedule(
  { schedule: 'every day 10:05', timeZone: 'Europe/London', secrets: [EMAILJS_KEY] },
  async () => {
    const db       = admin.firestore();
    const template = process.env.EMAILJS_RECURRING_UPGRADE_TEMPLATE;
    if (!template) return;

    const fiveDaysAgo    = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    const snap = await db.collection('bookings')
      .where('status', '==', 'fully_paid')
      .where('cleanDate', '==', fiveDaysAgoStr)
      .get();

    const unsubSnap = await db.collection('unsubscribed').get();
    const unsubbed  = new Set(unsubSnap.docs.map(d => d.id));

    const hourlyTemplate     = process.env.EMAILJS_RECURRING_UPGRADE_HOURLY_TEMPLATE;
    const commercialTemplate = process.env.EMAILJS_RECURRING_UPGRADE_COMMERCIAL_TEMPLATE;
    const airbnbTemplate     = process.env.EMAILJS_RECURRING_UPGRADE_AIRBNB_TEMPLATE;
    const COMMERCIAL_PACKAGES = ['office_cleaning'];

    for (const doc of snap.docs) {
      const b = doc.data();
      if (b.isAutoRecurring || b.marketingOptOut || b.doNotContact) continue;
      if (!b.email || !b.firstName) continue;
      if (unsubbed.has(b.email.toLowerCase())) continue;

      const custDoc = await db.collection('customers').doc(b.email.toLowerCase()).get();
      const cust = custDoc.data() || {};
      if (cust.recurringActive || cust.recurringUpgradeEmailSent) continue;

      const isHourly     = b.package === 'hourly';
      const isCommercial = COMMERCIAL_PACKAGES.includes(b.package);

      if (b.isAirbnb && b.frequency === 'one-off') {
        if (!airbnbTemplate) continue;
        await sendEmail(airbnbTemplate, {
          to_name:         b.firstName,
          to_email:        b.email,
          package_name:    b.packageName,
          unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(b.email)}`,
        }, EMAILJS_KEY.value()).catch(e => console.error('Airbnb upgrade email failed:', b.bookingRef, e.message));
      } else if (isHourly) {
        if (!hourlyTemplate) continue;
        await sendEmail(hourlyTemplate, {
          to_name:         b.firstName,
          to_email:        b.email,
          package_name:    b.packageName,
          days_remaining:  25,
          unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(b.email)}`,
        }, EMAILJS_KEY.value()).catch(e => console.error('Hourly upgrade email failed:', b.bookingRef, e.message));
      } else if (isCommercial) {
        if (!commercialTemplate) continue;
        await sendEmail(commercialTemplate, {
          to_name:         b.firstName,
          to_email:        b.email,
          package_name:    b.packageName,
          booking_url:     'https://londoncleaningwizard.com',
          unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(b.email)}`,
        }, EMAILJS_KEY.value()).catch(e => console.error('Commercial upgrade email failed:', b.bookingRef, e.message));
      } else {
        // Look up current live price for this package + size + property type
        const pkgPrices  = PACKAGE_BASE_PRICES[b.package];
        const sizePrice  = pkgPrices?.[b.size];
        if (!sizePrice) continue; // unknown package/size — skip
        const multiplier = b.propertyType === 'house' ? HOUSE_MULTIPLIER : 1;
        const basePrice  = Math.round(sizePrice * multiplier);

        const weeklyPrice      = `£${(basePrice - 30).toFixed(2)}`;
        const fortnightlyPrice = `£${(basePrice - 15).toFixed(2)}`;
        const monthlyPrice     = `£${(basePrice - 7).toFixed(2)}`;

        await sendEmail(template, {
          to_name:            b.firstName,
          to_email:           b.email,
          package_name:       b.packageName,
          days_remaining:     25,
          weekly_price:       weeklyPrice,
          fortnightly_price:  fortnightlyPrice,
          monthly_price:      monthlyPrice,
          booking_url:        'https://londoncleaningwizard.com',
          unsubscribe_url:    `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(b.email)}`,
        }, EMAILJS_KEY.value()).catch(e => console.error('Upgrade email failed:', b.bookingRef, e.message));
      }

      await db.collection('customers').doc(b.email.toLowerCase())
        .set({ recurringUpgradeEmailSent: true }, { merge: true }).catch(() => {});
    }
  }
);

// ── 17. Send review request emails at 10am for yesterday's completed jobs ──
exports.sendReviewEmails = onSchedule({ schedule: 'every day 10:00', secrets: [EMAILJS_KEY] }, async () => {
  const db        = admin.firestore();
  const template  = process.env.EMAILJS_REVIEW_TEMPLATE;
  if (!template) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const snap = await db.collection('bookings')
    .where('status', '==', 'fully_paid')
    .where('cleanDate', '==', yesterdayStr)
    .get();

  const unsubSnap = await db.collection('unsubscribed').get();
  const unsubbed  = new Set(unsubSnap.docs.map(d => d.id));

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  for (const doc of snap.docs) {
    const b = doc.data();
    if (!b.email || !b.firstName) continue;
    if (b.marketingOptOut || b.doNotContact) continue;
    if (b.isContractVisit) continue;
    if (unsubbed.has(b.email.toLowerCase())) continue;

    const custDoc = await db.collection('customers').doc(b.email.toLowerCase()).get();
    const cust    = custDoc.data() || {};

    if (cust.noReviewEmails) continue;

    if (b.isAutoRecurring) {
      const lastSent = cust.lastReviewEmailSentAt?.toDate ? cust.lastReviewEmailSentAt.toDate() : null;
      if (lastSent && (Date.now() - lastSent.getTime()) < THIRTY_DAYS) continue;
    }

    await sendEmail(template, {
      to_name:         b.firstName,
      to_email:        b.email,
      package_name:    b.packageName,
      booking_ref:     b.bookingRef,
      unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(b.email)}`,
    }, EMAILJS_KEY.value()).catch(e => console.error('Review email failed:', b.bookingRef, e.message));

    await db.collection('customers').doc(b.email.toLowerCase())
      .set({ lastReviewEmailSentAt: new Date() }, { merge: true }).catch(() => {});
  }
});

// ── 16a. Send abandoned booking emails (Scheduled) ───────────
// Emails opted-in customers who started a booking but never paid, 2 hours after they abandoned
exports.sendAbandonedBookingEmails = onSchedule({ schedule: 'every 30 minutes', secrets: [EMAILJS_KEY] }, async () => {
  const db     = admin.firestore();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const snap   = await db.collection('pendingBookings')
    .where('createdAt', '<', twoHoursAgo)
    .get();

  const template = process.env.EMAILJS_ABANDONED_TEMPLATE;
  if (!template) return;

  const unsubSnap = await db.collection('unsubscribed').get();
  const unsubbed  = new Set(unsubSnap.docs.map(d => d.id));

  const batch = db.batch();
  await Promise.allSettled(snap.docs.map(async doc => {
    const d = doc.data();
    if (!d.email || !d.firstName || d.abandonedEmailSent || d.marketingOptOut || unsubbed.has(d.email.toLowerCase())) return;
    await sendEmail(template, {
      to_name:         d.firstName,
      to_email:        d.email,
      package_name:    d.packageName || 'your clean',
      clean_date:      d.cleanDate ? d.cleanDate.split('-').reverse().join('/') : '',
      booking_url:     'https://londoncleaningwizard.com/book',
      unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(d.email)}`,
    }, EMAILJS_KEY.value());
    batch.update(doc.ref, { abandonedEmailSent: true });
    db.collection('abandonmentStats').doc(doc.id).update({ emailSent: true, emailSentAt: new Date() }).catch(() => {});
  }));
  await batch.commit();
});

// ── 16. Clean up abandoned pendingBookings (Scheduled) ───────
// Deletes pending docs older than 3 hours where the customer never paid
exports.cleanupPendingBookings = onSchedule('every 60 minutes', async () => {
  const db     = admin.firestore();
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const snap   = await db.collection('pendingBookings').where('createdAt', '<', cutoff).get();
  const batch  = db.batch();
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();

  // Strip email from abandonmentStats older than 30 days (conversion window closed)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const statsSnap = await db.collection('abandonmentStats')
    .where('createdAt', '<', thirtyDaysAgo)
    .get();
  const statsBatch = db.batch();
  statsSnap.forEach(d => { if (d.data().email) statsBatch.update(d.ref, { email: '' }); });
  await statsBatch.commit();
});

// ── Clean up expired verification codes (Scheduled) ──────────
exports.cleanupExpiredCodes = onSchedule('every 60 minutes', async () => {
  const db   = admin.firestore();
  const snap = await db.collection('verificationCodes').where('expiresAt','<',new Date()).get();
  const b    = db.batch();
  snap.forEach(d => b.delete(d.ref));
  await b.commit();
});

// ── Set do-not-contact flag on a booking (admin only) ────────
exports.setDoNotContact = onRequest({ cors: ['https://londoncleaningwizard.com', 'http://localhost:5173', 'http://localhost:5174'] }, async (req, res) => {
  const { email, bookingId, doNotContact } = req.body;
  if (typeof doNotContact !== 'boolean' || (!email && !bookingId)) {
    res.status(400).json({ error: 'Missing email or bookingId, and doNotContact' }); return;
  }
  const db = admin.firestore();
  let resolvedEmail = email;
  if (!resolvedEmail && bookingId) {
    const snap = await db.collection('bookings').doc(bookingId).get();
    resolvedEmail = snap.data()?.email;
  }
  if (!resolvedEmail) { res.status(400).json({ error: 'Could not resolve email' }); return; }
  const [bookingsSnap] = await Promise.all([
    db.collection('bookings').where('email', '==', resolvedEmail).get(),
    db.collection('customers').doc(resolvedEmail).set({ doNotContact, marketingOptOut: doNotContact }, { merge: true }),
  ]);
  const batch = db.batch();
  bookingsSnap.docs.forEach(doc => batch.update(doc.ref, { doNotContact, marketingOptOut: doNotContact }));
  await batch.commit();
  res.json({ ok: true });
});

// ── Set / get no-review-emails flag on customer doc (admin only) ─────────────
exports.setNoReviewEmails = onRequest({ cors: ['https://londoncleaningwizard.com', 'http://localhost:5173', 'http://localhost:5174'] }, async (req, res) => {
  const db = admin.firestore();
  if (req.method === 'GET') {
    const email = req.query.email;
    if (!email) { res.status(400).json({ error: 'Missing email' }); return; }
    const doc = await db.collection('customers').doc(email.toLowerCase()).get();
    res.json({ noReviewEmails: doc.data()?.noReviewEmails || false });
    return;
  }
  const { email, noReviewEmails } = req.body;
  if (typeof noReviewEmails !== 'boolean' || !email) {
    res.status(400).json({ error: 'Missing email or noReviewEmails' }); return;
  }
  await db.collection('customers').doc(email.toLowerCase()).set({ noReviewEmails }, { merge: true });
  res.json({ ok: true });
});

// ── Set Signature Touch preference (syncs all standard bookings + calendar) ───
exports.setSignatureTouch = onRequest({ cors: ['https://londoncleaningwizard.com', 'http://localhost:5173', 'http://localhost:5174'] }, async (req, res) => {
  const { email, signatureTouch, signatureTouchNotes } = req.body;
  if (typeof signatureTouch !== 'boolean' || !email) {
    res.status(400).json({ error: 'Missing email or signatureTouch' }); return;
  }
  const db = admin.firestore();
  const notes = clean(signatureTouchNotes || '');
  const [bookingsSnap] = await Promise.all([
    db.collection('bookings').where('email', '==', email.toLowerCase()).where('package', '==', 'standard').get(),
    db.collection('customers').doc(email.toLowerCase()).set({ signatureTouch, signatureTouchNotes: notes }, { merge: true }),
  ]);
  const batch = db.batch();
  bookingsSnap.docs.forEach(doc => batch.update(doc.ref, { signatureTouch, signatureTouchNotes: notes }));
  await batch.commit();

  // Patch Google Calendar descriptions for every affected booking
  const docsWithCal = bookingsSnap.docs.filter(d => d.data().calendarEventId);
  if (docsWithCal.length > 0) {
    const calendar = await getCalendarClient().catch(() => null);
    if (calendar) {
      await Promise.allSettled(docsWithCal.map(async fdoc => {
        const b = fdoc.data();
        try {
          const sigLine = signatureTouch !== false
            ? 'Opted in'
            : `Opted out${notes ? ` — ${notes}` : ''}`;
          const description = [
            `Ref: ${b.bookingRef}`,
            `Customer: ${b.firstName} ${b.lastName}`,
            `Email: ${b.email}`,
            `Phone: ${b.phone || ''}`,
            `Address: ${b.addr1}, ${b.postcode}`,
            `Property: ${b.propertyType || ''} · ${b.size || ''}`,
            `Frequency: ${b.frequency || 'One-off'}`,
            `Floor / Lift: ${b.floor || '—'}`,
            `Parking: ${b.parking || '—'}`,
            `Bathrooms: ${b.bathrooms || '—'}`,
            `Keys: ${b.keys || 'N/A'}`,
            `Add-ons: ${(b.addons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Pets: ${b.hasPets ? `Yes — ${b.petTypes || 'not specified'}` : 'No'}`,
            `Signature Touch: ${sigLine}`,
            `Cleaner: ${b.assignedStaff || 'Unassigned'}`,
            `Notes: ${b.notes || 'None'}`,
            `Media consent: ${b.mediaConsent ? 'Yes - consented to photos/videos on social media' : 'No'}`,
            `Total: £${parseFloat(b.total||0).toFixed(2)} | Deposit: £${parseFloat(b.deposit||0).toFixed(2)} | Remaining: £${parseFloat(b.remaining||0).toFixed(2)}`,
          ].join('\n');
          await calendar.events.patch({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId:    b.calendarEventId,
            resource:   { description },
          });
        } catch (e) {
          console.error('Calendar patch failed for', b.bookingRef, e.message);
        }
      }));
    }
  }

  res.json({ ok: true });
});

// ── Marketing unsubscribe ─────────────────────────────────────
exports.unsubscribeMarketing = onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  if (req.method === 'OPTIONS') { res.set('Access-Control-Allow-Methods', 'POST'); res.status(204).send(''); return; }
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email' }); return;
  }
  const db  = admin.firestore();
  const key = email.toLowerCase();
  await db.collection('unsubscribed').doc(key).set({ email: key, unsubscribedAt: new Date() });
  await db.collection('customers').doc(key).update({ marketingOptOut: true }).catch(() => {});
  // Strip email from any abandonmentStats docs so they can no longer be attributed
  const statsSnap = await db.collection('abandonmentStats').where('email', '==', key).get();
  const batch = db.batch();
  statsSnap.forEach(doc => batch.update(doc.ref, { email: '' }));
  await batch.commit();
  res.json({ ok: true });
});

// ── Re-engagement emails (Scheduled) ─────────────────────────
// Once a week, emails customers who haven't booked in 90+ days
exports.sendReengagementEmails = onSchedule({ schedule: 'every monday 10:00', secrets: [EMAILJS_KEY] }, async () => {
  const template = process.env.EMAILJS_REENGAGEMENT_TEMPLATE;
  if (!template) return;

  const db      = admin.firestore();
  const cutoff  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoff.toISOString().split('T')[0]; // 'YYYY-MM-DD' — lastDate is stored as a string

  const [snap, unsubSnap] = await Promise.all([
    db.collection('customers').where('lastDate', '<', cutoffStr).get(),
    db.collection('unsubscribed').get(),
  ]);

  const unsubbed = new Set(unsubSnap.docs.map(d => d.id));

  await Promise.allSettled(snap.docs.map(async doc => {
    const d = doc.data();
    if (!d.firstName || d.marketingOptOut || unsubbed.has(doc.id)) return;
    await sendEmail(template, {
      to_name:         d.firstName,
      to_email:        doc.id,
      last_service:    d.lastPackageName || 'your last clean',
      booking_url:     'https://londoncleaningwizard.com/book',
      unsubscribe_url: `https://londoncleaningwizard.com/unsubscribe?email=${encodeURIComponent(doc.id)}`,
    }, EMAILJS_KEY.value());
  }));
});

// ── Contract monthly auto-charge (Daily scheduler) ────────────
exports.chargeContractMonthly = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Europe/London', secrets: [STRIPE_KEY, EMAILJS_KEY] },
  async () => {
    const db     = admin.firestore();
    const stripe = new Stripe(STRIPE_KEY.value());

    const todayUKStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); // YYYY-MM-DD
    const todayUK    = new Date(todayUKStr + 'T12:00:00');
    const todayDay   = todayUK.getDate();

    const snap = await db.collection('bookings')
      .where('isContract', '==', true)
      .where('stripeCustomerId', '>', '')
      .get();

    await Promise.allSettled(snap.docs.map(async doc => {
      const b = doc.data();

      // Stop if contract has ended or been cancelled
      if (b.contractEndDate && todayUKStr > b.contractEndDate) return;
      if (b.status && b.status.startsWith('cancelled')) return;

      // Only charge on the billing anniversary day
      const startDay = new Date(b.contractStartDate + 'T12:00:00').getDate();
      const daysInMonth = new Date(todayUK.getFullYear(), todayUK.getMonth() + 1, 0).getDate();
      const billingDay  = Math.min(startDay, daysInMonth);
      if (todayDay !== billingDay) return;

      // Period key = today (the billing start date for this period)
      const periodKey = todayUKStr;
      const payments  = b.monthlyPayments || {};

      // Skip if already paid or failed (failed = manual retry required)
      if (payments[periodKey] === 'paid' || payments[periodKey] === 'failed') return;

      // Calculate charge: fixed base + previous period's add-ons
      const fixedBase = parseFloat(b.monthlyBaseValue || 0);

      const yesterday    = new Date(todayUK); yesterday.setDate(yesterday.getDate() - 1);
      const prevEnd      = yesterday.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const prevStartDate = new Date(todayUK); prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      const prevStart    = prevStartDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

      const visitsSnap = await db.collection('bookings')
        .where('contractId', '==', doc.id)
        .where('cleanDate', '>=', prevStart)
        .where('cleanDate', '<=', prevEnd)
        .get();

      const prevAddons = visitsSnap.docs.reduce((s, d) => s + parseFloat(d.data().addonTotal || 0), 0);
      const amount     = fixedBase + prevAddons;
      if (amount <= 0) return;

      // Get payment method (saved at first payment, fall back to listing)
      let pmId = b.stripePaymentMethodId;
      if (!pmId) {
        const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
        pmId = pms.data[0]?.id;
      }
      if (!pmId) {
        await doc.ref.update({ [`monthlyPayments.${periodKey}`]: 'failed', [`monthlyPaymentErrors.${periodKey}`]: 'No saved payment method found.' });
        const noCardTpl = process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE;
        if (noCardTpl) {
          const name = b.contactName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
          await sendEmail(noCardTpl, { to_email: 'bookings@londoncleaningwizard.com', booking_ref: b.bookingRef, customer_name: name, customer_email: b.email, customer_phone: b.phone || '', amount: `£${amount.toFixed(2)}`, date: periodKey.split('-').reverse().join('/'), error_message: 'No saved payment method found.' }, EMAILJS_KEY.value()).catch(() => {});
        }
        return;
      }

      try {
        const pi = await stripe.paymentIntents.create({
          amount:         Math.round(amount * 100),
          currency:       'gbp',
          customer:       b.stripeCustomerId,
          payment_method: pmId,
          confirm:        true,
          off_session:    true,
          metadata:       { contractId: doc.id, period: periodKey, prevAddons: prevAddons.toFixed(2) },
        });
        if (pi.status === 'succeeded') {
          await doc.ref.update({
            [`monthlyPayments.${periodKey}`]:       'paid',
            [`monthlyPaymentIntents.${periodKey}`]: pi.id,
          });
          const addonsFromVisits = visitsSnap.docs.flatMap(d => (d.data().addons || []).map(a => a.name || a.id || '').filter(Boolean));
          await sendContractReceipt(b, periodKey, amount, prevAddons, addonsFromVisits, pi.id, EMAILJS_KEY.value());
        }
      } catch (e) {
        await doc.ref.update({
          [`monthlyPayments.${periodKey}`]:     'failed',
          [`monthlyPaymentErrors.${periodKey}`]: e.message || 'Charge failed.',
        });
        const failedTpl = process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE;
        if (failedTpl) {
          const errMsg = e.message || 'Charge failed.';
          const name   = b.contactName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
          const amt    = `£${amount.toFixed(2)}`;
          const date   = periodKey.split('-').reverse().join('/');
          await sendEmail(failedTpl, { to_email: 'bookings@londoncleaningwizard.com', booking_ref: b.bookingRef, customer_name: name, customer_email: b.email, customer_phone: b.phone || '', amount: amt, date, error_message: errMsg }, EMAILJS_KEY.value()).catch(() => {});
          await sendEmail(failedTpl, { to_email: b.email, to_name: b.contactName || b.firstName, booking_ref: b.bookingRef, customer_name: name, customer_email: b.email, customer_phone: b.phone || '', amount: amt, date, error_message: errMsg }, EMAILJS_KEY.value()).catch(() => {});
        }
      }
    }));
  }
);

// ── Retry a failed contract monthly charge ────────────────────
exports.retryContractCharge = onRequest({ secrets: [STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, periodKey } = req.body;
  if (!bookingId || !periodKey) { res.status(400).json({ error: 'Missing bookingId or periodKey' }); return; }

  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (!b.isContract || !b.stripeCustomerId) { res.status(400).json({ error: 'Not a contract with a saved card.' }); return; }

  const fixedBase = parseFloat(b.monthlyBaseValue || 0);
  const periodDate = new Date(periodKey + 'T12:00:00');
  const prevEndDate = new Date(periodDate); prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(periodDate); prevStartDate.setMonth(prevStartDate.getMonth() - 1);
  const prevStart = prevStartDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const prevEnd   = prevEndDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const visitsSnap = await db.collection('bookings')
    .where('contractId', '==', bookingId)
    .where('cleanDate', '>=', prevStart)
    .where('cleanDate', '<=', prevEnd)
    .get();

  const prevAddons = visitsSnap.docs.reduce((s, d) => s + parseFloat(d.data().addonTotal || 0), 0);
  const amount     = fixedBase + prevAddons;

  let pmId = b.stripePaymentMethodId;
  if (!pmId) {
    const pms = await stripe.paymentMethods.list({ customer: b.stripeCustomerId, type: 'card' });
    pmId = pms.data[0]?.id;
  }
  if (!pmId) { res.status(400).json({ error: 'No saved payment method found.' }); return; }

  try {
    const pi = await stripe.paymentIntents.create({
      amount:         Math.round(amount * 100),
      currency:       'gbp',
      customer:       b.stripeCustomerId,
      payment_method: pmId,
      confirm:        true,
      off_session:    true,
      metadata:       { contractId: bookingId, period: periodKey, retry: 'true' },
    });
    if (pi.status === 'succeeded') {
      await snap.ref.update({
        [`monthlyPayments.${periodKey}`]:       'paid',
        [`monthlyPaymentIntents.${periodKey}`]: pi.id,
        [`monthlyPaymentErrors.${periodKey}`]:  admin.firestore.FieldValue.delete(),
      });
      const addonsFromVisits = visitsSnap.docs.flatMap(d => (d.data().addons || []).map(a => a.name || a.id || '').filter(Boolean));
      await sendContractReceipt(b, periodKey, amount, prevAddons, addonsFromVisits, pi.id, EMAILJS_KEY.value());
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment did not succeed.' });
    }
  } catch (e) {
    await snap.ref.update({ [`monthlyPaymentErrors.${periodKey}`]: e.message || 'Charge failed.' });
    const failedTpl = process.env.EMAILJS_PAYMENT_FAILED_TEMPLATE;
    if (failedTpl) {
      const errMsg = e.message || 'Charge failed.';
      const name   = b.contactName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
      const amt    = `£${amount.toFixed(2)}`;
      const date   = periodKey.split('-').reverse().join('/');
      await sendEmail(failedTpl, { to_email: 'bookings@londoncleaningwizard.com', booking_ref: b.bookingRef, customer_name: name, customer_email: b.email, customer_phone: b.phone || '', amount: amt, date, error_message: errMsg }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(failedTpl, { to_email: b.email, to_name: b.contactName || b.firstName, booking_ref: b.bookingRef, customer_name: name, customer_email: b.email, customer_phone: b.phone || '', amount: amt, date, error_message: errMsg }, EMAILJS_KEY.value()).catch(() => {});
    }
    res.status(400).json({ error: e.message || 'Charge failed.' });
  }
});

// ── Manual mark-paid for a contract month (sends receipt email) ──────────────
exports.markContractMonthPaid = onRequest({ secrets: [EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, periodKey } = req.body;
  if (!bookingId || !periodKey) { res.status(400).json({ error: 'Missing bookingId or periodKey' }); return; }

  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (!b.isContract) { res.status(400).json({ error: 'Not a contract booking.' }); return; }

  const fixedBase     = parseFloat(b.monthlyBaseValue || 0);
  const periodDate    = new Date(periodKey + 'T12:00:00');
  const prevEndDate   = new Date(periodDate); prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(periodDate); prevStartDate.setMonth(prevStartDate.getMonth() - 1);
  const prevStart     = prevStartDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const prevEnd       = prevEndDate.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const visitsSnap = await db.collection('bookings')
    .where('contractId', '==', bookingId)
    .get();

  const prevVisits       = visitsSnap.docs.map(d => d.data()).filter(v => v.cleanDate >= prevStart && v.cleanDate <= prevEnd);
  const prevAddons       = prevVisits.reduce((s, v) => s + parseFloat(v.addonTotal || 0), 0);
  const amount           = fixedBase + prevAddons;
  const addonsFromVisits = prevVisits.flatMap(v => (v.addons || []).map(a => a.name || a.id || '').filter(Boolean));

  await snap.ref.update({ [`monthlyPayments.${periodKey}`]: 'paid', updatedAt: new Date().toISOString() });
  res.json({ success: true, amount });
  sendContractReceipt(b, periodKey, amount, prevAddons, addonsFromVisits, 'manual', EMAILJS_KEY.value()).catch(e => console.error('Receipt email failed:', e.message));
});

// ── Contract type upgrade — extends end date, generates new visits, sends email ──
exports.upgradeContract = onRequest({ secrets: [EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, newContractType, newContractLabel, newMonths, newMonthlyRate, rateEffectiveFrom } = req.body;
  if (!bookingId || !newMonths || !newMonthlyRate) { res.status(400).json({ error: 'Missing required fields.' }); return; }

  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found.' }); return; }
  const b = snap.data();
  if (!b.isContract) { res.status(400).json({ error: 'Not a contract.' }); return; }

  const today        = new Date();
  const effectiveFrom = rateEffectiveFrom || today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const newEndD      = new Date(effectiveFrom + 'T12:00:00'); newEndD.setMonth(newEndD.getMonth() + parseInt(newMonths));
  const newEndStr    = newEndD.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const oldEndStr    = b.contractEndDate;

  // Generate visits from day after old end date to new end date
  const genStart   = (() => { const d = new Date(oldEndStr + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }); })();
  const freq       = b.frequency || '';

  const genVisitDates = (startDate, endDate, freq) => {
    const dates = []; const end = new Date(endDate + 'T12:00:00'); let d = new Date(startDate + 'T12:00:00');
    if (freq === 'daily')        { while (d <= end) { if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); } }
    else if (freq === 'thrice')  { while (d <= end) { if ([1,3,5].includes(d.getDay())) dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); } }
    else if (freq === 'twice')   { while (d <= end) { if ([1,4].includes(d.getDay())) dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); } }
    else if (freq === 'weekly')  { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 7); } }
    else if (freq === 'fortnightly') { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 14); } }
    else if (freq === 'monthly') { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setMonth(d.getMonth() + 1); } }
    return dates;
  };

  // Get last visit as template
  const visitsSnap     = await db.collection('bookings').where('contractId', '==', bookingId).get();
  const existingVisits = visitsSnap.docs.map(d => d.data()).sort((a,z) => a.cleanDate.localeCompare(z.cleanDate));
  const lastVisit      = existingVisits[existingVisits.length - 1];

  let visitCount = 0;
  if (lastVisit && genStart <= newEndStr) {
    let actualStart = genStart;
    if (['weekly', 'fortnightly', 'monthly'].includes(freq) && lastVisit.cleanDate) {
      const ld = new Date(lastVisit.cleanDate + 'T12:00:00');
      if (freq === 'weekly')      ld.setDate(ld.getDate() + 7);
      else if (freq === 'fortnightly') ld.setDate(ld.getDate() + 14);
      else if (freq === 'monthly')     ld.setMonth(ld.getMonth() + 1);
      actualStart = ld.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    }

    const newDates = genVisitDates(actualStart, newEndStr, freq);
    const { cleanDate: _cd, status: _st, createdAt: _ca, updatedAt: _ua, calendarEventId: _ev, ...visitTemplate } = lastVisit;
    const now = new Date().toISOString();

    const batch = db.batch();
    const newRefs = newDates.map(date => {
      const ref = db.collection('bookings').doc();
      batch.set(ref, { ...visitTemplate, cleanDate: date, status: 'scheduled', createdAt: now, updatedAt: now });
      return { ref, date };
    });
    await batch.commit();
    visitCount = newDates.length;

    try {
      const cal = await getCalendarClient();
      for (const { ref, date } of newRefs) {
        const slotStart = toUTCISO(date, visitTemplate.cleanTime || '9:00 AM');
        const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
        const calEvent  = await cal.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          resource: {
            summary: `${visitTemplate.packageName || 'Contract Visit'} — ${visitTemplate.bizName || ''}`,
            description: [
              `Ref: ${b.bookingRef || ''}`, `Business: ${visitTemplate.bizName || ''}`,
              `Contact: ${visitTemplate.firstName || ''} ${visitTemplate.lastName || ''}`,
              `Email: ${visitTemplate.email || ''}`, `Phone: ${visitTemplate.phone || ''}`,
              `Address: ${visitTemplate.addr1 || ''}`, `Cleaners: ${visitTemplate.numCleaners || 1}`,
              `Duration: ${visitTemplate.visitDurationBase || '—'}h`,
              `Add-ons: ${(visitTemplate.addons || []).map(a => a.name).join(', ') || 'None'}`,
              `Cleaner: ${visitTemplate.assignedStaff || 'Unassigned'}`,
              `Keys: ${visitTemplate.keys || 'N/A'}`, `Parking: ${visitTemplate.parking || '—'}`,
              `↑ Auto-generated on contract upgrade`,
            ].join('\n'),
            start: { dateTime: slotStart, timeZone: 'Europe/London' },
            end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
            colorId: '5',
          },
        });
        await ref.update({ calendarEventId: calEvent.data.id });
      }
    } catch (calErr) {
      console.error(`[upgradeContract] Calendar events failed:`, calErr.message);
    }
  }

  // Update master contract — preserve previous rate for already-paid period display
  await snap.ref.update({
    contractEndDate:          newEndStr,
    contractType:             newContractType || b.contractType,
    contractLabel:            newContractLabel || b.contractLabel,
    monthlyBaseValue:         Math.round(parseFloat(newMonthlyRate) * 100) / 100,
    previousMonthlyBaseValue: parseFloat(b.monthlyBaseValue || 0),
    rateEffectiveFrom:        effectiveFrom,
    updatedAt:                new Date().toISOString(),
  });

  // Send upgrade confirmation email
  const fmtD = s => { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const name         = b.contactName || b.firstName || b.bizName || '';
  const businessName = b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
  const template     = process.env.EMAILJS_CONTRACT_UPGRADE_TEMPLATE;
  if (template) {
    await sendEmail(template, {
      to_name:       name,
      to_email:      b.email,
      business_name: businessName,
      booking_ref:   b.bookingRef || '',
      service:       b.packageName || b.contractLabel || '',
      frequency:     b.frequencyLabel || b.frequency || '',
      old_contract:  b.contractLabel || '',
      new_contract:  newContractLabel || '',
      new_end_date:  fmtD(newEndStr),
      monthly_amount: `£${parseFloat(newMonthlyRate).toFixed(2)}`,
    }, EMAILJS_KEY.value()).catch(e => console.error('[upgradeContract] Email failed:', e.message));
  }

  res.json({ success: true, newEndDate: newEndStr, visitsGenerated: visitCount });
});

// ── Assign booking ref to a contract master (LCW-XXXXXX format) ─────────────
exports.assignContractRef = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  if (b.bookingRef) { res.json({ bookingRef: b.bookingRef }); return; }
  const ref = `LCW-${Date.now().toString().slice(-6)}`;
  await snap.ref.update({ bookingRef: ref });
  res.json({ bookingRef: ref });
});

// ── Firestore trigger: clean up calendar event when booking is deleted ──────
// Fires whenever a booking document is deleted — regardless of whether it was
// deleted via the admin panel, Firebase console, or any other path.
exports.onBookingDeleted = onDocumentDeleted('bookings/{bookingId}', async (event) => {
  const b = event.data.data();
  if (!b || !b.calendarEventId) return;
  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: b.calendarEventId });
  } catch (e) {
    if (e?.code !== 410 && e?.status !== 410 && e?.code !== 404 && e?.status !== 404) {
      console.error('onBookingDeleted: calendar delete failed:', e.message);
    }
  }
});

// ── Contract renewal reminder — runs daily at 9am, sends email 30 days before end ──
exports.sendContractRenewalEmails = onSchedule({ schedule: 'every day 09:00', secrets: [EMAILJS_KEY] }, async () => {
  const template = process.env.EMAILJS_CONTRACT_RENEWAL_TEMPLATE;
  if (!template) return;

  const db     = admin.firestore();
  const today  = new Date();
  const target = new Date(today);
  target.setDate(target.getDate() + 30);
  const targetStr = target.toISOString().slice(0, 10);

  const snap = await db.collection('bookings')
    .where('isContract', '==', true)
    .where('contractEndDate', '==', targetStr)
    .get();

  for (const doc of snap.docs) {
    const b = doc.data();
    if (b.status?.startsWith('cancelled')) continue;
    if (b.renewalEmailSent) continue;

    const name         = b.contactName || b.firstName || b.bizName || '';
    const businessName = b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
    const fmtD         = s => { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };
    const endDate      = fmtD(b.contractEndDate);

    const renewalDate  = (() => {
      const d = new Date(b.contractEndDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    const cancelDeadline = (() => {
      const d = new Date(b.contractEndDate + 'T12:00:00');
      d.setDate(d.getDate() - 14);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    const price = b.monthlyBaseValue
      ? `£${parseFloat(b.monthlyBaseValue).toFixed(2)}/month`
      : b.pricePerVisit
        ? `£${parseFloat(b.pricePerVisit).toFixed(2)} per visit`
        : 'same as current contract';

    try {
      await sendEmail(template, {
        to_name:           name,
        to_email:          b.email,
        business_name:     businessName,
        booking_ref:       b.bookingRef || '',
        service:           b.packageName || b.contractLabel || '',
        frequency:         b.frequencyLabel || b.frequency || '',
        renewal_price:     price,
        contract_end_date: endDate,
        renewal_date:      renewalDate,
        cancel_deadline:   cancelDeadline,
      }, EMAILJS_KEY.value());

      await doc.ref.update({ renewalEmailSent: true, renewalEmailSentAt: new Date().toISOString() });
      console.log(`[contractRenewal] Sent renewal email for contract ${doc.id} (${businessName})`);
    } catch (e) {
      console.error(`[contractRenewal] Failed for ${doc.id}:`, e.message);
    }
  }
});

// ── Contract renewal confirmation + visit generation — runs daily at 9am, fires on day 1 of new term ──
exports.sendContractRenewalConfirmations = onSchedule({ schedule: 'every day 09:00', secrets: [EMAILJS_KEY] }, async () => {
  const template = process.env.EMAILJS_CONTRACT_RENEWAL_CONFIRMATION_TEMPLATE;
  if (!template) return;

  const db        = admin.firestore();
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const snap = await db.collection('bookings')
    .where('isContract', '==', true)
    .where('contractEndDate', '==', yesterdayStr)
    .get();

  const fmtD = s => { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };

  const genVisitDates = (startDate, endDate, freq, scheduledDays = []) => {
    const dates = [];
    const end   = new Date(endDate + 'T12:00:00');
    let d       = new Date(startDate + 'T12:00:00');
    const days  = scheduledDays.length > 0 ? scheduledDays : (freq === 'daily' ? [1,2,3,4,5] : freq === 'thrice' ? [1,3,5] : [1,4]);
    if (['daily','thrice','twice'].includes(freq)) { while (d <= end) { if (days.includes(d.getDay())) dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 1); } }
    else if (freq === 'weekly') { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 7); } }
    else if (freq === 'fortnightly') { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setDate(d.getDate() + 14); } }
    else if (freq === 'monthly') { while (d <= end) { dates.push(d.toLocaleDateString('en-CA')); d.setMonth(d.getMonth() + 1); } }
    return dates;
  };

  for (const doc of snap.docs) {
    const b = doc.data();
    if (b.status?.startsWith('cancelled')) continue;
    if (b.renewalConfirmationSent) continue;

    const name         = b.contactName || b.firstName || b.bizName || '';
    const businessName = b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim();

    const startD         = new Date((b.contractStartDate || b.cleanDate) + 'T12:00:00');
    const endD           = new Date(b.contractEndDate + 'T12:00:00');
    const durationMonths = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
    const newEndD        = new Date(endD); newEndD.setMonth(newEndD.getMonth() + durationMonths);
    const newEndStr      = newEndD.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const monthlyAmount  = `£${parseFloat(b.monthlyBaseValue || 0).toFixed(2)}`;

    try {
      // Send confirmation email
      await sendEmail(template, {
        to_name:          name,
        to_email:         b.email,
        business_name:    businessName,
        booking_ref:      b.bookingRef || '',
        service:          b.packageName || b.contractLabel || '',
        frequency:        b.frequencyLabel || b.frequency || '',
        extension_months: String(durationMonths),
        new_end_date:     fmtD(newEndStr),
        monthly_amount:   monthlyAmount,
      }, EMAILJS_KEY.value());

      // Mark as in-progress so a crash mid-processing doesn't cause re-processing on next daily run
      await doc.ref.update({ renewalConfirmationSent: true, renewalConfirmationSentAt: new Date().toISOString() });

      // Generate new visits for the new term
      const visitsSnap     = await db.collection('bookings').where('contractId', '==', doc.id).get();
      const existingVisits = visitsSnap.docs.map(d => d.data()).sort((a,z) => a.cleanDate.localeCompare(z.cleanDate));
      const lastVisit      = existingVisits[existingVisits.length - 1];
      const freq           = b.frequency || '';

      if (lastVisit) {
        // For fixed-interval frequencies, start from last visit + interval to preserve the exact day pattern
        let genStart = today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
        if (['weekly', 'fortnightly', 'monthly'].includes(freq) && lastVisit.cleanDate) {
          const ld = new Date(lastVisit.cleanDate + 'T12:00:00');
          if (freq === 'weekly')      ld.setDate(ld.getDate() + 7);
          else if (freq === 'fortnightly') ld.setDate(ld.getDate() + 14);
          else if (freq === 'monthly')     ld.setMonth(ld.getMonth() + 1);
          genStart = ld.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
        }

        const scheduledDays = b.scheduledDays || [];
        const newDates = genVisitDates(genStart, newEndStr, freq, scheduledDays);
        const { cleanDate: _cd, status: _st, createdAt: _ca, updatedAt: _ua, calendarEventId: _ev, ...visitTemplate } = lastVisit;
        const now = new Date().toISOString();

        const newRefs = [];
        const BATCH_SIZE = 499;
        for (let i = 0; i < newDates.length; i += BATCH_SIZE) {
          const batch = db.batch();
          for (const date of newDates.slice(i, i + BATCH_SIZE)) {
            const ref = db.collection('bookings').doc();
            batch.set(ref, { ...visitTemplate, cleanDate: date, status: 'scheduled', createdAt: now, updatedAt: now });
            newRefs.push({ ref, date });
          }
          await batch.commit();
        }

        // Create calendar events in parallel chunks to avoid rate limiting
        try {
          const cal   = await getCalendarClient();
          const CHUNK = 10;
          for (let i = 0; i < newRefs.length; i += CHUNK) {
            await Promise.all(newRefs.slice(i, i + CHUNK).map(async ({ ref, date }) => {
              const slotStart = toUTCISO(date, visitTemplate.cleanTime || '9:00 AM');
              const slotEnd   = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();
              const calEvent  = await cal.events.insert({
                calendarId: process.env.GOOGLE_CALENDAR_ID,
                resource: {
                  summary: `${visitTemplate.packageName || 'Contract Visit'} — ${visitTemplate.bizName || name}`,
                  description: [
                    `Ref: ${b.bookingRef || ''}`,
                    `Business: ${visitTemplate.bizName || ''}`,
                    `Contact: ${visitTemplate.firstName || ''} ${visitTemplate.lastName || ''}`,
                    `Email: ${visitTemplate.email || ''}`,
                    `Phone: ${visitTemplate.phone || ''}`,
                    `Address: ${visitTemplate.addr1 || ''}`,
                    `Cleaners: ${visitTemplate.numCleaners || 1}`,
                    `Duration: ${visitTemplate.visitDurationBase || '—'}h`,
                    `Add-ons: ${(visitTemplate.addons || []).map(a => a.name).join(', ') || 'None'}`,
                    `Cleaner: ${visitTemplate.assignedStaff || 'Unassigned'}`,
                    `Keys: ${visitTemplate.keys || 'N/A'}`,
                    `Parking: ${visitTemplate.parking || '—'}`,
                    `🔄 Auto-generated on contract renewal`,
                  ].join('\n'),
                  start: { dateTime: slotStart, timeZone: 'Europe/London' },
                  end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
                  colorId: '5',
                },
              });
              await ref.update({ calendarEventId: calEvent.data.id });
            }));
          }
        } catch (calErr) {
          console.error(`[contractRenewalConfirm] Calendar events failed for ${doc.id}:`, calErr.message);
        }
        console.log(`[contractRenewalConfirm] Generated ${newDates.length} visits for ${doc.id}`);
      }

      // Update master: new end date, flag renewal date for frontend notification, reset renewal flags for next cycle
      await doc.ref.update({
        contractEndDate:           newEndStr,
        lastRenewalDate:           today.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }),
        renewalConfirmationSent:   admin.firestore.FieldValue.delete(),
        renewalConfirmationSentAt: admin.firestore.FieldValue.delete(),
        renewalEmailSent:          admin.firestore.FieldValue.delete(),
        renewalEmailSentAt:        admin.firestore.FieldValue.delete(),
        updatedAt:                 now,
      });
      console.log(`[contractRenewalConfirm] Renewed ${doc.id} (${businessName}) → new end ${newEndStr}`);
    } catch (e) {
      console.error(`[contractRenewalConfirm] Failed for ${doc.id}:`, e.message);
    }
  }
});

// ── Contract payment reminder — runs daily at 9am, sends email 7 days before payment due ──
exports.issuePartialRefund = onRequest({ secrets: [STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, amount, contractId } = req.body;
  if (!bookingId || !amount || parseFloat(amount) <= 0) {
    res.status(400).json({ error: 'Missing bookingId or valid amount.' }); return;
  }

  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());

  const bookingRef  = db.collection('bookings').doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) { res.status(404).json({ error: 'Booking not found.' }); return; }
  const booking = bookingSnap.data();

  const amountPence = Math.round(parseFloat(amount) * 100);
  let stripeRefundId;

  if (contractId) {
    // Contract visit — refund from the monthly PI for the period this visit falls in
    const masterRef  = db.collection('bookings').doc(contractId);
    const masterSnap = await masterRef.get();
    if (!masterSnap.exists) { res.status(404).json({ error: 'Master contract not found.' }); return; }
    const master = masterSnap.data();

    const visitDate = booking.cleanDate;
    const pis       = master.monthlyPaymentIntents || {};
    const periods   = Object.keys(pis).sort();
    let periodKey   = null;
    for (let i = 0; i < periods.length; i++) {
      const start = periods[i];
      const next  = periods[i + 1] || null;
      if (visitDate >= start && (next === null || visitDate < next)) { periodKey = start; break; }
    }
    if (!periodKey || !pis[periodKey]) {
      res.status(400).json({ error: 'No Stripe payment found for this visit\'s period.' }); return;
    }

    const refund = await stripe.refunds.create({ payment_intent: pis[periodKey], amount: amountPence, metadata: { admin_partial_refund: 'true', bookingId } });
    stripeRefundId = refund.id;

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    await bookingRef.update({
      partialRefundAmount:   parseFloat(amount),
      partialRefundDate:     today,
      partialRefundStripeId: stripeRefundId,
    });
    const currentTotal = parseFloat(master.partialRefundTotal || 0);
    await masterRef.update({
      partialRefundTotal: Math.round((currentTotal + parseFloat(amount)) * 100) / 100,
    });

  } else {
    // Regular / recurring booking
    // Fully paid bookings have a separate remaining-balance PI; prefer that for refunds
    const piId = booking.stripeRemainingIntentId || booking.stripeDepositIntentId;
    if (!piId || piId === 'manual') {
      res.status(400).json({ error: 'No Stripe payment found for this booking.' }); return;
    }
    const refund = await stripe.refunds.create({ payment_intent: piId, amount: amountPence, metadata: { admin_partial_refund: 'true', bookingId } });
    stripeRefundId = refund.id;

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    await bookingRef.update({
      partialRefundAmount:   parseFloat(amount),
      partialRefundDate:     today,
      partialRefundStripeId: stripeRefundId,
    });
  }

  // Send partial refund email to customer
  const template = process.env.EMAILJS_PARTIAL_REFUND_TEMPLATE;
  if (template) {
    const fmtDate = s => { try { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return s; } };
    const name = booking.contactName || booking.firstName || booking.bizName || '';
    const emailData = {
      to_name:       name,
      to_email:      booking.email,
      booking_ref:   booking.bookingRef || bookingId,
      package_name:  booking.packageName || booking.contractLabel || 'Cleaning Service',
      date:          booking.cleanDate ? fmtDate(booking.cleanDate) : '—',
      refund_amount: `£${parseFloat(amount).toFixed(2)}`,
    };
    await sendEmail(template, emailData, EMAILJS_KEY.value()).catch(e => console.error('Partial refund email failed:', e.message));
  }

  res.json({ success: true, stripeRefundId });
});

// Creates a full commercial contract: master booking + all visit docs + calendar events in one atomic CF call.
// Same pattern as createRecurringBookings — no separate calendar step, no retry/duplicate risk.
exports.createContractBooking = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  if (!guard(req, res)) return;
  const { masterData, visitBase, contractStart, contractEnd, frequency, selectedDays = [], firstVisitMediaDiscount } = req.body;
  if (!masterData || !visitBase || !contractStart || !contractEnd || !frequency) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }

  const db  = admin.firestore();
  const now = new Date().toISOString();

  const genVisitDates = (start, end, freq, days) => {
    const dates = [];
    let d = new Date(start + 'T12:00:00');
    const e = new Date(end + 'T12:00:00');
    if (freq === 'daily') {
      const allowed = days.length > 0 ? days : [1,2,3,4,5];
      while (d <= e) { if (allowed.includes(d.getDay())) dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
    } else if (freq === 'thrice') {
      const tw = days.length === 3 ? days : [1,3,5];
      while (d <= e) { if (tw.includes(d.getDay())) dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
    } else if (freq === 'twice') {
      const tw = days.length === 2 ? days : [1,4];
      while (d <= e) { if (tw.includes(d.getDay())) dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
    } else if (freq === 'weekly')      { while (d <= e) { dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+7); } }
    else if (freq === 'fortnightly') { while (d <= e) { dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+14); } }
    else if (freq === 'monthly')     { while (d <= e) { dates.push(d.toISOString().slice(0,10)); d.setMonth(d.getMonth()+1); } }
    return dates;
  };

  const makeCalDesc = (fields, extra = []) => [
    fields.bookingRef && `Ref: ${fields.bookingRef}`,
    `Customer: ${fields.bizName || `${fields.firstName} ${fields.lastName}`.trim()}`,
    fields.email    && `Email: ${fields.email}`,
    fields.phone    && `Phone: ${fields.phone}`,
    fields.addr1    && `Address: ${fields.addr1}${fields.postcode ? ', '+fields.postcode : ''}`,
    fields.floor    && `Floor / Lift: ${fields.floor}`,
    fields.parking  && `Parking: ${fields.parking}`,
    fields.bathrooms && `Bathrooms: ${fields.bathrooms}`,
    `Keys: ${fields.keys || '—'}`,
    fields.addonsList && `Add-ons: ${fields.addonsList}`,
    fields.notes    && `Notes: ${fields.notes}`,
    ...extra,
  ].filter(Boolean).join('\n');

  const bookingRef = `LCW-${Date.now().toString().slice(-6)}`;
  const masterRef  = db.collection('bookings').doc();
  const name       = masterData.bizName || `${masterData.firstName} ${masterData.lastName}`.trim();

  // 1. Create master booking doc (no calendar event — master is an admin container, visits cover all dates)
  await masterRef.set({ ...masterData, bookingRef, createdAt: now, updatedAt: now });

  // 2. Create visit docs + calendar events in batches of 10
  const visitDates = genVisitDates(contractStart, contractEnd, frequency, selectedDays);
  const CHUNK = 10;
  for (let i = 0; i < visitDates.length; i += CHUNK) {
    const chunk = visitDates.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (date, idx) => {
      const isFirst   = i === 0 && idx === 0;
      const visitRef  = db.collection('bookings').doc();
      const visitData = {
        ...visitBase,
        contractId: masterRef.id,
        cleanDate:  date,
        ...(isFirst && firstVisitMediaDiscount ? { mediaConsentDiscount: 10 } : {}),
        createdAt:  now,
        updatedAt:  now,
      };
      await visitRef.set(visitData);
      try {
        const cal       = await getCalendarClient();
        const slotStart = toUTCISO(date, visitBase.cleanTime);
        const slotEnd   = new Date(new Date(slotStart).getTime() + 60000).toISOString();
        const calEvent  = await cal.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          resource: {
            summary:     `${visitBase.packageName || 'Commercial Cleaning'} — ${name}`,
            description: makeCalDesc(visitBase, [
              `Total: £${parseFloat(visitBase.totalPerVisit||0).toFixed(2)} | Charged on completion`,
            ]),
            start:   { dateTime: slotStart, timeZone: 'Europe/London' },
            end:     { dateTime: slotEnd,   timeZone: 'Europe/London' },
            colorId: calColorId('scheduled', frequency),
          },
        });
        await visitRef.update({ calendarEventId: calEvent.data.id });
      } catch (e) {
        console.error(`Calendar event failed for visit ${date}:`, e.message);
        await visitRef.update({ calendarSyncFailed: true }).catch(() => {});
      }
    }));
  }

  res.json({ success: true, masterBookingId: masterRef.id, bookingRef, visitCount: visitDates.length });
});

// Creates Google Calendar event(s) for bookings created directly via addDoc (Airbnb, contract visits, Add New Visit).
// Accepts { bookingId } or { bookingIds: [...] }.
exports.createCalendarEvent = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  if (!guard(req, res)) return;
  const db  = admin.firestore();
  const ids = req.body.bookingIds || (req.body.bookingId ? [req.body.bookingId] : []);
  if (!ids.length) { res.status(400).json({ error: 'bookingId or bookingIds required' }); return; }

  const results = [];
  const CHUNK = 10;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const chunkResults = await Promise.all(chunk.map(async bookingId => {
      try {
        const snap = await db.collection('bookings').doc(bookingId).get();
        if (!snap.exists) return { bookingId, error: 'not found' };
        const b = snap.data();
        if (!b.cleanDate || !b.cleanTime) return { bookingId, skipped: 'no date/time' };
        if (b.calendarEventId) return { bookingId, skipped: 'already has calendar event' };

        const name        = b.bizName ? `${b.bizName}` : `${b.firstName || ''} ${b.lastName || ''}`.trim();
        const packageName = b.packageName || b.contractLabel || 'Cleaning';
        // Estate Agent: use the clean type (End of Tenancy, etc.) as the calendar title
        const titleLabel  = (b.isEstateAgent && b.cleanType) ? b.cleanType : packageName;
        const slotStart   = toUTCISO(b.cleanDate, b.cleanTime);
        const slotEnd     = new Date(new Date(slotStart).getTime() + 60 * 1000).toISOString();

        const cal      = await getCalendarClient();
        const calEvent = await cal.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          resource: {
            summary:     `${titleLabel} — ${name}`,
            description: [
              b.bookingRef  && `Ref: ${b.bookingRef}`,
              `Customer: ${name}`,
              b.isEstateAgent && b.cleanType && `Type of clean: ${b.cleanType}`,
              b.email       && `Email: ${b.email}`,
              b.phone       && `Phone: ${b.phone}`,
              b.addr1       && `Address: ${b.addr1}${b.postcode ? ', ' + b.postcode : ''}`,
              b.floor       && `Floor / Lift: ${b.floor}`,
              b.parking     && `Parking: ${b.parking}`,
              b.bathrooms   && `Bathrooms: ${b.bathrooms}`,
              `Keys: ${b.keys || '—'}`,
              b.addons?.length && `Add-ons: ${b.addons.map(a => a.name || a.label).join(', ')}`,
              b.hasPets !== undefined && `Pets: ${b.hasPets ? `Yes${b.petTypes ? ' — ' + b.petTypes : ''}` : 'No'}`,
              b.notes       && `Notes: ${b.notes}`,
              `Total: £${parseFloat(b.total || 0).toFixed(2)}`,
            ].filter(Boolean).join('\n'),
            start:   { dateTime: slotStart, timeZone: 'Europe/London' },
            end:     { dateTime: slotEnd,   timeZone: 'Europe/London' },
            colorId: calColorId(b.status || 'pending_deposit', b.frequency || 'one-off'),
          },
        });
        await db.collection('bookings').doc(bookingId).update({ calendarEventId: calEvent.data.id });
        return { bookingId, calendarEventId: calEvent.data.id };
      } catch (e) {
        console.error(`createCalendarEvent failed for ${bookingId}:`, e.message);
        return { bookingId, error: e.message };
      }
    }));
    results.push(...chunkResults);
  }
  res.json({ success: true, results });
});

exports.sendContractPaymentReminders = onSchedule({ schedule: 'every day 09:00', secrets: [EMAILJS_KEY] }, async () => {
  const template = process.env.EMAILJS_PAYMENT_REMINDER_TEMPLATE;
  if (!template) return;

  const db      = admin.firestore();
  const today   = new Date();
  const target  = new Date(today);
  target.setDate(target.getDate() + 7);
  const targetStr = target.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const snap = await db.collection('bookings')
    .where('isContract', '==', true)
    .get();

  const fmtD = s => { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };

  for (const doc of snap.docs) {
    const b = doc.data();
    if (b.status?.startsWith('cancelled')) continue;
    if (b.contractEndDate && b.contractEndDate < targetStr) continue;

    // Work out the next unpaid period start date
    const paidKeys = Object.keys(b.monthlyPayments || {}).filter(k => b.monthlyPayments[k] === 'paid').sort();
    let nextDue;
    if (paidKeys.length === 0) {
      nextDue = b.contractStartDate || b.cleanDate;
    } else {
      const last = new Date(paidKeys[paidKeys.length - 1] + 'T12:00:00');
      last.setMonth(last.getMonth() + 1);
      nextDue = last.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    }

    if (nextDue !== targetStr) continue;
    if (b.paymentReminderSentFor === nextDue) continue; // already sent for this period

    const name         = b.contactName || b.firstName || b.bizName || '';
    const businessName = b.bizName || `${b.firstName || ''} ${b.lastName || ''}`.trim();
    const fixedBase    = parseFloat(b.monthlyBaseValue || 0);

    // Previous period = the period just before nextDue (already closed)
    const nextDueDate  = new Date(nextDue + 'T12:00:00');
    const prevEnd      = new Date(nextDueDate); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart    = new Date(nextDueDate); prevStart.setMonth(prevStart.getMonth() - 1);
    const prevStartStr = prevStart.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const prevEndStr   = prevEnd.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

    const visitsSnap   = await db.collection('bookings').where('contractId', '==', doc.id).get();
    const prevAddons   = visitsSnap.docs
      .map(d => d.data())
      .filter(v => v.cleanDate >= prevStartStr && v.cleanDate <= prevEndStr)
      .reduce((s, v) => s + parseFloat(v.addonTotal || 0), 0);

    const totalAmount  = fixedBase + prevAddons;
    const amount       = `£${totalAmount.toFixed(2)}`;

    try {
      await sendEmail(template, {
        to_name:       name,
        to_email:      b.email,
        business_name: businessName,
        booking_ref:   b.bookingRef || '',
        service:       b.packageName || b.contractLabel || '',
        frequency:     b.frequencyLabel || b.frequency || '',
        amount,
        base_amount:   `£${fixedBase.toFixed(2)}`,
        addon_amount:  prevAddons > 0 ? `£${prevAddons.toFixed(2)}` : '—',
        due_date:      fmtD(nextDue),
      }, EMAILJS_KEY.value());

      await doc.ref.update({ paymentReminderSentFor: nextDue, paymentReminderSentAt: new Date().toISOString() });
      console.log(`[contractReminder] Sent payment reminder for contract ${doc.id} (${businessName}), due ${nextDue}`);
    } catch (e) {
      console.error(`[contractReminder] Failed for ${doc.id}:`, e.message);
    }
  }
});

