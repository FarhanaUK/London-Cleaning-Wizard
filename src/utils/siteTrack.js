const JOURNEY_KEY = 'lcwPageJourney';

const PAGE_NAMES = {
  '/':                    'Homepage',
  '/services':            'Services Overview',
  '/signature-touch':     'Signature Touch',
  '/about':               'About',
  '/areas':               'Areas We Cover',
  '/hourly-clean':        'Hourly Cleaning',
  '/commercial-clean':    'Commercial Cleaning',
  '/regular-clean':       'Regular Cleaning',
  '/deep-clean':          'Deep Cleaning',
  '/faqs':                'FAQs',
  '/quote':               'Get a Quote',
  '/terms-and-conditions':'Terms & Conditions',
  '/privacy-policy':      'Privacy Policy',
  '/book':                'Booking',
};

const SKIP = new Set(['/admin', '/pay-deposit', '/booking-success', '/unsubscribe']);

export function trackPageView(path) {
  if (SKIP.has(path)) return;
  if (window.location.hostname === 'localhost') return;
  try {
    const journey = JSON.parse(sessionStorage.getItem(JOURNEY_KEY) || '[]');
    const entry = { page: PAGE_NAMES[path] || path, path, at: new Date().toISOString() };
    // Capture external referrer on the very first page of the session
    if (journey.length === 0 && document.referrer && !document.referrer.includes(window.location.hostname)) {
      try { entry.from = new URL(document.referrer).hostname; } catch {}
    }
    journey.push(entry);
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
  } catch {}
}

export function getPageJourney() {
  try { return JSON.parse(sessionStorage.getItem(JOURNEY_KEY) || '[]'); } catch { return []; }
}
