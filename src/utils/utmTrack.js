const KEY = 'lcwUtm';

const CHANNEL_MAP = {
  google:    { cpc: 'Google Ads', organic: 'Google Organic' },
  facebook:  { paid_social: 'Facebook Ads', organic: 'Facebook' },
  instagram: { paid_social: 'Instagram Ads', organic: 'Instagram' },
  tiktok:    { paid_social: 'TikTok Ads', organic: 'TikTok' },
  nextdoor:  { organic: 'Nextdoor', paid: 'Nextdoor Ads' },
};

function resolveChannel(source, medium) {
  const src = (source || '').toLowerCase();
  const med = (medium || '').toLowerCase();
  return CHANNEL_MAP[src]?.[med] || CHANNEL_MAP[src]?.paid_social || CHANNEL_MAP[src]?.organic || source || 'Unknown';
}

export function captureUTM() {
  try {
    if (sessionStorage.getItem(KEY)) return; // already captured this session
    const p = new URLSearchParams(window.location.search);
    const gclid  = p.get('gclid');
    const fbclid = p.get('fbclid');
    const source = p.get('utm_source');
    const medium = p.get('utm_medium');
    const campaign = p.get('utm_campaign');

    const referrerHost = (() => { try { return new URL(document.referrer).hostname.replace('www.', ''); } catch { return ''; } })();
    const REFERRER_MAP = {
      'nextdoor.com': { source: 'nextdoor', channel: 'Nextdoor' },
      'nextdoor.co.uk': { source: 'nextdoor', channel: 'Nextdoor' },
      'tiktok.com':   { source: 'tiktok',   channel: 'TikTok' },
      'facebook.com': { source: 'facebook', channel: 'Facebook' },
      'instagram.com': { source: 'instagram', channel: 'Instagram' },
      'l.instagram.com': { source: 'instagram', channel: 'Instagram' },
    };

    if (!gclid && !fbclid && !source) {
      const mapped = REFERRER_MAP[referrerHost];
      if (mapped) sessionStorage.setItem(KEY, JSON.stringify(mapped));
      return;
    }

    let data;
    const isInstagram = document.referrer.includes('instagram.com');
    if (gclid)       data = { source: 'google',    medium: 'cpc',         channel: 'Google Ads',    campaign };
    else if (fbclid) data = { source: isInstagram ? 'instagram' : 'facebook', medium: 'paid_social', channel: isInstagram ? 'Instagram Ads' : 'Facebook Ads', campaign };
    else             data = { source, medium, campaign, channel: resolveChannel(source, medium) };

    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getUTM() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
