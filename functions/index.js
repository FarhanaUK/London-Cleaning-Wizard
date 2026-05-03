// v2
const { onRequest }    = require('firebase-functions/v2/https');
const { onSchedule }   = require('firebase-functions/v2/scheduler');
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

// Cache calendar clients per scope so auth is only initialised once per container instance
const _calCache = {};
async function getCalendarClient(scope) {
  const s = scope || 'https://www.googleapis.com/auth/calendar';
  if (!_calCache[s]) {
    const auth = new google.auth.GoogleAuth({ keyFile: 'service-account.json', scopes: [s] });
    _calCache[s] = google.calendar({ version: 'v3', auth: await auth.getClient() });
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
    property_type:   `${b.propertyType} · ${b.size}`,
    frequency:       b.frequency || 'One-off',
    floor:           clean(b.floor||'—'),
    parking:         clean(b.parking||'—'),
    pets:            b.hasPets ? `Yes — ${clean(b.petTypes||'not specified')}` : 'No',
    signature_touch: b.signatureTouch !== false ? 'Opted in' : `Opted out${b.signatureTouchNotes ? ` — ${clean(b.signatureTouchNotes)}` : ''}`,
    source:          clean(b.source||'—'),
    is_returning:    b.isReturning ? 'Returning customer' : 'New customer',
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
        packageName: bookingData.packageName || '',
        depositAmount: amount / 100,
        email: (bookingData.email || '').toLowerCase(),
        emailSent: false, emailSentAt: null,
        converted: false, convertedAt: null,
      });
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

  const ref = `LCW-${Date.now().toString().slice(-6)}`;
  const id  = db.collection('bookings').doc().id;

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
      keys: clean(d.keys||''), notes: clean(d.notes||''),
      hasPets: d.hasPets || false, petTypes: clean(d.petTypes||''),
      signatureTouch: d.signatureTouch !== false, signatureTouchNotes: clean(d.signatureTouchNotes||''),
      package: d.package, packageName: d.packageName, size: d.size,
      frequency: d.frequency || 'one-off', addons: d.addons || [], isAirbnb: d.isAirbnb || false,
      cleanDate: d.cleanDate, cleanTime: d.cleanTime,
      cleanDateUTC: toUTCISO(d.cleanDate, d.cleanTime),
      total: d.total, deposit: d.deposit, remaining: d.remaining,
      ...(d.launchDiscount ? { launchDiscount: d.launchDiscount, originalTotal: d.originalTotal } : {}),
      stripeDepositIntentId: d.stripeDepositIntentId,
      stripeCustomerId: d.stripeCustomerId || '',
      status: d.stripeDepositIntentId === 'manual' ? 'pending_deposit' : 'deposit_paid',
      isPhoneBooking: d.isPhoneBooking || false,
      source: clean(d.source||''), createdAt: new Date(),
      marketingOptOut: d.marketingOptOut === true,
      doNotContact:    d.marketingOptOut === true,
    });
    tx.set(cRef, {
      firstName: clean(d.firstName), lastName: clean(d.lastName), phone: clean(d.phone),
      addr1: clean(d.addr1), postcode: clean(d.postcode).toUpperCase(),
      floor: clean(d.floor||''), parking: clean(d.parking||''),
      keys: clean(d.keys||''), notes: clean(d.notes||''),
      hasPets: d.hasPets || false, petTypes: clean(d.petTypes||''),
      signatureTouch: d.signatureTouch !== false, signatureTouchNotes: clean(d.signatureTouchNotes||''),
      bookingCount: count + 1, lastBookingId: id, lastBookingRef: ref,
      lastPackage: d.package, lastPackageName: d.packageName, lastSize: d.size,
      lastPrice: d.total, lastDate: d.cleanDate, lastCleaner: '',
      source: clean(d.source||''),
      updatedAt: new Date(),
      ...(cSnap.exists ? {} : { firstBookingDate: new Date() }),
      ...(d.stripeCustomerId ? { stripeCustomerId: d.stripeCustomerId } : {}),
      ...(d.frequency && d.frequency !== 'one-off' ? {
        recurringActive:      true,
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
            `Keys: ${d.keys || 'N/A'}`,
            `Add-ons: ${(d.addons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Pets: ${d.hasPets ? `Yes — ${d.petTypes || 'not specified'}` : 'No'}`,
            `Signature Touch: ${d.signatureTouch !== false ? 'Opted in' : `Opted out${d.signatureTouchNotes ? ` — ${d.signatureTouchNotes}` : ''}`}`,
            `Cleaner: ${d.assignedStaff || 'Unassigned'}`,
            `Notes: ${d.notes || 'None'}`,
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
  }

  // Pre-create all recurring follow-up bookings within the 28-day window
  if (d.frequency && d.frequency !== 'one-off') {
    try {
      // Discount applies from 2nd clean onwards — use recurringTotal (full pre-discount price) if available
      const freqSave     = FREQ_SAVINGS[d.frequency] || 0;
      const discountedTotal = Math.max(0, (d.recurringTotal || d.total) - freqSave);

      const LEAD   = 28;
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
        const existSnap = await db.collection('bookings')
          .where('email', '==', d.email.toLowerCase())
          .where('cleanDate', '==', nextStr).get();

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
            createdAt: new Date(),
          };
          await db.collection('bookings').doc(rId).set(recurringData);
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
                  `Floor / Lift: ${d.floor || '—'}`, `Parking: ${d.parking || '—'}`,
                  `Keys: ${d.keys || 'N/A'}`,
                  `Add-ons: ${(d.addons||[]).map(a => a.name).join(', ') || 'None'}`,
                  `Pets: ${d.hasPets ? `Yes — ${d.petTypes || 'not specified'}` : 'No'}`,
                  `Notes: ${d.notes || 'None'}`,
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
      console.error('Failed to pre-create recurring bookings:', recurErr.message);
    }
  }

  // Phone bookings: skip emails until deposit is actually paid
  if (!d.isPhoneBooking) {
    const eData = buildBookingEmailData({ ...d, bookingRef: ref });
    await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
      { ...eData, to_name: d.firstName, to_email: d.email }, EMAILJS_KEY.value());
    await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
      { ...eData, to_email: 'bookings@londoncleaningwizard.com',
        customer_name: `${d.firstName} ${d.lastName}`,
        customer_phone: d.phone, customer_email: d.email },
      EMAILJS_KEY.value());
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

  if (b.status === 'fully_paid') {
    res.status(400).json({ error: 'This booking has already been fully paid.' }); return;
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
        payment_note:        'Your next clean will be scheduled automatically. No action is needed — payment will be taken in the same way after each visit.',
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
      booking_type:         b.frequency && b.frequency !== 'one-off' ? 'First Clean (Recurring Series)' : 'One-off Clean',
      payment_note:         b.frequency && b.frequency !== 'one-off' ? 'Your next clean will be scheduled automatically at your discounted recurring rate. No deposit required — payment will be taken after each visit.' : '',
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

    // Fetch all auto-recurring bookings for this customer (simple single-field query)
    const allSnap = await db.collection('bookings')
      .where('email', '==', email)
      .where('isAutoRecurring', '==', true)
      .get();

    if (allSnap.empty) return { consecutiveAlert: false };

    // Sort by cleanDate ascending
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
  if (['fully_paid', 'cancelled_full_refund', 'cancelled_partial_refund', 'cancelled_no_refund'].includes(b.status)) {
    res.status(400).json({ error: 'This booking cannot be cancelled in its current status.' }); return;
  }
  const hoursUntil = (new Date(b.cleanDateUTC) - new Date()) / 3600000;

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
    if (b.frequency && b.frequency !== 'one-off') {
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

  const isRecurring = b.frequency && b.frequency !== 'one-off';
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
  if (b.frequency && b.frequency !== 'one-off') {
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
exports.updateBooking = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const {
    bookingId, updateCustomerProfile,
    cleanDate, cleanTime,
    firstName, lastName, email, phone,
    packageId, packageName, sizeId, frequency, addons,
    hasPets, petTypes, signatureTouch, signatureTouchNotes,
    addr1, postcode, floor, parking, keys, notes,
    total, remaining, assignedStaff, actualStart, actualFinish,
  } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const current = snap.data();
  const updates = { updatedAt: new Date() };
  if (assignedStaff !== undefined) updates.assignedStaff = assignedStaff;
  if (actualStart  !== undefined) updates.actualStart  = actualStart;
  if (actualFinish !== undefined) updates.actualFinish = actualFinish;

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
  if (addons !== undefined) {
    updates.addons = newAddons;
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
  if (remaining !== undefined) updates.remaining = remaining;

  if (hasPets             !== undefined) updates.hasPets             = hasPets;
  if (petTypes            !== undefined) updates.petTypes            = clean(petTypes);
  if (signatureTouch      !== undefined) updates.signatureTouch      = signatureTouch;
  if (signatureTouchNotes !== undefined) updates.signatureTouchNotes = clean(signatureTouchNotes || '');

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

  // Send update email when anything meaningful to the customer changed (not for pending_deposit — booking not yet confirmed)
  if (changes.length > 0 && process.env.EMAILJS_UPDATE_TEMPLATE && current.status !== 'pending_deposit') {
    const addonsList = (newAddons || []).map(a => a.name).join(', ') || 'None';
    const newRemaining = remaining !== undefined ? parseFloat(remaining) : parseFloat(current.remaining || 0);
    const newTotal     = total     !== undefined ? parseFloat(total)     : parseFloat(current.total     || 0);
    const updateData = {
      booking_ref:     current.bookingRef,
      package_name:    newPackageName,
      date:            newDate.split('-').reverse().join('/'),
      time:            newTime,
      address:         `${newAddr1}, ${newPostcode}`,
      frequency:       newFrequency || 'One-off',
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
            `Keys: ${newKeys || 'N/A'}`,
            `Add-ons: ${(newAddons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Pets: ${(hasPets !== undefined ? hasPets : current.hasPets) ? `Yes — ${petTypes !== undefined ? clean(petTypes||'') : current.petTypes || 'not specified'}` : 'No'}`,
            `Signature Touch: ${(signatureTouch !== undefined ? signatureTouch : current.signatureTouch) !== false ? 'Opted in' : `Opted out${(signatureTouchNotes !== undefined ? signatureTouchNotes : current.signatureTouchNotes) ? ` — ${signatureTouchNotes !== undefined ? clean(signatureTouchNotes||'') : current.signatureTouchNotes}` : ''}`}`,
            `Cleaner: ${assignedStaff !== undefined ? (assignedStaff || 'Unassigned') : (current.assignedStaff || 'Unassigned')}`,
            `Notes: ${newNotes || 'None'}`,
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
                `Frequency: ${newFrequency}`,
                `Floor / Lift: ${floor !== undefined ? newFloor : fd.floor || '—'}`,
                `Parking: ${parking !== undefined ? newParking : fd.parking || '—'}`,
                `Keys: ${keys !== undefined ? newKeys : fd.keys || 'N/A'}`,
                `Add-ons: ${((addons !== undefined ? newAddons : fd.addons) || []).map(a => a.name).join(', ') || 'None'}`,
                `Notes: ${notes !== undefined ? newNotes : fd.notes || 'None'}`,
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

// ── 10a. Email deposit link to customer ──────────────────────
exports.emailDepositLink = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  const paymentLink = `https://londoncleaningwizard.com/pay-deposit?bookingId=${bookingId}`;
  await sendEmail(process.env.EMAILJS_DEPOSIT_LINK_TEMPLATE, {
    to_name:        b.firstName,
    to_email:       b.email,
    booking_ref:    b.bookingRef,
    package_name:   b.packageName,
    clean_date:     b.cleanDate.split('-').reverse().join('/'),
    clean_time:     b.cleanTime,
    address:        `${b.addr1}, ${b.postcode}`,
    deposit_amount: parseFloat(b.deposit).toFixed(2),
    payment_link:   paymentLink,
  }, EMAILJS_KEY.value());
  res.json({ success: true });
});

// ── 10b. Notify customer of assigned cleaner ─────────────────
exports.notifyCleanerAssigned = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, cleanerName } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const b = snap.data();
  const assignedCleaner = cleanerName || b.assignedStaff;
  if (!assignedCleaner) { res.status(400).json({ error: 'No cleaner assigned to this booking' }); return; }
  if (!process.env.EMAILJS_CLEANER_TEMPLATE) { res.status(500).json({ error: 'Cleaner notification template not configured' }); return; }
  // Look up cleaner photo from staff collection
  const FALLBACK_PHOTO = 'https://londoncleaningwizard.com/wizard.png';
  let cleanerPhoto = FALLBACK_PHOTO;
  try {
    const staffSnap = await db.collection('staff').where('name', '==', assignedCleaner).limit(1).get();
    if (!staffSnap.empty) cleanerPhoto = staffSnap.docs[0].data().photoURL || FALLBACK_PHOTO;
  } catch (e) { /* photo optional */ }
  await sendEmail(process.env.EMAILJS_CLEANER_TEMPLATE, {
    to_name:       b.firstName,
    to_email:      b.email,
    cleaner_name:  assignedCleaner,
    cleaner_photo: cleanerPhoto,
    booking_ref:   b.bookingRef,
    date:          b.cleanDate.split('-').reverse().join('/'),
    time:          b.cleanTime,
    package_name:  b.packageName,
    address:       `${b.addr1}, ${b.postcode}`,
  }, EMAILJS_KEY.value());
  await snap.ref.update({ lastNotifiedCleaner: assignedCleaner, lastNotifiedAt: new Date() });
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
    bookingRef:   b.bookingRef,
    clientSecret: b.pendingDepositClientSecret,
    frequency:    b.frequency || 'one-off',
    freqSaving:   FREQ_SAVINGS[b.frequency] || 0,
  });
});

