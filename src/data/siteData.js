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

//There is no export default — 
// every icon is a named export because there are multiple in one file. So when you import them you use curly braces: import { Sparkle, WandIcon } from "./Icons"
//aria-hidden="true" is on every icon so screen readers ignore them — they're decorative
//Constellation is the dot-and-line star pattern used as background decoration in several sections
//LogoMark is the circular star used in the Navbar and Footer