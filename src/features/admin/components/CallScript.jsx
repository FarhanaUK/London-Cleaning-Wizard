import { useState } from "react";

// Interactive cold-call script for outreach to offices, estate agents and shops.
// Opened as a slide-out panel from the Quotes tab so it can be followed while filling the form.
const FLOW = {
  start: {
    context: "📞 You've just dialled. Someone picks up.",
    you: "Hi, could I speak to the person who handles the cleaning or maintenance of the office please?",
    responses: [
      { label: "Why are you calling?", next: "gatekeeper_why" },
      { label: "Who's calling?", next: "gatekeeper_who" },
      { label: "We're not interested", next: "gatekeeper_instant_no" },
      { label: "One moment, putting you through", next: "decision_maker_opener" },
      { label: "They're not available right now", next: "gatekeeper_unavailable" },
      { label: "We handle that ourselves / no one specific", next: "gatekeeper_no_one" },
      { label: "It went to voicemail", next: "voicemail" },
      { label: "Wrong number / not a business", next: "wrong_number" },
    ],
  },

  voicemail: {
    context: "📱 Voicemail - keep it short and leave a reason to call back.",
    you: "Hi, my name's Fahana - I run a premium cleaning company in East London called Cleaning Wizard. I was just reaching out to introduce ourselves - we work with a few businesses in the area and I wanted to have a very quick chat. I'll try again, but feel free to call me back on [your number]. Have a great day.",
    tip: "Don't pitch on voicemail. Under 20 seconds. Always say you'll try again - gives you a reason to call back.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  wrong_number: {
    context: "😅 Wrong number - exit cleanly.",
    you: "Oh, so sorry about that - I must have the wrong number. Thanks and sorry for the bother!",
    tip: "Log it and move on.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  gatekeeper_instant_no: {
    context: "🛡️ They said 'not interested' before you even explained who you are.",
    you: "I completely understand - I haven't even said who I am yet! My name's Fahana, I run a local cleaning company. I'm not here to sell anything right now - I just wanted a thirty-second word with whoever handles that side of things. Is there any chance you could point me in the right direction?",
    tip: "Stay warm. You're disarming them, not arguing.",
    responses: [
      { label: "They soften and offer to help", next: "gatekeeper_why" },
      { label: "They still say no", next: "gatekeeper_not_interested" },
      { label: "They hang up", next: "call_ended_hung_up" },
      { label: "They put me through", next: "decision_maker_opener" },
    ],
  },

  gatekeeper_why: {
    context: "🛡️ Gatekeeper is screening you.",
    you: "My name's Fahana - I run a premium cleaning company in East London called Cleaning Wizard. I just wanted to introduce myself to whoever handles that side of things. It's a really quick two-minute chat, nothing more.",
    responses: [
      { label: "We're not interested", next: "gatekeeper_not_interested" },
      { label: "Okay, let me put you through", next: "decision_maker_opener" },
      { label: "Can you send an email instead?", next: "gatekeeper_email" },
      { label: "What company are you from?", next: "gatekeeper_company" },
      { label: "They hang up", next: "call_ended_hung_up" },
    ],
  },

  gatekeeper_who: {
    context: "🛡️ They want your name before deciding.",
    you: "Of course - my name's Fahana, I run a premium cleaning company called Cleaning Wizard based in East London. Just wanted a very quick word with whoever handles maintenance or cleaning - two minutes max.",
    responses: [
      { label: "We're not interested", next: "gatekeeper_not_interested" },
      { label: "Okay, let me put you through", next: "decision_maker_opener" },
      { label: "Can you send an email instead?", next: "gatekeeper_email" },
      { label: "They hang up", next: "call_ended_hung_up" },
    ],
  },

  gatekeeper_not_interested: {
    context: "🛡️ Gatekeeper says no - but they don't make this decision.",
    you: "Totally understood - I just want to make sure I'm not wasting anyone's time including yours. Is it that you already have a cleaner you're happy with, or is it just not the right moment? I'd rather speak to the right person directly for two minutes than go back and forth.",
    responses: [
      { label: "We already have a cleaner", next: "gatekeeper_has_cleaner" },
      { label: "It's just not a good time", next: "gatekeeper_bad_time" },
      { label: "They still won't put me through", next: "gatekeeper_final_fallback" },
      { label: "They hang up", next: "call_ended_hung_up" },
      { label: "Okay, I'll put you through", next: "decision_maker_opener" },
    ],
  },

  gatekeeper_has_cleaner: {
    context: "🛡️ They say they have a cleaner - redirect to the decision maker.",
    you: "That's great - I'm not here to replace anyone. I'd just love to introduce ourselves so you've got us on your radar if anything ever changes. Could I grab the manager's name so I can speak to them directly?",
    responses: [
      { label: "They give me a name / put me through", next: "decision_maker_opener" },
      { label: "They refuse and end the call", next: "call_ended_softly" },
    ],
  },

  gatekeeper_bad_time: {
    context: "🛡️ Not a good time - lock in a callback.",
    you: "No problem at all - when would be a better time to call back? I'd rather ring when it's convenient than bother you now.",
    responses: [
      { label: "They give me a time", next: "callback_booked" },
      { label: "They say just send an email", next: "gatekeeper_email" },
      { label: "They're vague / brush me off", next: "call_ended_softly" },
    ],
  },

  gatekeeper_final_fallback: {
    context: "🛡️ Last resort - get the decision maker's name at minimum.",
    you: "No worries at all. Could I at least get the name of whoever handles that side of things, so I can address them directly if I call back?",
    responses: [
      { label: "They give me a name", next: "callback_booked" },
      { label: "They say no and end the call", next: "call_ended_no_data" },
    ],
  },

  gatekeeper_email: {
    context: "📧 They want you to email - get a name so it's not generic.",
    you: "Of course, happy to do that. Just so I don't send something generic - could I get the name of whoever handles cleaning, so I can address it to them properly?",
    responses: [
      { label: "They give me a name and email", next: "got_contact" },
      { label: "They say just use info@ or the website", next: "got_generic_email" },
    ],
  },

  gatekeeper_company: {
    context: "🛡️ They're asking about your company.",
    you: "It's called Cleaning Wizard - we're a premium cleaning company based in East London. Unlike a lot of companies, I manage every job closely - I track cleaner attendance and punctuality, take before and after photos, and clients have direct contact with me if anything's ever not right. We mainly work with offices, estate agents and shops in the area.",
    responses: [
      { label: "Okay, let me put you through", next: "decision_maker_opener" },
      { label: "We're not interested", next: "gatekeeper_not_interested" },
      { label: "Can you send an email?", next: "gatekeeper_email" },
    ],
  },

  gatekeeper_unavailable: {
    context: "🛡️ Decision maker isn't available - get their name.",
    you: "No problem - could I get their name so I can ask for them directly when I call back? And is there a better time to reach them?",
    responses: [
      { label: "They give me a name and time", next: "callback_booked" },
      { label: "They say just call back generally", next: "call_ended_softly" },
      { label: "They suggest I email", next: "gatekeeper_email" },
    ],
  },

  gatekeeper_no_one: {
    context: "🛡️ No clear decision maker - find the closest person.",
    you: "Got it - is there a manager or owner I could have a very quick word with? I'll be two minutes max.",
    responses: [
      { label: "They put me through to owner/manager", next: "decision_maker_opener" },
      { label: "They say the owner isn't in", next: "gatekeeper_unavailable" },
      { label: "They say they handle it themselves", next: "decision_maker_opener" },
    ],
  },

  decision_maker_opener: {
    context: "✅ You're through to the decision maker. Fresh start.",
    you: "Hi [Name] - my name's Fahana, I run a premium cleaning company in East London called Cleaning Wizard. I'll be really quick - do you handle the cleaning yourselves at the moment, or do you have someone coming in?",
    responses: [
      { label: "We do it ourselves", next: "dm_does_own_cleaning" },
      { label: "We have a cleaner already", next: "dm_has_cleaner" },
      { label: "We don't really need cleaning", next: "dm_no_need" },
      { label: "Tell me more / what do you offer?", next: "dm_interested" },
      { label: "We're not interested", next: "dm_hard_no" },
      { label: "How much do you charge?", next: "dm_pricing" },
      { label: "I've only got 30 seconds", next: "dm_very_busy" },
      { label: "Do you have a website?", next: "dm_asks_website" },
      { label: "Send something in the post", next: "dm_wants_post" },
      { label: "We're closing down / moving", next: "dm_closing_down" },
      { label: "Call our head office instead", next: "dm_head_office" },
      { label: "How did you get this number?", next: "dm_how_got_number" },
    ],
  },

  dm_very_busy: {
    context: "⏱️ They're impatient - give them the one-liner and go for the quote.",
    you: "Totally - ten seconds. We're a premium cleaning company in East London. I manage every job closely - tracking attendance, punctuality, before and after photos - and you get direct contact with me. We focus on the experience, not just the clean. Do you currently have someone coming in, or do you handle it yourselves?",
    responses: [
      { label: "We have someone / we do it ourselves", next: "dm_has_cleaner" },
      { label: "No, nothing in place", next: "dm_no_current_cleaner" },
      { label: "Just send me something", next: "gatekeeper_email" },
    ],
  },

  dm_asks_website: {
    context: "🌐 They want to check you out online first.",
    you: "Of course - it's [your website]. While I've got you though, can I ask - do you currently have a cleaner, or is that something you've been thinking about?",
    tip: "Don't just give the website and hang up. Use it to keep the conversation going.",
    responses: [
      { label: "We have one already", next: "dm_has_cleaner" },
      { label: "Not really / just looking", next: "dm_needs_to_think" },
      { label: "I'll have a look and get back to you", next: "dm_needs_to_think" },
    ],
  },

  dm_wants_post: {
    context: "📬 They want something in the post.",
    you: "Of course - I can do that. Could I get your address and your name? And just so I send the right thing, do you currently have a cleaner or is it something you've been thinking about?",
    responses: [
      { label: "They give details and context", next: "got_contact" },
      { label: "They're vague / just say send to the office", next: "got_generic_email" },
    ],
  },

  dm_closing_down: {
    context: "🏚️ They're closing or moving - exit with class.",
    you: "Oh, I'm sorry to hear that - thanks for letting me know. I hope the move goes smoothly. Take care!",
    tip: "If they're moving, lightly mention you'd be happy to help at the new space if they need it.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  dm_head_office: {
    context: "🏢 They're redirecting you to head office.",
    you: "Got it - do you have a number or name of who I should speak to there? And just so I know, is cleaning handled centrally or does each branch decide for themselves?",
    tip: "Branch managers often have local power. Find out before chasing head office.",
    responses: [
      { label: "They give me head office details", next: "got_contact" },
      { label: "They don't know / just say call them", next: "call_ended_softly" },
    ],
  },

  dm_does_own_cleaning: {
    context: "🧹 They clean themselves - this is an opportunity.",
    you: "Fair enough - a lot of smaller businesses do. Can I ask, is that working well, or is it one of those things that falls through the cracks when everyone's busy?",
    responses: [
      { label: "Honestly it's a bit of a hassle", next: "dm_pain_point_found" },
      { label: "It works fine for us", next: "dm_happy_with_status_quo" },
      { label: "We just don't have the budget", next: "dm_budget_concern" },
    ],
  },

  dm_has_cleaner: {
    context: "🧹 They have a cleaner - get curious, don't back off.",
    you: "That's great - are you happy with them, or is it more of a 'they do the job' situation?",
    responses: [
      { label: "Yeah we're pretty happy", next: "dm_happy_with_cleaner" },
      { label: "Honestly there are some issues", next: "dm_pain_point_found" },
      { label: "They're okay but a bit unreliable", next: "dm_reliability_issue" },
    ],
  },

  dm_reliability_issue: {
    context: "⚡ Reliability - the number one pain point in cleaning.",
    you: "That's honestly the number one thing we hear. Reliability is everything - if your cleaner doesn't show, it affects your whole day. What sets us apart is that I track cleaner attendance and punctuality on every job, take before and after photos, and you've got direct contact with me - not a call centre. Would it be worth getting a quote just so you've got something to compare?",
    responses: [
      { label: "Yeah, how does that work?", next: "quote_process" },
      { label: "We'd feel bad dropping our current cleaner", next: "dm_loyalty_to_current" },
      { label: "How much do you charge?", next: "dm_pricing" },
    ],
  },

  dm_pain_point_found: {
    context: "⚡ They've admitted a problem - don't rush, dig deeper.",
    you: "I completely get that. That's honestly the main reason people come to us - they want it handled properly without the hassle. What's been the biggest frustration?",
    responses: [
      { label: "Reliability / they don't always show up", next: "dm_reliability_issue" },
      { label: "Quality isn't consistent", next: "dm_quality_issue" },
      { label: "Communication is poor", next: "dm_comms_issue" },
      { label: "It's just too much to organise", next: "dm_organisation_issue" },
    ],
  },

  dm_quality_issue: {
    context: "⚡ Quality is their concern.",
    you: "That's really common - standards slip over time. What sets us apart is that we focus on the full experience, not just getting the job done. I track attendance and punctuality on every clean, take before and after photos, and if anything's ever not right you've got direct contact with me. Would it be worth getting a quote so you've got something to compare?",
    responses: [
      { label: "Yeah, how does that work?", next: "quote_process" },
      { label: "How much do you charge?", next: "dm_pricing" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_comms_issue: {
    context: "⚡ Communication is their pain point.",
    you: "That drives people mad - not knowing if someone's coming, having to chase. With us, I track attendance and punctuality on every job and you've got direct contact with me throughout. You'll always know what's happening. Would it be worth getting a quick quote so you can see what we'd offer?",
    responses: [
      { label: "Yeah, how does that work?", next: "quote_process" },
      { label: "How much do you charge?", next: "dm_pricing" },
    ],
  },

  dm_organisation_issue: {
    context: "⚡ They just want it off their plate.",
    you: "That's exactly what we're for - you set it up once and I manage everything from there. I track attendance and punctuality, take before and after photos, and you've got direct contact with me if anything ever needs sorting. You don't have to think about it again. Want me to put a quote together so you can see what that looks like?",
    responses: [
      { label: "Yeah, go ahead", next: "quote_process" },
      { label: "How much do you charge?", next: "dm_pricing" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_happy_with_cleaner: {
    context: "😐 They're happy - plant a seed and exit gracefully.",
    you: "That's great - sounds like you're sorted. I'll leave you to it. Could I just leave my details with you so you've got a premium local option if anything ever changes?",
    responses: [
      { label: "Sure, go ahead", next: "got_contact" },
      { label: "No thanks", next: "call_ended_softly" },
    ],
  },

  dm_happy_with_status_quo: {
    context: "😐 They're content doing it themselves.",
    you: "That's fair enough. If it ever becomes a headache or you want to free up that time, we're local and easy to reach. Could I leave my details with you?",
    responses: [
      { label: "Sure", next: "got_contact" },
      { label: "No thanks", next: "call_ended_softly" },
    ],
  },

  dm_no_need: {
    context: "🤔 They say they don't need cleaning.",
    you: "Completely understand. Out of curiosity, is that because the space stays pretty clean, or because it just hasn't been a priority?",
    responses: [
      { label: "Space stays clean / it's small", next: "dm_happy_with_status_quo" },
      { label: "Honestly just haven't got round to it", next: "dm_pain_point_found" },
    ],
  },

  dm_interested: {
    context: "🌟 They want to know more - ask before you pitch.",
    you: "Great - before I go into everything, can I ask what your current setup looks like? Do you have anyone coming in at the moment?",
    responses: [
      { label: "We do it ourselves", next: "dm_does_own_cleaning" },
      { label: "We have a cleaner but not fully happy", next: "dm_pain_point_found" },
      { label: "Nothing in place currently", next: "dm_no_current_cleaner" },
    ],
  },

  dm_no_current_cleaner: {
    context: "🌟 No cleaner in place - ideal prospect.",
    you: "Perfect - so we're a premium cleaning company and what sets us apart is how closely I manage things. I track cleaner attendance and punctuality, take before and after photos on every job, and you've got direct contact with me throughout. We focus on the experience, not just the clean. To get you a proper quote I just need a couple of details - do you know roughly how big the space is, or how many rooms and bathrooms you have?",
    responses: [
      { label: "They give me the details", next: "quote_process" },
      { label: "They don't know the size", next: "quote_size_unknown" },
      { label: "How much does it cost roughly?", next: "dm_pricing" },
    ],
  },

  dm_hard_no: {
    context: "❌ Hard no - don't push, but don't disappear.",
    you: "Totally fine - I appreciate you being straight with me. Can I just ask, is it that you're sorted already, or just not the right time?",
    responses: [
      { label: "We're sorted / have someone", next: "dm_happy_with_cleaner" },
      { label: "Just not interested", next: "call_ended_softly" },
      { label: "Not the right time", next: "dm_bad_timing" },
    ],
  },

  dm_bad_timing: {
    context: "⏳ Not the right time - lock in a future touchpoint.",
    you: "That makes sense. When do you think would be a better time to touch base? I don't want to keep bothering you - I'd rather call when it actually makes sense.",
    responses: [
      { label: "Try again in a few months", next: "callback_booked" },
      { label: "Send me an email", next: "gatekeeper_email" },
      { label: "They're vague", next: "call_ended_softly" },
    ],
  },

  dm_how_got_number: {
    context: "🤔 They're asking how you found them.",
    you: "Completely fair question - I found you through a local search. I do a lot of outreach to businesses in the area. I hope that's okay - happy to take you off my list if you'd prefer.",
    responses: [
      { label: "That's fine, carry on", next: "decision_maker_opener" },
      { label: "Please don't call again", next: "call_ended_no_data" },
    ],
  },

  dm_loyalty_to_current: {
    context: "💛 They feel loyal to their current cleaner.",
    you: "I really respect that - loyalty matters. I'm not asking you to drop anyone. But even just having a quote on file means you've got a premium option ready if anything ever changes. It takes two minutes - can I grab a couple of details to put one together?",
    responses: [
      { label: "Okay, go ahead", next: "quote_process" },
      { label: "I still don't want to", next: "call_ended_softly" },
    ],
  },

  dm_budget_concern: {
    context: "💰 Budget is the concern.",
    you: "That's fair. We do have flexible options - some clients just book us as and when they need us, no contract. Others go for a 3, 6 or 12-month contract which comes with a discount. To give you an honest answer on cost, can I ask - how big is the space roughly, and how many bathrooms do you have?",
    responses: [
      { label: "They give me the details", next: "quote_process" },
      { label: "They don't know the size", next: "quote_size_unknown" },
      { label: "They're still put off by cost", next: "dm_price_objection" },
    ],
  },

  dm_pricing: {
    context: "💰 They're asking about price - don't quote blind.",
    you: "It depends on the size of the space and how often you'd want us. Rather than give you a rough number that might not be accurate, let me ask - how big is the space roughly, and how many bathrooms? I can put a proper quote together for you right now.",
    responses: [
      { label: "They give me the details", next: "quote_process" },
      { label: "They don't know the size", next: "quote_size_unknown" },
      { label: "They just want a ballpark", next: "dm_ballpark" },
    ],
  },

  dm_ballpark: {
    context: "💰 They want a rough number before giving details.",
    you: "Totally understand. We're not the cheapest, but what you get is a premium service - I track attendance and punctuality on every job, before and after photos, and direct contact with me if anything's ever not right. For a proper quote I just need a couple of details - how many rooms and bathrooms roughly?",
    responses: [
      { label: "Okay, go ahead", next: "quote_process" },
      { label: "That sounds expensive", next: "dm_price_objection" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_price_objection: {
    context: "💰 They think you're too expensive.",
    you: "I completely understand - and I won't pretend we're the cheapest option. What we offer is a premium service where I track attendance and punctuality on every job, take before and after photos, and you've got direct contact with me if anything ever needs sorting. A lot of clients find the reliability and consistency saves them time and stress. Would you be open to at least seeing a quote?",
    responses: [
      { label: "Okay, let's see the quote", next: "quote_process" },
      { label: "The price difference is too big", next: "call_ended_softly" },
    ],
  },

  quote_process: {
    context: "📋 They're open to a quote - take the details now.",
    you: "Great - I just need a few quick details and I'll get a quote over to you today. Can I take your name, the address, and roughly how big the space is - number of rooms and bathrooms? And is there anything specific you'd want us to focus on?",
    tip: "Get: name, address, number of rooms, number of bathrooms, any problem areas or add-ons, preferred frequency. Then ask for their email to send the quote to.",
    responses: [
      { label: "They give me all the details", next: "quote_ready_to_send" },
      { label: "They don't know the size", next: "quote_size_unknown" },
      { label: "They get cold feet", next: "dm_needs_to_think" },
    ],
  },

  quote_size_unknown: {
    context: "📋 They don't know their space size - work through it.",
    you: "No worries at all - most people don't know off the top of their head. Is it something you'd be able to check easily - like on your lease or by asking your landlord? Even a rough idea of the number of rooms and bathrooms is enough for me to put a quote together.",
    tip: "Give them the easy option first. If they can find out, book a callback. If not, offer a site visit - it's a warm lead and you can quote accurately in person.",
    responses: [
      { label: "They can check and will get back to me", next: "callback_for_quote" },
      { label: "They can't find out easily", next: "quote_site_visit" },
      { label: "They give me rooms and bathrooms now", next: "quote_ready_to_send" },
    ],
  },

  quote_site_visit: {
    context: "🏠 They can't get the size - offer a site visit.",
    you: "No problem at all - I'm happy to pop in, take a look at the space, and give you an accurate quote in person. It only takes ten to fifteen minutes and there's no obligation. What does your week look like - would that work?",
    tip: "A site visit is a great outcome. You meet them face to face, see the space, and can close on the spot. Treat it like a booked appointment - confirm the date, time and address before you hang up.",
    responses: [
      { label: "They agree to a site visit", next: "site_visit_booked" },
      { label: "They'd rather just get an estimate", next: "quote_ready_to_send" },
      { label: "Not right now / too much hassle", next: "call_ended_softly" },
    ],
  },

  site_visit_booked: {
    context: "🏠 Site visit confirmed - lock in the details.",
    you: "Perfect - so I'll come to you on [day] at [time]. Can I just confirm the address? And is there anything in particular you'd want me to look at when I'm there?",
    tip: "Send a confirmation WhatsApp immediately. Arrive on time. Bring a notepad. Quote them on the spot if you can - don't leave without a number or a follow-up time.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  quote_ready_to_send: {
    context: "🎯 You have the details - close toward booking or confirm the quote.",
    you: "Perfect - I've got everything I need. I'll put a quote together and send it over to [email] today. Now - we do offer a discounted first clean at 50% off so you can experience the service before committing to anything. If the quote looks good to you, would you want to go ahead and get that first clean booked in at the same time?",
    tip: "Best case: they say yes and you book on the spot. Take date, time, address, send payment link. If not, the quote goes out today and you follow up tomorrow.",
    responses: [
      { label: "Yes - let's book it now", next: "close_booking" },
      { label: "Let me see the quote first", next: "quote_sent" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  callback_for_quote: {
    context: "📅 They need to check their space size - lock in a time.",
    you: "No problem - when would be a good time for me to call back once you've had a chance to check? I'll have a quote ready to go as soon as I've got those details.",
    tip: "Set a specific time. Don't leave it open-ended.",
    responses: [
      { label: "They give me a time", next: "callback_booked" },
      { label: "They're vague", next: "call_ended_softly" },
    ],
  },

  close_booking: {
    context: "🏆 They want to book - take all details now.",
    you: "Brilliant. Let me take everything - full name, address, date and time that works for you, and I'll send over a payment link to confirm the booking. What day works best for you?",
    tip: "Get: full name, address, date, time, any specific requirements. Send payment link immediately after the call. For first cleans - 50% off. Confirm whether it's ad-hoc or they want to discuss a contract after the first clean.",
    responses: [
      { label: "Details taken - booking confirmed", next: "booking_confirmed" },
      { label: "They want to check their diary first", next: "close_follow_up" },
    ],
  },

  booking_confirmed: {
    context: "🏆 Booking is confirmed!",
    you: "Fantastic - so I've got you booked in for [date/time] at [address]. I'll send a confirmation message with the payment link right now, and you'll hear from me the day before to confirm everything's on track. Is there anything specific you'd like us to focus on for the first clean?",
    tip: "Send the payment link and confirmation WhatsApp/email immediately. Show up 5 minutes early. Do an exceptional job - this is your foot in the door.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  close_follow_up: {
    context: "📅 They need to check their diary - don't let it go cold.",
    you: "No problem - I'll send you a message now with my details, and you can just reply with a date and time that suits. I'll have the quote ready to go. Does that work?",
    tip: "Send a WhatsApp within 10 minutes: 'Hi [Name], it's Fahana from Cleaning Wizard - great speaking to you. Here's your quote [link/details]. Just reply with a date and time and I'll get you booked in.'",
    responses: [
      { label: "They confirm a date", next: "booking_confirmed" },
      { label: "Start over - new call", next: "start" },
    ],
  },

  quote_sent: {
    context: "📤 Quote is going out - set a follow-up time.",
    you: "I'll send that over to you today. Can I ask - when would be a good time to follow up, just to make sure you've had a chance to look at it? I don't want it to get lost in your inbox.",
    tip: "Follow up within 24 hours if they don't respond. Your follow-up message: 'Hi [Name], just checking you received the quote I sent over. Happy to answer any questions or get you booked in - just let me know.'",
    responses: [
      { label: "They give me a follow-up time", next: "callback_booked" },
      { label: "They say they'll be in touch", next: "call_ended_softly" },
    ],
  },

  dm_needs_to_think: {
    context: "🤔 They need to think - lock in a follow-up before you go.",
    you: "Of course - completely understand. Can I send you a quote so you've got something concrete to look at? I just need your email and a couple of quick details about the space.",
    responses: [
      { label: "They give me details for a quote", next: "quote_process" },
      { label: "They just give me their email", next: "got_contact" },
      { label: "They say don't bother", next: "call_ended_softly" },
    ],
  },

  got_contact: {
    context: "📬 You have a name and email - warm lead.",
    you: "Thank you - I'll send something short over today so you know who we are. And if you ever want a proper quote, it only takes two minutes - just drop me a message.",
    tip: "Send within 2 hours. Keep it 3-4 sentences. End with: 'If you'd like a quote, just reply with the size of your space and I'll have one over to you same day.'",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  got_generic_email: {
    context: "📬 You only have a generic email - still worth sending.",
    you: "Perfect - I'll send something over shortly. Thanks for your time!",
    tip: "Send within the hour. Subject: 'Premium cleaning company - East London'. Address to 'The team'. Keep it 3 sentences and end with a quote offer.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  callback_booked: {
    context: "📅 Callback agreed - treat it like a booked meeting.",
    you: "Perfect - I'll call you on [day/time]. Thanks for your time - speak soon.",
    tip: "Log it immediately. Set a phone alarm. Open your callback with: 'Hi [Name], it's Fahana from Cleaning Wizard - we spoke [day] and you said this was a better time.'",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  call_ended_softly: {
    context: "👋 Call ended - not a loss, just not today.",
    you: "No worries at all - thanks for your time. If anything ever changes, you know where to find us.",
    tip: "Log as Soft No. Re-contact in 6-8 weeks. Situations change - cleaners leave, businesses grow.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  call_ended_hung_up: {
    context: "📵 They hung up.",
    you: "(Call ended by them)",
    tip: "Log as Hung Up. Don't call back today. Try again in a few weeks.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },

  call_ended_no_data: {
    context: "❌ Hard no - no data. Move on.",
    you: "(End the call politely)",
    tip: "Log as Hard No. Don't contact again. Move to the next call.",
    responses: [{ label: "Start over - new call", next: "start" }],
  },
};

const stageColors = {
  "📞": "#3B82F6", "📱": "#6B7280", "😅": "#6B7280", "🛡️": "#8B5CF6",
  "📧": "#8B5CF6", "✅": "#10B981", "🧹": "#F59E0B", "⚡": "#EF4444",
  "😐": "#6B7280", "🌟": "#10B981", "❌": "#EF4444", "⏳": "#F59E0B",
  "⏱️": "#F59E0B", "🤔": "#8B5CF6", "💛": "#F59E0B", "💰": "#F59E0B",
  "🎯": "#10B981", "🏆": "#10B981", "📅": "#3B82F6", "📬": "#3B82F6",
  "👋": "#6B7280", "📵": "#6B7280", "🌐": "#3B82F6", "🏚️": "#6B7280",
  "🏢": "#8B5CF6", "📋": "#10B981", "📤": "#3B82F6", "🏠": "#10B981",
};

const getAccent = (context) => {
  const emoji = [...context].slice(0, 2).join("").trim();
  return stageColors[emoji] || "#3B82F6";
};

export default function CallScript({ onClose }) {
  const [currentKey, setCurrentKey] = useState("start");
  const [history, setHistory] = useState([]);
  const current = FLOW[currentKey];
  const accent = getAccent(current.context);

  const handleResponse = (next, label) => {
    setHistory((h) => [...h, { key: currentKey, label }]);
    setCurrentKey(next);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentKey(prev.key);
  };

  const reset = () => { setCurrentKey("start"); setHistory([]); };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: "min(440px, 100%)",
      background: "#0F0F13", color: "#E8E8F0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex", flexDirection: "column",
      zIndex: 1200, boxShadow: "-8px 0 40px rgba(0,0,0,0.45)", overflowY: "auto",
    }}>
      <div style={{ background: "#16161D", borderBottom: "1px solid #2A2A35", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 8px #22C55E" }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Call Script</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {history.length > 0 && <button onClick={goBack} style={{ background: "#2A2A35", border: "none", color: "#A0A0B8", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>}
          <button onClick={reset} style={{ background: "#2A2A35", border: "none", color: "#A0A0B8", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>↺ Reset</button>
          <button onClick={onClose} style={{ background: "#2A2A35", border: "none", color: "#A0A0B8", padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ background: "#13131A", borderBottom: "1px solid #1E1E28", padding: "8px 20px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#555565" }}>Path:</span>
          {history.map((h, i) => (
            <span key={i} style={{ fontSize: 11, color: "#555565", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#3B3B50" }}>{h.label}</span>
              {i < history.length - 1 && <span style={{ color: "#2A2A38" }}>›</span>}
            </span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, width: "100%", padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 20, padding: "5px 14px", alignSelf: "flex-start" }}>
          <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>{current.context}</span>
        </div>

        <div style={{ background: "#16161D", border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`, borderRadius: "0 12px 12px 0", padding: "18px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: accent, textTransform: "uppercase", marginBottom: 10 }}>You say</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#E8E8F0", margin: 0, fontStyle: "italic" }}>"{current.you}"</p>
        </div>

        {current.tip && (
          <div style={{ background: "#1A1A10", border: "1px solid #3A3A10", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <p style={{ margin: 0, fontSize: 13, color: "#C8C870", lineHeight: 1.6 }}>{current.tip}</p>
          </div>
        )}

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#555565", textTransform: "uppercase", marginBottom: 12 }}>They say...</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {current.responses.map((r, i) => (
              <button key={i} onClick={() => handleResponse(r.next, r.label)}
                style={{ background: "#16161D", border: "1px solid #2A2A35", borderRadius: 10, padding: "13px 16px", color: "#C8C8DC", fontSize: 14, textAlign: "left", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.5, transition: "all 0.15s ease", display: "flex", alignItems: "center", gap: 12 }}
                onMouseEnter={e => { e.currentTarget.style.background = `${accent}18`; e.currentTarget.style.borderColor = `${accent}60`; e.currentTarget.style.color = "#E8E8F0"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#16161D"; e.currentTarget.style.borderColor = "#2A2A35"; e.currentTarget.style.color = "#C8C8DC"; }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#2A2A35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#666678", flexShrink: 0 }}>{i + 1}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