// ── 12. Confirm deposit payment (called after Stripe success) ─
exports.confirmDepositPayment = onRequest({ secrets:[STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, paymentIntentId, marketingOptOut } = req.body;
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
  const updateData = {
    status:               'deposit_paid',
    stripeDepositIntentId: paymentIntentId,
    stripeCustomerId:      customerId,
    depositPaidAt:         new Date(),
    pendingDepositClientSecret: admin.firestore.FieldValue.delete(),
    pendingDepositCustomerId:   admin.firestore.FieldValue.delete(),
    pendingDepositPIId:         admin.firestore.FieldValue.delete(),
  };
  if (typeof marketingOptOut === 'boolean') {
    updateData.marketingOptOut = marketingOptOut;
    updateData.doNotContact    = marketingOptOut;
  }
  await snap.ref.update(updateData);
  // Backfill stripeCustomerId onto any pre-created recurring bookings missing it
  if (customerId && b.email) {
    const recurringSnap = await db.collection('bookings')
      .where('email', '==', b.email)
      .where('isAutoRecurring', '==', true)
      .where('stripeCustomerId', '==', '')
      .get();
    const backfills = recurringSnap.docs.map(d => d.ref.update({ stripeCustomerId: customerId }));
    await Promise.all(backfills).catch(() => {});
  }

  res.json({ success: true });
});

