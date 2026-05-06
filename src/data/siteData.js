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
  // East & Riverside (home base)
  { name: "Canary Wharf",    postcode: "E14"  },
  { name: "Isle of Dogs",    postcode: "E14"  },
  { name: "Cubitt Town",     postcode: "E14"  },
  { name: "Poplar",          postcode: "E14"  },
  { name: "Limehouse",       postcode: "E14"  },
  { name: "Royal Docks",     postcode: "E16"  },
  { name: "Silvertown",      postcode: "E16"  },
  { name: "Stratford",       postcode: "E15"  },
  { name: "Wapping",         postcode: "E1W"  },
  { name: "Spitalfields",    postcode: "E1"   },
  { name: "Shoreditch",      postcode: "EC2A" },
  { name: "Whitechapel",     postcode: "E1"   },
  { name: "Stepney",         postcode: "E1"   },
  { name: "Bethnal Green",   postcode: "E2"   },
  { name: "Bow",             postcode: "E3"   },
  { name: "Mile End",        postcode: "E3"   },
  { name: "Bromley by Bow", postcode: "E3"   },
  { name: "Hoxton",          postcode: "N1"   },
  { name: "Haggerston",      postcode: "E2"   },
  { name: "Hackney Wick",    postcode: "E9"   },
  { name: "Homerton",        postcode: "E9"   },
  { name: "Clapton",         postcode: "E5"   },
  { name: "Dalston",         postcode: "E8"   },
  { name: "Hackney",         postcode: "E8"   },
  { name: "Canning Town",    postcode: "E16"  },
  { name: "West Ham",        postcode: "E15"  },
  { name: "Forest Gate",     postcode: "E7"   },
  // Central & City
  { name: "City of London",  postcode: "EC2V" },
  { name: "Barbican",        postcode: "EC2Y" },
  { name: "Clerkenwell",     postcode: "EC1V" },
  { name: "Aldgate",         postcode: "EC3N" },
  { name: "Holborn",         postcode: "WC1"  },
  { name: "Bloomsbury",      postcode: "WC1"  },
  { name: "Covent Garden",   postcode: "WC2"  },
  { name: "Fitzrovia",       postcode: "W1T"  },
  { name: "Soho",            postcode: "W1D"  },
  { name: "Mayfair",         postcode: "W1K"  },
  { name: "Marylebone",      postcode: "W1U"  },
  { name: "Westminster",     postcode: "SW1A" },
  { name: "Pimlico",         postcode: "SW1V" },
  { name: "Victoria",        postcode: "SW1E" },
  { name: "Belgravia",       postcode: "SW1X" },
  // North
  { name: "Islington",       postcode: "N1"   },
  { name: "Canonbury",       postcode: "N1"   },
  { name: "King's Cross",    postcode: "N1"   },
  { name: "Highbury",        postcode: "N5"   },
  { name: "Stoke Newington", postcode: "N16"  },
  { name: "Camden",          postcode: "NW1"  },
  { name: "Primrose Hill",   postcode: "NW3"  },
  // North West
  { name: "St John's Wood",  postcode: "NW8"  },
  { name: "Swiss Cottage",   postcode: "NW3"  },
  { name: "Hampstead",       postcode: "NW3"  },
  // West
  { name: "Paddington",      postcode: "W2"   },
  { name: "Bayswater",       postcode: "W2"   },
  { name: "Hyde Park",       postcode: "W2"   },
  { name: "Queensway",       postcode: "W2"   },
  { name: "Maida Vale",      postcode: "W9"   },
  { name: "Little Venice",   postcode: "W9"   },
  { name: "Notting Hill",    postcode: "W11"  },
  { name: "Kensington",      postcode: "W8"   },
  { name: "South Kensington",postcode: "SW7"  },
  { name: "Knightsbridge",   postcode: "SW1X" },
  { name: "Chelsea",         postcode: "SW3"  },
  { name: "Fulham",          postcode: "SW6"  },
  // South East & South
  { name: "Tower Bridge",    postcode: "SE1"  },
  { name: "London Bridge",   postcode: "SE1"  },
  { name: "Borough",         postcode: "SE1"  },
  { name: "Bankside",        postcode: "SE1"  },
  { name: "Bermondsey",      postcode: "SE1"  },
  { name: "Canada Water",    postcode: "SE16" },
  { name: "Rotherhithe",     postcode: "SE16" },
  { name: "Southwark",       postcode: "SE1"  },
  { name: "Waterloo",        postcode: "SE1"  },
  { name: "Elephant & Castle", postcode: "SE17" },
  { name: "Kennington",      postcode: "SE11" },
  { name: "Vauxhall",        postcode: "SE11" },
  { name: "Camberwell",      postcode: "SE5"  },
  { name: "Peckham",         postcode: "SE15" },
  { name: "Deptford",        postcode: "SE8"  },
  { name: "New Cross",       postcode: "SE14" },
  { name: "Lewisham",        postcode: "SE13" },
  { name: "Greenwich",       postcode: "SE10" },
  { name: "Blackheath",      postcode: "SE3"  },
  { name: "Clapham",         postcode: "SW4"  },
  { name: "Brixton",         postcode: "SW9"  },
  { name: "Balham",          postcode: "SW12" },
  { name: "Battersea",       postcode: "SW11" },
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
  { path: "/services",        label: "Services"        },
  { path: "/about",           label: "About"           },
  { path: "/signature-touch", label: "Signature Touch" },
  { path: "/areas",           label: "Areas"           },
  { path: "/faqs",            label: "FAQs"            },
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
    id: 'hourly', name: 'Hourly Clean', isHourly: true,
    desc: 'Sometimes you just need the kitchen tackled, the bathroom refreshed, or a few rooms brought back together. You direct the priorities. We get to work.',
    tags: ['£30/hr', 'Min. 3 Hours', 'One-off'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: '3h',   label: '3 hours',   basePrice: 90  },
      { id: '3.5h', label: '3.5 hours', basePrice: 105 },
    ],
  },
  {
    id: 'airbnb_commercial', name: 'Airbnb & Serviced Apartments', isHourly: true,
    desc: 'Your guests expect a hotel experience. We make sure they get one. From fresh linens to spotless surfaces, we turn your property around quickly and to the highest standard.',
    tags: ['£35/hr', 'Min. 2 Hours', 'One-off'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: '2h', label: '2 hours', basePrice: 70  },
      { id: '3h', label: '3 hours', basePrice: 105 },
      { id: '4h', label: '4 hours', basePrice: 140 },
      { id: '5h', label: '5 hours', basePrice: 175 },
      { id: '6h', label: '6 hours', basePrice: 210 },
      { id: '7h', label: '7 hours', basePrice: 245 },
      { id: '8h', label: '8 hours', basePrice: 280 },
    ],
  },
  {
    id: 'office_cleaning', name: 'Office Cleaning', isHourly: true,
    desc: "A clean office isn't just about appearances. It affects focus, morale and the impression you make on clients. We work around your schedule, arriving after hours so your team walks in to a fresh environment every morning.",
    tags: ['£35/hr', 'Min. 3 Hours', 'One-off'],
    showFreq: false, showAddons: false,
    sizes: [
      { id: '3h', label: '3 hours', basePrice: 105 },
      { id: '4h', label: '4 hours', basePrice: 140 },
      { id: '5h', label: '5 hours', basePrice: 175 },
      { id: '6h', label: '6 hours', basePrice: 210 },
      { id: '7h', label: '7 hours', basePrice: 245 },
      { id: '8h', label: '8 hours', basePrice: 280 },
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

