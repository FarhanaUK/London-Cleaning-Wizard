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

const STRIPE_KEY  = defineSecret('STRIPE_SECRET_KEY');
const EMAILJS_KEY = defineSecret('EMAILJS_PRIVATE_KEY');

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
  const stripe = new Stripe(STRIPE_KEY.value());
  const intent = await stripe.paymentIntents.create({ amount, currency:'gbp', metadata:{ bookingRef } });
  res.json({ clientSecret: intent.client_secret });
});

// ── 4. Save booking after payment succeeds ────────────────────
// Option B: writes booking events to GOOGLE_CALENDAR_ID (bookings calendar)
// Availability is checked against GOOGLE_AVAILABILITY_CALENDAR_ID (separate)
exports.saveBooking = onRequest({ secrets:[EMAILJS_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const db  = admin.firestore();
  const d   = req.body;
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
      package: d.package, packageName: d.packageName, size: d.size,
      frequency: d.frequency || 'one-off', addons: d.addons || [], isAirbnb: d.isAirbnb || false,
      cleanDate: d.cleanDate, cleanTime: d.cleanTime,
      cleanDateUTC: toUTCISO(d.cleanDate, d.cleanTime),
      total: d.total, deposit: d.deposit, remaining: d.remaining,
      stripeDepositIntentId: d.stripeDepositIntentId,
      status: 'deposit_paid', source: clean(d.source||''), createdAt: new Date(),
    });
    tx.set(cRef, {
      firstName: clean(d.firstName), lastName: clean(d.lastName), phone: clean(d.phone),
      addr1: clean(d.addr1), postcode: clean(d.postcode).toUpperCase(),
      floor: clean(d.floor||''), parking: clean(d.parking||''),
      keys: clean(d.keys||''), notes: clean(d.notes||''),
      bookingCount: count + 1, lastBookingId: id, lastBookingRef: ref,
      lastPackage: d.package, lastPackageName: d.packageName, lastSize: d.size,
      lastPrice: d.total, lastDate: d.cleanDate, lastCleaner: '',
      updatedAt: new Date(),
      ...(cSnap.exists ? {} : { firstBookingDate: new Date(), source: clean(d.source||'') }),
    }, { merge: true });
  });

  // Write to your bookings calendar — for your reference only
  // Does NOT affect availability checks
  try {
    const calendar  = await getCalendarClient();
    const slotStart = toUTCISO(d.cleanDate, d.cleanTime);
    const slotEnd   = new Date(new Date(slotStart).getTime() + 3 * 60 * 60 * 1000).toISOString();
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: {
        summary:     `${d.packageName} — ${d.firstName} ${d.lastName}`,
        description: `Ref: ${ref}\nAddress: ${d.addr1}, ${d.postcode}\nPhone: ${d.phone}\nKeys: ${d.keys || 'N/A'}\nNotes: ${d.notes || 'None'}`,
        start: { dateTime: slotStart, timeZone: 'Europe/London' },
        end:   { dateTime: slotEnd,   timeZone: 'Europe/London' },
        colorId: '2',
      },
    });
  } catch (e) {
    console.error('Failed to create calendar event:', e.message);
  }

  const eData = {
    booking_ref: ref, package_name: d.packageName, date: d.cleanDate, time: d.cleanTime,
    address: `${d.addr1}, ${d.postcode}`, total: `£${d.total}`,
    deposit_paid: `£${d.deposit}`, remaining: `£${d.remaining}`,
    notes: clean(d.notes||''), keys: clean(d.keys||''),
    addons: (d.addons||[]).map(a => a.name).join(', ') || 'None',
    property_type: d.propertyType,
  };
  await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE,
    { ...eData, to_name: d.firstName, to_email: d.email }, EMAILJS_KEY.value());
  await sendEmail(process.env.EMAILJS_ADMIN_TEMPLATE,
    { ...eData, to_email: 'bookings@londoncleaningwizard.com',
      customer_name: `${d.firstName} ${d.lastName}`,
      customer_phone: d.phone, customer_email: d.email },
    EMAILJS_KEY.value());

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
  if (b.status !== 'deposit_paid' && b.status !== 'payment_failed') {
    res.status(400).json({ error: 'This booking cannot be completed in its current status.' }); return;
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(b.remaining * 100),
      currency: 'gbp',
      metadata: { bookingRef: b.bookingRef, type: 'remaining_balance' },
    });

    await snap.ref.update({
      status: 'fully_paid',
      paidAt: new Date(),
      stripeRemainingIntentId: intent.id,
    });

    await sendEmail(process.env.EMAILJS_CONFIRM_TEMPLATE, {
      to_name:      b.firstName,
      to_email:     b.email,
      booking_ref:  b.bookingRef,
      package_name: b.packageName,
      date:         b.cleanDate,
      time:         b.cleanTime,
      address:      `${b.addr1}, ${b.postcode}`,
      total:        `£${b.total}`,
      deposit_paid: `£${b.deposit}`,
      remaining:    `£${b.remaining} — now charged`,
      notes:        b.notes || '',
      keys:         b.keys || '',
      addons:       (b.addons||[]).map(a => a.name).join(', ') || 'None',
      property_type: b.propertyType,
    }, EMAILJS_KEY.value());

    res.json({ success: true, status: 'fully_paid' });
  } catch(e) {
    await snap.ref.update({ status: 'payment_failed', paymentError: e.message });
    res.status(500).json({ error: e.message });
  }
});

// ── 7. Cancel booking and refund ──────────────────────────────
exports.cancelBooking = onRequest({ secrets:[STRIPE_KEY] }, async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId, reason } = req.body;
  const db     = admin.firestore();
  const stripe = new Stripe(STRIPE_KEY.value());
  const snap   = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error:'Booking not found' }); return; }
  const b           = snap.data();
  const hoursUntil  = (new Date(b.cleanDateUTC) - new Date()) / 3600000;
  const refundPence = hoursUntil >= 48 ? b.deposit * 100 : hoursUntil > 0 ? Math.round(b.deposit * 50) : 0;
  const status      = hoursUntil >= 48 ? 'cancelled_full_refund' : hoursUntil > 0 ? 'cancelled_partial_refund' : 'cancelled_no_refund';
  if (refundPence > 0) {
    await stripe.refunds.create({ payment_intent:b.stripeDepositIntentId, amount:refundPence, reason:'requested_by_customer' });
  }
  await snap.ref.update({ status, cancelledAt:new Date(), cancellationReason:clean(reason||''), refundAmount:refundPence/100 });
  res.json({ success:true, status, refundAmount:refundPence/100 });
});

// ── 8. Delete booking (admin only) ───────────────────────────
exports.deleteBooking = onRequest(async (req, res) => {
  if (!guard(req, res)) return;
  const { bookingId } = req.body;
  if (!bookingId) { res.status(400).json({ error: 'Missing bookingId' }); return; }
  const db   = admin.firestore();
  const snap = await db.collection('bookings').doc(bookingId).get();
  if (!snap.exists) { res.status(404).json({ error: 'Booking not found' }); return; }
  await snap.ref.delete();
  res.json({ success: true });
});

// ── 9. Clean up expired verification codes (Scheduled) ───────
exports.cleanupExpiredCodes = onSchedule('every 60 minutes', async () => {
  const db   = admin.firestore();
  const snap = await db.collection('verificationCodes').where('expiresAt','<',new Date()).get();
  const b    = db.batch();
  snap.forEach(d => b.delete(d.ref));
  await b.commit();
});