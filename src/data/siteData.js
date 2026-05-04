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
  { img: PHOTOS.living,   title: "Regular Home Clean",  tag: "Weekly · Fortnightly · Monthly",   desc: "A consistent, thorough clean of every room — dusting, vacuuming, mopping and more.", spell: "The Essential Reset",       alt: "Regularly cleaned living room in London home" },
  { img: PHOTOS.kitchen,  title: "Deep Kitchen Clean",  tag: "One-off · Seasonal",     desc: "Degreasing, descaling and scrubbing every surface until your kitchen gleams like new.", spell: "The Gleam Enchantment", alt: "Professionally deep cleaned kitchen in London" },
  { img: PHOTOS.bathroom, title: "Bathroom & Ensuite",  tag: "Luxury standard",  desc: "Sanitised to perfection. Limescale banished, surfaces polished, mirrors streak-free.", spell: "The Purity Ritual",     alt: "Spotless cleaned bathroom and ensuite in London" },
  { img: PHOTOS.bedroom,  title: "Bedroom Refresh",     tag: "Linen change available", desc: "Fresh, airy bedrooms. Dusting, vacuuming, linen changes and meticulous attention.", spell: "The Serenity Cast",       alt: "Fresh and clean bedroom refresh service in London" },
  { img: PHOTOS.hallway,  title: "Airbnb/End of Tenancy", tag: "Maximise your deposit return",     desc: "A landlord-approved full clean. Every inch, every surface — nothing left to chance.", spell: "The Grand Restoration", alt: "End of tenancy clean in London rental property" },
  { img: PHOTOS.cleaner1, title: "Move-In Preparation", tag: "Fresh start",            desc: "Move into a home that feels truly yours from day one. Magic from the very first step.", spell: "The Welcome Charm",    alt: "Move-in cleaning preparation service by London Cleaning Wizard" },
];

export const GALLERY = [
  { img: PHOTOS.kitchen,  label: "Kitchen",     alt: "Professionally cleaned kitchen in London" },
  { img: PHOTOS.living,   label: "Living Room", alt: "Spotless living room cleaned by London Cleaning Wizard" },
  { img: PHOTOS.bathroom, label: "Bathroom",    alt: "Gleaming bathroom cleaned in London home" },
  { img: PHOTOS.bedroom,  label: "Bedroom",     alt: "Fresh bedroom after professional clean in London" },
  { img: PHOTOS.hallway,  label: "Hallway",     alt: "Clean bright hallway in London property" },
  { img: PHOTOS.dining,   label: "Dining Room", alt: "Professionally cleaned dining room in London" },
];

export const TESTIMONIALS = [
  { name: "Sophie L.",  area: "Hackney",       stars: 5, text: "I've tried three cleaning companies before. None came close to this. My home genuinely feels like a boutique hotel after every visit." },
  { name: "Marcus B.",  area: "Canary Wharf",  stars: 5, text: "End-of-tenancy was flawless. They recovered my full £2,400 deposit. My landlord called it the cleanest handback he'd ever seen in 20 years." },
  { name: "Amara N.",   area: "Bethnal Green", stars: 5, text: "They came for a move-in clean and left our flat looking like a show home. Immaculate kitchen, glowing bathroom. Already booked the regular service." },
];

export const AREAS = [
  // East & Riverside
  "Canary Wharf", "Poplar", "Wapping", "Limehouse",
  "Bethnal Green", "Bow", "Mile End", "Shoreditch",
  "Dalston", "Hackney", "Stratford", "Forest Gate",
  "Spitalfields", "Whitechapel", "Stepney", "Leyton",
  // Central
  "City of London", "Clerkenwell", "Aldgate",
  "Westminster", "Mayfair", "Soho", "Covent Garden",
  "Marylebone", "Fitzrovia", "Pimlico", "Victoria",
  // North
  "Islington", "Canonbury", "Highbury", "Stoke Newington",
  "Camden", "Primrose Hill", "Finsbury Park", "Holloway",
  // North West
  "St John's Wood", "Hampstead", "Swiss Cottage", "Kilburn",
  // West
  "Notting Hill", "Kensington", "South Kensington",
  "Knightsbridge", "Chelsea", "Fulham", "Earl's Court",
  "Hammersmith", "Shepherd's Bush",
  // South East & South
  "London Bridge", "Borough", "Bermondsey", "Canada Water",
  "Southwark", "Waterloo", "Vauxhall", "Greenwich",
  "Brixton", "Clapham", "Battersea", "Wandsworth",
  "Peckham", "Lewisham", "Putney",
];

export const STATS = [
  { number: "No Hidden Fees",  label: "Transparent Pricing", small: true },
  { number: "4.9 ✦",          label: "Average Rating" },
  { number: "Free Re-clean",   label: "If Unsatisfied",      small: true },
  { number: "7 days",          label: "Always Available" },
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
    id: 'refresh', name: 'The Essential Reset', popular: false,
    desc: 'This service focuses on visible cleanliness and overall reset. Heavier buildup or stubborn marks may require a Deep Reset. Typically 3–4 hours for a 2-bedroom home. Smaller homes may take less time, larger homes may take slightly longer.',
    tags: ['Whole home', 'Photos sent'],
    showFreq: true, showAddons: true,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 115  },
      { id: '1bed',   label: '1 Bedroom', basePrice: 125 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 145 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 170 },
      { id: '4bed',   label: '4 Bedroom', basePrice: 200 },
    ],
  },
  {
    id: 'standard', name: 'Signature Hotel Reset', popular: true, launchOffer: 0.5,
    desc: 'Designed to create a calm, refined, hotel-like finish in your home. Typically 3.5–4.5 hours for a 2-bedroom home. Smaller homes may take less time, larger homes may take slightly longer.',
    tags: ['Whole home', 'Same cleaner', 'Linen change', 'Hotel finish'],
    showFreq: true, showAddons: true,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 145 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 165 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 185 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 210 },
      { id: '4bed',   label: '4 Bedroom', basePrice: 250 },
    ],
  },
  

  {
    id: 'deep', name: 'Deep Reset', popular: false,
    desc: 'A full transformation clean for heavily used or move-in ready homes. 2 cleaners · estimated 4–10 hrs depending on property size.',
    tags: ['Oven included', 'Inside fridge', 'Behind appliances', 'Photo report'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: 'studio', label: 'Studio',    basePrice: 225 },
      { id: '1bed',   label: '1 Bedroom', basePrice: 265 },
      { id: '2bed',   label: '2 Bedroom', basePrice: 330 },
      { id: '3bed',   label: '3 Bedroom', basePrice: 395 },
      { id: '4bed',   label: '4 Bedroom', basePrice: 460 },
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
  { id: 'weekly',      label: 'Weekly',       saving: 30, note: 'Save £30 per clean' },
  { id: 'fortnightly', label: 'Fortnightly',  saving: 15, note: 'Save £15 per clean' },
  { id: 'monthly',     label: 'Monthly',      saving: 7,  note: 'Save £7 per clean' },
];

export const ADDONS = [
  { id: 'oven',      name: 'Oven deep clean',              note: 'Interior, racks, door & casing', price: 75 },
  { id: 'fridge',    name: 'Inside fridge & freezer',      note: 'Full interior clean',             price: 40 },
  { id: 'windows',   name: 'Interior windows',             note: 'Standard windows — contact us if you have large or unusual windows', price: 55 },
  { id: 'cupboards', name: 'Inside kitchen cupboards',     note: 'All interiors wiped',             price: 60 },
  { id: 'microwave', name: 'Microwave deep clean', note: 'Full interior and exterior',              price: 10 },
];

