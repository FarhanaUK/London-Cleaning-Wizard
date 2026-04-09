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

const STRIPE_KEY          = defineSecret('STRIPE_SECRET_KEY');
const EMAILJS_KEY         = defineSecret('EMAILJS_PRIVATE_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

async function sendEmail(templateId, params, privateKey) {
  return emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    templateId,
    params,
    { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey }
  );
}

async function getCalendarClient(scope) {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: [scope || 'https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth: await auth.getClient() });
}

function buildBookingEmailData(b) {
  return {
    booking_ref:     b.bookingRef,
    package_name:    b.packageName,
    date:            b.cleanDate.split('-').reverse().join('/'),
    date_subject:    b.cleanDate.split('-').reverse().join('.'),
    time:            b.cleanTime,
    address:         `${b.addr1}, ${b.postcode}`,
    total:           `£${b.total}`,
    deposit_paid:    `£${b.deposit}`,
    remaining:       `£${b.remaining}`,
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
    terms_summary: `By completing this booking you agreed to the following key terms:

1. Payment: A 30% deposit was charged at the time of booking. The remaining 70% balance will be charged automatically once your clean is marked as complete by our team.

2. Cancellation: Full refund if cancelled more than 48 hours before your scheduled clean. No refund if cancelled less than 48 hours before the clean.

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
  const { amount, bookingRef } = req.body;
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000000) {
    res.status(400).json({ error:'Invalid amount' }); return;
  }
  const stripe   = new Stripe(STRIPE_KEY.value());
  const customer = await stripe.customers.create();
  const intent   = await stripe.paymentIntents.create({
    amount, currency: 'gbp',
    customer: customer.id,
    setup_future_usage: 'off_session',
    metadata: { bookingRef },
  });
  res.json({ clientSecret: intent.client_secret, customerId: customer.id });
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

  await db.runTransaction(async tx => {
    const bRef  = db.collection('bookings').doc(id);
    const cRef  = db.collection('customers').doc(d.email.toLowerCase());
    const cSnap = await tx.get(cRef);
    const count = cSnap.exists ? (cSnap.data().bookingCount || 0) : 0;
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
      stripeDepositIntentId: d.stripeDepositIntentId,
      stripeCustomerId: d.stripeCustomerId || '',
      status: d.stripeDepositIntentId === 'manual' ? 'pending_deposit' : 'deposit_paid',
      isPhoneBooking: d.isPhoneBooking || false,
      source: clean(d.source||''), createdAt: new Date(),
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
      updatedAt: new Date(),
      ...(cSnap.exists ? {} : { firstBookingDate: new Date(), source: clean(d.source||'') }),
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
        recurringTotal:       d.total,
        recurringDeposit:     d.deposit,
        recurringRemaining:   d.remaining,
        recurringSource:      clean(d.source||''),
      } : {}),
    }, { merge: true });
  });

  // Write to your bookings calendar — for your reference only
  // Does NOT affect availability checks
  try {
    const calendar  = await getCalendarClient();
    const slotStart = toUTCISO(d.cleanDate, d.cleanTime);
    const slotEnd   = new Date(new Date(slotStart).getTime() + 3 * 60 * 60 * 1000).toISOString();
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
            `Notes: ${d.notes || 'None'}`,
            `Total: £${d.total} | Deposit: £${d.deposit} | Remaining: £${d.remaining}`,
          ].join('\n'),
        start: { dateTime: slotStart, timeZone: 'Europe/London' },
        end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
        colorId: '2',
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
      // Discount applies from 2nd clean onwards
      const FREQ_SAVINGS = { weekly: 30, fortnightly: 15, monthly: 7 };
      const freqSave     = FREQ_SAVINGS[d.frequency] || 0;
      const discountedTotal = Math.max(0, d.total - freqSave);

      const LEAD   = 28;
      const today  = new Date(); today.setHours(0, 0, 0, 0);
      const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + LEAD);

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
            const slotEnd   = new Date(new Date(slotStart).getTime() + 3 * 60 * 60 * 1000).toISOString();
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
                  `Total: £${d.total} | No deposit — full amount charged on completion`,
                  `⚙️ Auto-created at booking time (pre-scheduled)`,
                ].join('\n'),
                start: { dateTime: slotStart, timeZone: 'Europe/London' },
                end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
                colorId: '6',
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
    await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});
    const receiptData = {
      booking_ref:         b.bookingRef,  package_name:   b.packageName,
      date:                b.cleanDate.split('-').reverse().join('/'),
      address:             `${b.addr1}, ${b.postcode}`,
      total:               `£${b.total}`, deposit_paid:   `£${b.deposit}`,
      amount_charged:      `£${b.remaining}`,
      stripe_deposit_pi:   'Manual payment', stripe_remaining_pi: 'Manual payment', stripe_customer_id: '—',
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
          customer_phone: b.phone, amount: `£${b.total}`,
          date: b.cleanDate.split('-').reverse().join('/'), error_message: errMsg,
        }, EMAILJS_KEY.value()).catch(() => {});
        res.status(400).json({ error: 'Payment was not completed successfully. Please retry.' }); return;
      }
      await snap.ref.update({ status: 'fully_paid', paidAt: new Date(), stripeRemainingIntentId: intent.id });
      await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});
      const receiptData = {
        booking_ref:         b.bookingRef,  package_name:        b.packageName,
        date:                b.cleanDate.split('-').reverse().join('/'),
        address:             `${b.addr1}, ${b.postcode}`,
        total:               `£${b.total}`, deposit_paid:        '£0 (recurring — no deposit)',
        amount_charged:      `£${b.total}`,
        stripe_deposit_pi:   '—',          stripe_remaining_pi: intent.id,
        stripe_customer_id:  b.stripeCustomerId,
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
        customer_phone: b.phone, amount: `£${b.total}`,
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
        amount:         `£${b.remaining}`,
        date:           b.cleanDate.split('-').reverse().join('/'),
        error_message:  errMsg,
      }, EMAILJS_KEY.value());
      res.status(400).json({ error: 'Payment was not completed successfully. Please retry.' }); return;
    }

    await snap.ref.update({
      status: 'fully_paid',
      paidAt: new Date(),
      stripeRemainingIntentId: intent.id,
    });
    await db.collection('customers').doc(b.email.toLowerCase()).update({ lastDate: b.cleanDate, updatedAt: new Date() }).catch(() => {});

    const receiptData = {
      booking_ref:          b.bookingRef,
      package_name:         b.packageName,
      date:                 b.cleanDate.split('-').reverse().join('/'),
      address:              `${b.addr1}, ${b.postcode}`,
      total:                `£${b.total}`,
      deposit_paid:         `£${b.deposit}`,
      amount_charged:       `£${b.remaining}`,
      stripe_deposit_pi:    b.stripeDepositIntentId || '—',
      stripe_remaining_pi:  intent.id,
      stripe_customer_id:   customerId || '—',
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
      amount:         `£${b.remaining}`,
      date:           b.cleanDate.split('-').reverse().join('/'),
      error_message:  e.message,
    }, EMAILJS_KEY.value()).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

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
      // Late cancellation — charge 50% via saved card
      const feePence = Math.round(b.total * 50);
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
      const cancelData = { booking_ref: b.bookingRef, package_name: b.packageName, date: b.cleanDate.split('-').reverse().join('/'), time: b.cleanTime, address: `${b.addr1}, ${b.postcode}`, refund_amount: `£${feeAmt.toFixed(2)} late cancellation fee charged`, refund_message: `A late cancellation fee of £${feeAmt.toFixed(2)} has been charged as the cancellation was made less than 48 hours before the scheduled clean.` };
      await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
      await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email, customer_phone: b.phone, notice_given: `${hoursUntil.toFixed(1)} hours notice — 50% late fee charged` }, EMAILJS_KEY.value()).catch(() => {});
      res.json({ success: true, status: 'cancelled_late_fee', lateFeeCharged: feeAmt }); return;
    }
    // >= 48hrs notice — cancel free
    await snap.ref.update({ status: 'cancelled_no_refund', cancelledAt: new Date(), cancellationReason: clean(reason||''), refundAmount: 0 });
    const cancelData = { booking_ref: b.bookingRef, package_name: b.packageName, date: b.cleanDate.split('-').reverse().join('/'), time: b.cleanTime, address: `${b.addr1}, ${b.postcode}`, refund_amount: 'No charge', refund_message: 'Your recurring clean has been cancelled. No charge has been applied.' };
    await sendEmail(process.env.EMAILJS_CANCEL_TEMPLATE, { ...cancelData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
    await sendEmail(process.env.EMAILJS_CANCEL_ADMIN_TEMPLATE, { ...cancelData, to_email: 'bookings@londoncleaningwizard.com', customer_name: `${b.firstName} ${b.lastName}`, customer_email: b.email, customer_phone: b.phone, notice_given: `${hoursUntil.toFixed(1)} hours notice — no charge` }, EMAILJS_KEY.value()).catch(() => {});

    // Check for 2 consecutive cancellations — only counts if the immediately previous booking in the series was also cancelled
    let consecutiveAlert = false;
    try {
      const prevSnap = await db.collection('bookings')
        .where('email', '==', b.email.toLowerCase())
        .where('isAutoRecurring', '==', true)
        .where('cleanDate', '<', b.cleanDate)
        .orderBy('cleanDate', 'desc')
        .limit(1)
        .get();
      if (!prevSnap.empty) {
        const prev = prevSnap.docs[0].data();
        const prevCancelled = prev.status && prev.status.startsWith('cancelled');
        if (prevCancelled) {
          consecutiveAlert = true;
          await db.collection('customers').doc(b.email.toLowerCase()).update({
            consecutiveCancellations: 2, updatedAt: new Date(),
          }).catch(() => {});
        } else {
          // Reset counter — previous was not cancelled
          await db.collection('customers').doc(b.email.toLowerCase()).update({
            consecutiveCancellations: 1, updatedAt: new Date(),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Consecutive cancellation check failed:', e.message);
    }

    res.json({ success: true, status: 'cancelled_no_refund', refundAmount: 0, consecutiveAlert }); return;
  }

  // ── Standard booking cancellation ───────────────────────────
  const refundPence = hoursUntil >= 48 ? b.deposit * 100 : hoursUntil >= 24 ? Math.round(b.deposit * 50) : 0;
  const refundAmt   = refundPence / 100;
  const status      = hoursUntil >= 48 ? 'cancelled_full_refund' : hoursUntil >= 24 ? 'cancelled_partial_refund' : 'cancelled_no_refund';
  const refundMsg   = refundPence > 0 ? `£${refundAmt.toFixed(2)} will be returned to your original payment method within 5–10 business days.` : 'No refund is applicable as the cancellation was made less than 24 hours before the scheduled clean.';
  const noticeMsg   = hoursUntil >= 48 ? `${hoursUntil.toFixed(1)} hours notice — full refund applied` : hoursUntil >= 24 ? `${hoursUntil.toFixed(1)} hours notice — 50% refund applied` : `${hoursUntil > 0 ? hoursUntil.toFixed(1) : '0'} hours notice — no refund applied`;

  if (refundPence > 0 && b.stripeDepositIntentId && b.stripeDepositIntentId !== 'manual') {
    await stripe.refunds.create({ payment_intent:b.stripeDepositIntentId, amount:refundPence, reason:'requested_by_customer' });
  }
  await snap.ref.update({ status, cancelledAt:new Date(), cancellationReason:clean(reason||''), refundAmount:refundAmt });

  const cancelData = {
    booking_ref:  b.bookingRef,
    package_name: b.packageName,
    date:         b.cleanDate.split('-').reverse().join('/'),
    time:         b.cleanTime,
    address:      `${b.addr1}, ${b.postcode}`,
    refund_amount: refundAmt > 0 ? `£${refundAmt.toFixed(2)}` : 'No refund',
    refund_message: refundMsg,
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
  } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  const current = snap.data();
  const updates = { updatedAt: new Date() };

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
  if (packageId   !== undefined && packageId   !== current.package)    { updates.package = newPackageId; updates.packageName = newPackageName; changes.push(`Package: ${current.packageName} → ${newPackageName}`); }
  if (sizeId      !== undefined && sizeId      !== current.size)       { updates.size    = newSizeId;    changes.push(`Size: ${current.size} → ${newSizeId}`); }
  if (frequency   !== undefined && frequency   !== current.frequency)  { updates.frequency = newFrequency; }
  if (addons      !== undefined) updates.addons = newAddons;

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

  await snap.ref.update(updates);

  // Send update email if date, time, or package changed
  if (changes.length > 0 && process.env.EMAILJS_UPDATE_TEMPLATE) {
    const updateData = {
      booking_ref:    current.bookingRef,
      package_name:   newPackageName,
      date:           newDate.split('-').reverse().join('/'),
      time:           newTime,
      address:        `${newAddr1}, ${newPostcode}`,
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
      const slotEnd   = new Date(new Date(slotStart).getTime() + 3 * 60 * 60 * 1000).toISOString();
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
            `Notes: ${newNotes || 'None'}`,
            `Total: £${current.total} | Deposit: £${current.deposit} | Remaining: £${current.remaining}`,
            `⚠️ Edited on ${new Date().toLocaleDateString('en-GB')}`,
          ].join('\n'),
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
  });
});

// ── 12. Confirm deposit payment (called after Stripe success) ─
exports.confirmDepositPayment = onRequest({ secrets:[STRIPE_KEY, EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, paymentIntentId } = req.body;
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
  await snap.ref.update({
    status:               'deposit_paid',
    stripeDepositIntentId: paymentIntentId,
    stripeCustomerId:      customerId,
    depositPaidAt:         new Date(),
    pendingDepositClientSecret: admin.firestore.FieldValue.delete(),
    pendingDepositCustomerId:   admin.firestore.FieldValue.delete(),
    pendingDepositPIId:         admin.firestore.FieldValue.delete(),
  });
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

  const eData = buildBookingEmailData({ ...b, stripeDepositIntentId: paymentIntentId, stripeCustomerId: customerId });
  await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
    { ...eData, to_name: b.firstName, to_email: b.email }, EMAILJS_KEY.value()).catch(() => {});
  await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
    { ...eData, to_email: 'bookings@londoncleaningwizard.com',
      customer_name: `${b.firstName} ${b.lastName}`,
      customer_phone: b.phone, customer_email: b.email },
    EMAILJS_KEY.value()).catch(() => {});
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
  res.json({ success: true });
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
        const FREQ_SAVINGS = { weekly: 30, fortnightly: 15, monthly: 7 };
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
          const slotEnd   = new Date(new Date(slotStart).getTime() + 3 * 60 * 60 * 1000).toISOString();
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
              colorId: '6',
            },
          });
          await db.collection('bookings').doc(id).update({ calendarEventId: calEvent.data.id });
        } catch (calErr) {
          console.error('Calendar event failed for', email, calErr.message);
        }

        // Admin notification email
        await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE, {
          ...buildBookingEmailData({ ...bookingData, bookingRef: ref }),
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

// ── 15. Get fully-blocked dates for a month ───────────────────
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

    if (event.type !== 'payment_intent.succeeded') { res.json({ received: true }); return; }

    const pi       = event.data.object;
    const bookingId = pi.metadata?.bookingId;
    if (!bookingId) { res.json({ received: true }); return; }

    const db   = admin.firestore();
    const snap = await db.collection('bookings').doc(bookingId).get();
    if (!snap.exists) { res.json({ received: true }); return; }
    const b = snap.data();

    // Only act if browser confirmation hasn't already run
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

    res.json({ received: true });
  }
);

// ── 16. Clean up expired verification codes (Scheduled) ──────
exports.cleanupExpiredCodes = onSchedule('every 60 minutes', async () => {
  const db   = admin.firestore();
  const snap = await db.collection('verificationCodes').where('expiresAt','<',new Date()).get();
  const b    = db.batch();
  snap.forEach(d => b.delete(d.ref));
  await b.commit();
});