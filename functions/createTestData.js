/**
 * Test data seeder for Convert to Recurring flow.
 * Run from the functions/ directory:  node createTestData.js
 * After testing, trash the bookings from the Admin panel.
 */

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')), projectId: 'bespoke-web-engineers' });
const db = admin.firestore();

const today = new Date();
const fiveDaysAgo = new Date(today);
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
const cleanDate = fiveDaysAgo.toLocaleDateString('en-CA');

const TESTS = [
  {
    // TEST 1 — Essential Reset 2-bed flat
    // Expected: Convert button visible, green, shows "Xd left"
    // Modal should default to Essential Reset package, price £130 weekly (£145 - £15 fortnightly default)
    email: 'test-essential@lcwtest.com',
    firstName: 'Test',
    lastName: 'EssentialReset',
    phone: '07000000001',
    addr1: '1 Test Street, London',
    postcode: 'E14 5AB',
    package: 'refresh',
    packageName: 'Essential Reset',
    size: '2bed',
    propertyType: 'flat',
    frequency: 'one-off',
    total: '145.00',
    deposit: '43.50',
    remaining: '101.50',
    status: 'fully_paid',
    cleanDate,
    cleanTime: '9:00 AM',
    isAutoRecurring: false,
    stripeCustomerId: 'cus_test_essential',
    addons: [],
    supplies: 'customer',
    suppliesFee: 0,
    notes: 'TEST RECORD — delete after testing',
  },
  {
    // TEST 2 — Signature Hotel Reset 2-bed house
    // Expected: Convert button visible, green, shows "Xd left"
    // Base price: £185 * 1.10 = £204 (rounded). Weekly: £174, Fortnightly: £189, Monthly: £197
    email: 'test-signature@lcwtest.com',
    firstName: 'Test',
    lastName: 'SignatureHouse',
    phone: '07000000002',
    addr1: '2 Test Avenue, London',
    postcode: 'E14 6CD',
    package: 'standard',
    packageName: 'Signature Hotel Reset',
    size: '2bed',
    propertyType: 'house',
    frequency: 'one-off',
    total: '204.00',
    deposit: '61.20',
    remaining: '142.80',
    status: 'fully_paid',
    cleanDate,
    cleanTime: '10:00 AM',
    isAutoRecurring: false,
    stripeCustomerId: 'cus_test_signature',
    addons: [{ name: 'Oven Clean', price: 30 }],
    supplies: 'cleaner',
    suppliesFee: 8,
    notes: 'TEST RECORD — has add-on and supplies, neither should carry to recurring',
  },
  {
    // TEST 3 — Hourly customer
    // Expected: Convert button NOT visible (hidden for hourly)
    email: 'test-hourly@lcwtest.com',
    firstName: 'Test',
    lastName: 'Hourly',
    phone: '07000000003',
    addr1: '3 Test Road, London',
    postcode: 'E14 7EF',
    package: 'hourly',
    packageName: 'Hourly Clean',
    size: '3h',
    propertyType: 'flat',
    frequency: 'one-off',
    total: '90.00',
    deposit: '27.00',
    remaining: '63.00',
    status: 'fully_paid',
    cleanDate,
    cleanTime: '11:00 AM',
    isAutoRecurring: false,
    stripeCustomerId: 'cus_test_hourly',
    addons: [],
    supplies: 'customer',
    suppliesFee: 0,
    notes: 'TEST RECORD — hourly, Convert button should be hidden',
  },
];

async function seed() {
  for (const t of TESTS) {
    const ref = db.collection('bookings').doc();
    const bookingRef = `LCW-TEST-${t.package.toUpperCase()}`;
    await ref.set({
      ...t,
      bookingRef,
      bookingId: ref.id,
      createdAt: new Date(),
      isPhoneBooking: true,
      source: 'test',
    });
    console.log(`Created: ${t.firstName} ${t.lastName} (${t.package}) — ID: ${ref.id}`);
  }
  console.log('\nDone. Open Admin > Customers tab and search for "lcwtest" to find the test records.');
  console.log('After testing, trash each booking from the Bookings tab or Customers tab.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
