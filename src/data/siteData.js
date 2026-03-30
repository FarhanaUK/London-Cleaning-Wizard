export const PHOTOS = {
  hero:     "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=85&fit=crop",
  kitchen:  "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=900&q=80&fit=crop",
  living:   "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80&fit=crop",
  bathroom: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=80&fit=crop",
  bedroom:  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80&fit=crop",
  cleaner1: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80&fit=crop",
  hallway:  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80&fit=crop",
  dining:   "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=900&q=80&fit=crop",

};

export const HERO_IMAGE = "/wizard.png";

export const SERVICES = [
  { img: PHOTOS.living,   title: "Regular Home Clean",  tag: "Weekly · Fortnightly · Monthly",   desc: "A consistent, thorough clean of every room — dusting, vacuuming, mopping and more.", spell: "The Refresh Spell",       alt: "Regularly cleaned living room in East London home" },
  { img: PHOTOS.kitchen,  title: "Deep Kitchen Clean",  tag: "One-off · Seasonal",     desc: "Degreasing, descaling and scrubbing every surface until your kitchen gleams like new.", spell: "The Gleam Enchantment", alt: "Professionally deep cleaned kitchen in East London" },
  { img: PHOTOS.bathroom, title: "Bathroom & Ensuite",  tag: "Luxury standard",  desc: "Sanitised to perfection. Limescale banished, surfaces polished, mirrors streak-free.", spell: "The Purity Ritual",     alt: "Spotless cleaned bathroom and ensuite in East London" },
  { img: PHOTOS.bedroom,  title: "Bedroom Refresh",     tag: "Linen change available", desc: "Fresh, airy bedrooms. Dusting, vacuuming, linen changes and meticulous attention.", spell: "The Serenity Cast",       alt: "Fresh and clean bedroom refresh service in East London" },
  { img: PHOTOS.hallway,  title: "Airbnb/End of Tenancy", tag: "Get your deposit back",     desc: "A landlord-approved full clean. Every inch, every surface — nothing left to chance.", spell: "The Grand Restoration", alt: "End of tenancy clean in East London rental property" },
  { img: PHOTOS.cleaner1, title: "Move-In Preparation", tag: "Fresh start",            desc: "Move into a home that feels truly yours from day one. Magic from the very first step.", spell: "The Welcome Charm",    alt: "Move-in cleaning preparation service by London Cleaning Wizard" },
];

export const GALLERY = [
  { img: PHOTOS.kitchen,  label: "Kitchen",     alt: "Professionally cleaned kitchen in East London" },
  { img: PHOTOS.living,   label: "Living Room", alt: "Spotless living room cleaned by London Cleaning Wizard" },
  { img: PHOTOS.bathroom, label: "Bathroom",    alt: "Gleaming bathroom cleaned in East London home" },
  { img: PHOTOS.bedroom,  label: "Bedroom",     alt: "Fresh bedroom after professional clean in East London" },
  { img: PHOTOS.hallway,  label: "Hallway",     alt: "Clean bright hallway in East London property" },
  { img: PHOTOS.dining,   label: "Dining Room", alt: "Professionally cleaned dining room in East London" },
];

export const TESTIMONIALS = [
  { name: "Sophie L.",  area: "Hackney",       stars: 5, text: "I've tried three cleaning companies before. None came close to this. My home genuinely feels like a boutique hotel after every visit." },
  { name: "Marcus B.",  area: "Canary Wharf",  stars: 5, text: "End-of-tenancy was flawless. They recovered my full £2,400 deposit. My landlord called it the cleanest handback he'd ever seen in 20 years." },
  { name: "Amara N.",   area: "Bethnal Green", stars: 5, text: "They came for a move-in clean and left our flat looking like a show home. Immaculate kitchen, glowing bathroom. Already booked the regular service." },
];

export const AREAS = [
  "Hackney", "Tower Hamlets", "Newham", "Waltham Forest",
  "Bethnal Green", "Bow", "Stratford", "Canary Wharf",
  "Poplar", "Leyton", "Ilford", "Wanstead",
  "Forest Gate", "Dalston", "Shoreditch", "Mile End",
];

export const STATS = [
  { number: "500+",   label: "Homes Cleaned" },
  { number: "4.9 ✦", label: "Average Rating" },
  { number: "100%",  label: "Deposit Guarantee" },
  { number: "7 days", label: "Always Available" },
];

export const CONTACT_INFO = [
  { label: "Phone", value: "020 8137 0026" },
  { label: "Email", value: "bookings@londoncleaningwizard.com" },
  { label: "Service Hours", value: "Monday – Sunday · 7am to 9pm" },
  { label: "Customer Service Hours", value: "Monday – Sunday · 9am to 5pm" },
];

export const NAV_LINKS = [
  { id: "services", label: "Services"  },
  { id: "our-work", label: "Our Work"  },
  { id: "about",    label: "Our Craft" },
  { id: "contact",  label: "Contact"   },
];


export const PROPERTY_TYPES = [
  { id: 'flat',  label: 'Flat / Apartment / Studio', multiplier: 1.00, note: '' },
  { id: 'house', label: 'House', multiplier: 1.10, note: '+10% on all packages' },
];