// ── 13. Delete booking (admin only) ──────────────────────────
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

// ── 14b. Stop recurring series ────────────────────────────────
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
          source:          c.recurringSource || c.source || '',
          assignedStaff:   c.assignedStaff || '',
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
                `Keys: ${c.keys || 'N/A'}`,
                `Add-ons: ${(c.recurringAddons||[]).map(a => a.name).join(', ') || 'None'}`,
                `Pets: ${c.hasPets ? `Yes — ${c.petTypes || 'not specified'}` : 'No'}`,
                `Notes: ${c.notes || 'None'}`,
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
            const cancelData = {
              booking_ref:    b.bookingRef, package_name: b.packageName,
              date:           b.cleanDate.split('-').reverse().join('/'),
              time:           b.cleanTime,
              address:        `${b.addr1}, ${b.postcode}`,
              refund_amount:  `£${refundAmt.toFixed(2)}`,
              refund_message: `£${refundAmt.toFixed(2)} will be returned to your original payment method within 5–10 business days.`,
            };
            await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE,
              { ...cancelData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
            await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE,
              { ...cancelData, to_email: 'bookings@londoncleaningwizard.com',
                customer_name: `${b.firstName} ${b.lastName}`,
                customer_email: b.email, customer_phone: b.phone,
                notice_given: 'Refunded via Stripe dashboard',
              }, EMAILJS_KEY.value()).catch(() => {});
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

    await db.runTransaction(async tx => {
      const pendingSnap = await tx.get(pendingRef);
      if (!pendingSnap.exists) { claimed = false; return; }

      pd = pendingSnap.data();

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
        keys: clean(pd.keys||''), notes: clean(pd.notes||''),
        hasPets: pd.hasPets || false, petTypes: clean(pd.petTypes||''),
        signatureTouch: pd.signatureTouch !== false, signatureTouchNotes: clean(pd.signatureTouchNotes||''),
        package: pd.package, packageName: pd.packageName, size: pd.size,
        frequency: pd.frequency || 'one-off', addons: pd.addons || [], isAirbnb: pd.isAirbnb || false,
        cleanDate: pd.cleanDate, cleanTime: pd.cleanTime,
        cleanDateUTC: toUTCISO(pd.cleanDate, pd.cleanTime),
        total: pd.total, deposit: pd.deposit, remaining: pd.remaining,
        stripeDepositIntentId: piId,
        stripeCustomerId: pd.stripeCustomerId || pi.customer || '',
        status: 'deposit_paid', isPhoneBooking: false,
        source: clean(pd.source||''), createdAt: new Date(),
        marketingOptOut: pd.marketingOptOut === true,
        doNotContact:    pd.marketingOptOut === true,
      });
      tx.set(cRef, {
        firstName: clean(pd.firstName), lastName: clean(pd.lastName), phone: clean(pd.phone),
        addr1: clean(pd.addr1), postcode: clean(pd.postcode).toUpperCase(),
        floor: clean(pd.floor||''), parking: clean(pd.parking||''),
        keys: clean(pd.keys||''), notes: clean(pd.notes||''),
        hasPets: pd.hasPets || false, petTypes: clean(pd.petTypes||''),
        signatureTouch: pd.signatureTouch !== false, signatureTouchNotes: clean(pd.signatureTouchNotes||''),
        bookingCount: count + 1, lastBookingId: id, lastBookingRef: ref,
        lastPackage: pd.package, lastPackageName: pd.packageName, lastSize: pd.size,
        lastPrice: pd.total, lastDate: pd.cleanDate, lastCleaner: '',
        source: clean(pd.source||''),
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
        } : {}),
      }, { merge: true });

      claimed = true;
    });

    if (!claimed) { res.json({ received: true }); return; }

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
            `Keys: ${pd.keys || 'N/A'}`,
            `Add-ons: ${(pd.addons||[]).map(a => a.name).join(', ') || 'None'}`,
            `Pets: ${pd.hasPets ? `Yes — ${pd.petTypes || 'not specified'}` : 'No'}`,
            `Notes: ${pd.notes || 'None'}`,
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
  const total       = passedTotal !== undefined ? parseFloat(passedTotal) : Math.max(0, (parseFloat(lb.total) || 0) - freqSave);
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
    recurringFrequency: frequency,
    recurringDay,
    recurringTime: cleanTime,
    recurringPackage: pkgId,
    recurringPackageName: pkgName,
    recurringSize: lb.size,
    recurringTotal: parseFloat(lb.recurringTotal || lb.originalTotal || lb.total) || 0,
    recurringAddons: lb.addons || [],
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
          `Frequency: ${frequency}`,
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

  if (process.env.EMAILJS_CONFIRM_TEMPLATE) {
    await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE, {
      to_name:      lb.firstName,
      to_email:     email,
      booking_ref:  ref,
      package_name: lb.packageName,
      date:         cleanDate.split('-').reverse().join('/'),
      time:         cleanTime,
      address:      `${lb.addr1}, ${lb.postcode}`,
      frequency,
      total:        `£${total.toFixed(2)}`,
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

    for (const doc of snap.docs) {
      const b = doc.data();
      if (b.isAutoRecurring || b.recurringUpgradeEmailSent || b.marketingOptOut || b.doNotContact) continue;
      if (!b.email || !b.firstName) continue;
      if (unsubbed.has(b.email.toLowerCase())) continue;

      const custDoc = await db.collection('customers').doc(b.email.toLowerCase()).get();
      if (custDoc.data()?.recurringActive) continue;

      const base              = parseFloat(b.total) || 0;
      const weeklyPrice       = `£${Math.max(0, base - 30).toFixed(2)}`;
      const fortnightlyPrice  = `£${Math.max(0, base - 15).toFixed(2)}`;
      const monthlyPrice      = `£${Math.max(0, base - 7).toFixed(2)}`;

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

      await doc.ref.update({ recurringUpgradeEmailSent: true });
    }
  }
);

// ── 17. Send review request emails at 10am for yesterday's completed jobs ──
exports.sendReviewEmails = onSchedule({ schedule: 'every day 10:00', secrets: [EMAILJS_KEY] }, async () => {
  const db        = admin.firestore();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

  const snap = await db.collection('bookings')
    .where('status', '==', 'fully_paid')
    .where('cleanDate', '==', yesterdayStr)
    .get();

  for (const doc of snap.docs) {
    const b = doc.data();
    await sendEmail(process.env.EMAILJS_REVIEW_TEMPLATE, {
      to_name:      b.firstName,
      to_email:     b.email,
      package_name: b.packageName,
      booking_ref:  b.bookingRef,
    }, EMAILJS_KEY.value()).catch(e => console.error('Review email failed:', b.bookingRef, e.message));
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
    if (!d.email || !d.firstName || d.abandonedEmailSent || unsubbed.has(d.email.toLowerCase())) return;
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
  const { bookingId, doNotContact } = req.body;
  if (!bookingId || typeof doNotContact !== 'boolean') {
    res.status(400).json({ error: 'Missing bookingId or doNotContact' }); return;
  }
  const db = admin.firestore();
  await db.collection('bookings').doc(bookingId).update({ doNotContact });
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