export const PACKAGES = [
  {
    id: 'refresh', name: 'The Refresh', popular: false,
    desc: 'Studio & 1-bed entire home. ~2.5hrs. Hotel-standard finish.',
    tags: ['Whole home', 'Eco products', 'Photos sent', 'Fragrance finish'],
    showFreq: true, showAddons: true,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 115 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 115 },
    ],
  },
  {
    id: 'standard', name: 'The Standard', popular: true,
    desc: '2–3 bed entire home. ~3.5hrs. Same dedicated cleaner, linen change included.',
    tags: ['Whole home', 'Same cleaner', 'Linen change', 'Hotel finish'],
    showFreq: true, showAddons: true,
    sizes: [
      { id: '2bed', label: '2 Bedroom', basePrice: 165 },
      { id: '3bed', label: '3 Bedroom', basePrice: 180 },
    ],
  },
  {
    id: 'grand', name: 'The Grand', popular: false,
    desc: '4-bed family home. Two-person team. Priority slot protected.',
    tags: ['Whole home', '2-person team', 'Priority slot', 'Full turndown'],
    showFreq: true, showAddons: true,
    sizes: [
      { id: '4bed', label: '4+ Bedroom', basePrice: 235 },
    ],
  },
  {
    id: 'deep', name: 'Deep Clean', popular: false,
    desc: 'One-off intensive. Oven, fridge, inside cupboards, behind appliances.',
    tags: ['Oven included', 'Inside fridge', 'Behind appliances', 'Photo report'],
    showFreq: false, showAddons: true,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 265 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 265 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 330 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 395 },
    ],
  },
  {
    id: 'eot', name: 'End of Tenancy', popular: false,
    desc: 'Deposit-back guaranteed. Letting agent standard. Free re-clean if needed.',
    tags: ['Deposit guaranteed', 'Photo report', 'Re-clean included'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 285 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 285 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 375 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 495 },
      { id: '4bed',   label: '4 Bedroom', basePrice: 595 },
    ],
  },
  {
    id: 'movein', name: 'Move-In Prep', popular: false,
    desc: 'Arrive to a home that feels like yours from the first step.',
    tags: ['Pre-arrival clean', 'Linen made up', 'Welcome kit'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 250 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 250 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 310 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 380 },
    ],
  },
  {
    id: 'airbnb', name: 'Airbnb Turnaround', popular: false,
    desc: 'Guest-ready between every booking. Completion photo sent to you.',
    tags: ['Guest-ready', 'Photo report', 'Same-day available'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 95  },
      { id: '1bed',   label: '1 Bedroom', basePrice: 120 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 155 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 195 },
      { id: '4bed',   label: '4 Bedroom', basePrice: 250 },
    ],
  },
];

export const FREQUENCIES = [
  { id: 'one-off',     label: 'One-off',      saving: 0,  note: 'No commitment' },
  { id: 'monthly',     label: 'Monthly',      saving: 7,  note: 'Save £7 per clean' },
  { id: 'fortnightly', label: 'Fortnightly',  saving: 15, note: 'Save £15 per clean' },
  { id: 'weekly',      label: 'Weekly',       saving: 30, note: 'Save £30 per clean' },
];

export const ADDONS = [
  { id: 'oven',      name: 'Oven deep clean',              note: 'Interior, racks, door & casing', price: 75 },
  { id: 'fridge',    name: 'Inside fridge & freezer',      note: 'Full interior clean',             price: 40 },
  { id: 'windows',   name: 'Interior windows',             note: 'All panes, streak-free',          price: 55 },
  { id: 'cupboards', name: 'Inside kitchen cupboards',     note: 'All interiors wiped',             price: 60 },
  { id: 'microwave', name: 'Inside and outside microwave', note: 'Full clean',                      price: 10 },
];

export const SURCHARGES = {
  weekend: 25,
  sameDay: 30,
};

export function calculateTotal({ sizePrice, propertyType, frequency, addons, surcharge }) {
  const mult     = propertyType === 'house' ? 1.10 : 1.0;
  const base     = Math.round(sizePrice * mult);
  const freqSave = frequency?.saving || 0;
  const addnSum  = (addons || []).reduce((s, a) => s + a.price, 0);
  const sur      = surcharge || 0;
  const subtotal = base - freqSave + addnSum + sur;
  return {
    base,
    houseExtra: propertyType === 'house' ? Math.round(sizePrice * 0.10) : 0,
    freqSave, addnSum, surcharge: sur, subtotal,
    deposit:   Math.round(subtotal * 0.30),
    remaining: Math.round(subtotal * 0.70),
  };
}
//There is no export default — 
// every icon is a named export because there are multiple in one file. So when you import them you use curly braces: import { Sparkle, WandIcon } from "./Icons"
//aria-hidden="true" is on every icon so screen readers ignore them — they're decorative
//Constellation is the dot-and-line star pattern used as background decoration in several sections
//LogoMark is the circular star used in the Navbar and Footer