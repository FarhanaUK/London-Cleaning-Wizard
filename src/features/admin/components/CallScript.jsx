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
    context: "📱 Voicemail - keep it short, warm, and curiosity-driven.",
    you: "Hi, my name's Fahana - I run a local cleaning company in East London called Cleaning Wizard. I was just reaching out to introduce ourselves - we work with a few businesses in the area and I thought it might be worth a quick chat. I'll try again, but feel free to call me back on [your number]. Have a great day.",
    tip: "💡 Don't pitch on voicemail. Just your name, company, and a reason to call back. Keep it under 20 seconds. Always say you'll try again - it gives you a reason to call back without it feeling cold.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  wrong_number: {
    context: "😅 Wrong number or not a business - exit cleanly.",
    you: "Oh, so sorry about that - I must have the wrong number. Thanks and sorry for the bother!",
    tip: "💡 Log it and move on. Don't waste time.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  gatekeeper_instant_no: {
    context: "🛡️ They said 'not interested' before you even explained why you're calling.",
    you: "I completely understand - I haven't even said who I am yet! My name's Fahana, I run a local cleaning company. I'm not here to sell anything right now - I just wanted a thirty-second word with whoever handles that side of things. Is there any chance you could point me in the right direction?",
    tip: "💡 The key here is gentle humour and honesty. You're disarming them, not arguing.",
    responses: [
      { label: "They soften and offer to help", next: "gatekeeper_why" },
      { label: "They still say no / not interested", next: "gatekeeper_not_interested" },
      { label: "They hang up", next: "call_ended_hung_up" },
      { label: "They put me through", next: "decision_maker_opener" },
    ],
  },

  gatekeeper_why: {
    context: "🛡️ Gatekeeper is screening you.",
    you: "My name's Fahana - I run a local cleaning company in East London. I just wanted to introduce myself to whoever handles that side of things. It's a really quick two-minute chat, nothing more.",
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
    you: "Of course - my name's Fahana, I run a local cleaning company called Cleaning Wizard based in East London. Just wanted a very quick word with whoever handles maintenance or cleaning - two minutes max.",
    responses: [
      { label: "We're not interested", next: "gatekeeper_not_interested" },
      { label: "Okay, let me put you through", next: "decision_maker_opener" },
      { label: "Can you send an email instead?", next: "gatekeeper_email" },
      { label: "They hang up", next: "call_ended_hung_up" },
    ],
  },

  gatekeeper_not_interested: {
    context: "🛡️ The gatekeeper is saying no - but they don't make this decision.",
    you: "Totally understood - I just want to make sure I'm not wasting anyone's time including yours. Is it that you already have a cleaner you're happy with, or is it just not the right moment? I'd rather speak to the right person directly for two minutes than go back and forth.",
    responses: [
      { label: "We already have a cleaner", next: "gatekeeper_has_cleaner" },
      { label: "It's just not a good time", next: "gatekeeper_bad_time" },
      { label: "They still won't put me through", next: "gatekeeper_final_fallback" },
      { label: "They hang up", next: "call_ended_hung_up" },
      { label: "Okay fine, I'll put you through", next: "decision_maker_opener" },
    ],
  },

  gatekeeper_has_cleaner: {
    context: "🛡️ They're telling you they have a cleaner - redirect to get through.",
    you: "That's great - I'm not trying to replace anyone. I'd just love to introduce ourselves so we're on your radar if anything ever changes. Could I grab the manager's name and a quick email so I can send a short intro?",
    responses: [
      { label: "They give me a name and email", next: "got_contact" },
      { label: "They refuse and end the call", next: "call_ended_softly" },
    ],
  },

  gatekeeper_bad_time: {
    context: "🛡️ Timing is the issue - lock in a callback.",
    you: "No problem at all - when would be a better time to call back? I'd rather ring when it's convenient than bother you now.",
    responses: [
      { label: "They give me a time to call back", next: "callback_booked" },
      { label: "They say just send an email", next: "gatekeeper_email" },
      { label: "They're vague / brush me off", next: "call_ended_softly" },
    ],
  },

  gatekeeper_final_fallback: {
    context: "🛡️ Last resort - get something before you go.",
    you: "No worries at all - I completely understand. Could I just grab an email address so I can send a really short intro? That way the right person can have a look when they've got a moment.",
    responses: [
      { label: "They give me an email", next: "got_contact" },
      { label: "They say no and end the call", next: "call_ended_no_data" },
    ],
  },

  gatekeeper_email: {
    context: "📧 They want you to email instead - get a name so it's not generic.",
    you: "Of course, happy to do that. Just so I don't send something generic - could I get a name so I can address it properly? And what's the best email?",
    responses: [
      { label: "They give me a name and email", next: "got_contact" },
      { label: "They say just use info@ or the website", next: "got_generic_email" },
    ],
  },

  gatekeeper_company: {
    context: "🛡️ They're asking about your company.",
    you: "It's called Cleaning Wizard - we're a local cleaning company based in East London. We mainly work with small offices, estate agents and shops in the area. I just wanted a very quick intro with whoever handles that side of things.",
    responses: [
      { label: "Okay, let me put you through", next: "decision_maker_opener" },
      { label: "We're not interested", next: "gatekeeper_not_interested" },
      { label: "Can you send an email?", next: "gatekeeper_email" },
    ],
  },

  gatekeeper_unavailable: {
    context: "🛡️ The decision maker isn't available - don't lose the moment.",
    you: "No problem - could I get their name so I can ask for them directly when I call back? And is there a better time to reach them?",
    responses: [
      { label: "They give me a name and a time", next: "callback_booked" },
      { label: "They say just call back generally", next: "call_ended_softly" },
      { label: "They suggest I email instead", next: "gatekeeper_email" },
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
    you: "Hi [Name] - my name's Fahana, I run a local cleaning company in East London called Cleaning Wizard. I'll be really quick - do you handle the cleaning yourselves at the moment, or do you have someone coming in?",
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
    context: "⏱️ They're impatient - respect it and give them the one-liner.",
    you: "Totally - I'll be ten seconds. We're a local cleaning company in East London, really reliable, good value. If you ever need someone or your current setup isn't working, we'd love to be on your radar. Can I send you a quick email?",
    responses: [
      { label: "Sure, go ahead", next: "gatekeeper_email" },
      { label: "No thanks", next: "call_ended_softly" },
      { label: "Actually tell me a bit more", next: "dm_interested" },
    ],
  },

  dm_asks_website: {
    context: "🌐 They want to check you out online first.",
    you: "Of course - it's [your website]. While I've got you though, can I ask - do you currently have a cleaner, or is that something you're looking into?",
    tip: "💡 Don't just give the website and hang up. Use it as a bridge to keep the conversation going.",
    responses: [
      { label: "We have one already", next: "dm_has_cleaner" },
      { label: "Not really, just browsing", next: "dm_needs_to_think" },
      { label: "I'll have a look and get back to you", next: "dm_needs_to_think" },
    ],
  },

  dm_wants_post: {
    context: "📬 They want something in the post - rare but it happens.",
    you: "Of course - I can do that. Could I get your address and a name to address it to? And just so I send the right thing, do you currently have a cleaner or is it something you've been thinking about?",
    tip: "💡 Get the address AND use it to qualify them. Sending post without knowing their situation is wasted effort.",
    responses: [
      { label: "They give address and context", next: "got_contact" },
      { label: "They're vague / just say send to the office", next: "got_generic_email" },
    ],
  },

  dm_closing_down: {
    context: "🏚️ They're closing or moving - exit with class.",
    you: "Oh, I'm sorry to hear that - thanks for letting me know. I hope the move goes smoothly. Take care!",
    tip: "💡 Log it and move on. No point pushing. But if they're moving, they might need a cleaner at the new place - you could mention it very lightly if the vibe is right.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  dm_head_office: {
    context: "🏢 They're redirecting you to head office.",
    you: "Got it - do you have a number or name of who I should speak to there? And just so I know, is cleaning decisions handled centrally or does each location decide?",
    tip: "💡 This tells you whether it's worth calling HQ or whether local managers have the power. Get both if you can.",
    responses: [
      { label: "They give me head office details", next: "got_contact" },
      { label: "They don't know / just say call them", next: "call_ended_softly" },
    ],
  },

  dm_does_own_cleaning: {
    context: "🧹 They clean themselves - this is actually an opportunity.",
    you: "Fair enough - a lot of smaller businesses do. Can I ask, is that working well for you, or is it one of those things that just falls through the cracks when everyone's busy?",
    responses: [
      { label: "Honestly it's a bit of a hassle", next: "dm_pain_point_found" },
      { label: "It works fine for us", next: "dm_happy_with_status_quo" },
      { label: "We just don't have the budget", next: "dm_budget_concern" },
    ],
  },

  dm_has_cleaner: {
    context: "🧹 They have a cleaner - don't back off, get curious.",
    you: "That's great - are you happy with them, or is it more of a 'they do the job' situation?",
    responses: [
      { label: "Yeah we're pretty happy with them", next: "dm_happy_with_cleaner" },
      { label: "Honestly there are some issues", next: "dm_pain_point_found" },
      { label: "They're okay but a bit unreliable", next: "dm_reliability_issue" },
    ],
  },

  dm_reliability_issue: {
    context: "⚡ Reliability is the golden pain point in cleaning.",
    you: "That's actually the number one thing we hear. Reliability is everything in this industry - if your cleaner doesn't show, it affects the whole day. That's something we're really focused on. Would it be worth a quick trial just to compare? No commitment - if it's not better, you've lost nothing.",
    responses: [
      { label: "Maybe - what does a trial look like?", next: "close_trial" },
      { label: "We'd feel bad dropping our current cleaner", next: "dm_loyalty_to_current" },
      { label: "How much do you charge?", next: "dm_pricing" },
    ],
  },

  dm_pain_point_found: {
    context: "⚡ They've admitted a problem - this is your moment. Don't rush.",
    you: "I completely get that. That's honestly the main reason people come to us - they want it handled properly without having to chase anyone. What's been the biggest frustration?",
    responses: [
      { label: "Reliability / they don't always show up", next: "dm_reliability_issue" },
      { label: "Quality isn't consistent", next: "dm_quality_issue" },
      { label: "Communication is poor", next: "dm_comms_issue" },
      { label: "It's just too much to organise", next: "dm_organisation_issue" },
    ],
  },

  dm_quality_issue: {
    context: "⚡ Quality is their concern.",
    you: "That's a really common one - standards slipping over time. We do a walkthrough after every clean and we're reachable if anything's ever not right. Would it be worth a trial clean just so you can see the difference firsthand?",
    responses: [
      { label: "Maybe - what does a trial look like?", next: "close_trial" },
      { label: "How much do you charge?", next: "dm_pricing" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_comms_issue: {
    context: "⚡ Communication is their pain point.",
    you: "That drives people mad - not knowing if someone's coming or having to chase them. We're really big on communication, you'll always know what's happening. Would it be worth doing a trial just to experience the difference?",
    responses: [
      { label: "Maybe - what does a trial look like?", next: "close_trial" },
      { label: "How much do you charge?", next: "dm_pricing" },
    ],
  },

  dm_organisation_issue: {
    context: "⚡ They just want it off their plate.",
    you: "That's exactly what we're for - you set it up once and forget about it. We handle everything, we're consistent, and you don't have to think about it again. Want to try it for a month and see?",
    responses: [
      { label: "That sounds good actually", next: "close_trial" },
      { label: "How much do you charge?", next: "dm_pricing" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_happy_with_cleaner: {
    context: "😐 They're happy - plant a seed and exit gracefully.",
    you: "That's brilliant - sounds like you're sorted. I'll leave you to it. Could I just leave my details with you so you've got a local option if anything ever changes? Takes two seconds.",
    responses: [
      { label: "Sure, go ahead", next: "got_contact" },
      { label: "No thanks", next: "call_ended_softly" },
    ],
  },

  dm_happy_with_status_quo: {
    context: "😐 They're content with doing it themselves.",
    you: "That's fair enough - it works for a lot of people. If it ever becomes a headache or you want to free up that time, we're local so easy to reach. Could I leave my number with you?",
    responses: [
      { label: "Sure", next: "got_contact" },
      { label: "No thanks", next: "call_ended_softly" },
    ],
  },

  dm_no_need: {
    context: "🤔 They say they don't need cleaning.",
    you: "Completely understand - every business is different. Out of curiosity, is that because the space stays pretty clean, or because it's just not been a priority?",
    responses: [
      { label: "The space stays clean / it's small", next: "dm_happy_with_status_quo" },
      { label: "Honestly just haven't got round to it", next: "dm_pain_point_found" },
    ],
  },

  dm_interested: {
    context: "🌟 They're curious - don't oversell, ask first.",
    you: "Great - before I go into everything, can I ask what your current setup looks like? Do you have anyone coming in at the moment?",
    responses: [
      { label: "We do it ourselves", next: "dm_does_own_cleaning" },
      { label: "We have a cleaner but not fully happy", next: "dm_pain_point_found" },
      { label: "Nothing in place currently", next: "dm_no_current_cleaner" },
    ],
  },

  dm_no_current_cleaner: {
    context: "🌟 No cleaner in place - ideal prospect.",
    you: "Perfect - so we could come in, do a trial clean, and you can see exactly what we do and how we work. No contract to start, just a one-off to see if it's a fit. Would that be worth trying?",
    responses: [
      { label: "Yes, let's do it", next: "close_booking" },
      { label: "How much would that be?", next: "dm_pricing" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_hard_no: {
    context: "❌ Hard no from the decision maker - don't push, but don't vanish.",
    you: "Totally fine - I appreciate you being straight with me. Can I just ask, is it that you're sorted already, or just not the right time?",
    responses: [
      { label: "We're sorted / have someone", next: "dm_happy_with_cleaner" },
      { label: "Just not interested at all", next: "call_ended_softly" },
      { label: "Not the right time", next: "dm_bad_timing" },
    ],
  },

  dm_bad_timing: {
    context: "⏳ Timing is the issue - lock in a future touchpoint.",
    you: "That makes sense - when do you think would be a better time to touch base? I don't want to keep bothering you, just want to make sure I reach out when it actually makes sense for you.",
    responses: [
      { label: "Try again in a few months", next: "callback_booked" },
      { label: "Send me an email", next: "gatekeeper_email" },
      { label: "They're still vague", next: "call_ended_softly" },
    ],
  },

  dm_how_got_number: {
    context: "🤔 They're questioning how you found them - be honest.",
    you: "Completely fair question - I found you through a local search. I do a lot of outreach to businesses in the area. I hope that's okay - happy to take you off my list if you'd prefer.",
    responses: [
      { label: "That's fine, carry on", next: "decision_maker_opener" },
      { label: "Please don't call again", next: "call_ended_no_data" },
    ],
  },

  dm_loyalty_to_current: {
    context: "💛 They feel loyal to their current cleaner.",
    you: "I really respect that - loyalty matters. I'm not asking you to drop anyone. What I'd suggest is a one-off trial alongside what you already have, just so you've got something to compare. If we're not better, you carry on as normal.",
    responses: [
      { label: "I suppose that's fair", next: "close_trial" },
      { label: "I still don't want to", next: "call_ended_softly" },
    ],
  },

  dm_budget_concern: {
    context: "💰 Budget is the blocker.",
    you: "That's fair - can I ask what you're currently spending, roughly? I'd rather just be honest about whether we can work within that rather than waste your time.",
    responses: [
      { label: "They share a rough number", next: "dm_pricing" },
      { label: "They won't share / too vague", next: "dm_pricing" },
    ],
  },

  dm_pricing: {
    context: "💰 They're asking about price - don't quote blind.",
    you: "It depends on the size of the space and how often you'd want us in. For a small office, we typically start from around £[X] for a weekly clean. Can I ask roughly how big the space is and what you're thinking - weekly, fortnightly?",
    tip: "💡 Fill in your actual price. Don't undersell. Give a range, not a fixed number yet.",
    responses: [
      { label: "That sounds reasonable", next: "close_trial" },
      { label: "That's more than we pay now", next: "dm_price_objection" },
      { label: "I'd need to think about it", next: "dm_needs_to_think" },
    ],
  },

  dm_price_objection: {
    context: "💰 They say you're more expensive than their current setup.",
    you: "I understand - price matters. Can I ask what you get for that? Sometimes people find they're paying less but spending more in time chasing or redoing things. If we can match it or get close, would you be open to a trial?",
    responses: [
      { label: "Maybe - let's try it", next: "close_trial" },
      { label: "The price difference is too big", next: "call_ended_softly" },
    ],
  },

  dm_needs_to_think: {
    context: "🤔 Classic stall - give them something to hold and lock in a follow-up.",
    you: "Of course - it's not a small decision. Can I do this - let me send you a short email with what we offer and our pricing, and I'll give you a call in a few days once you've had a chance to look? What's the best email?",
    responses: [
      { label: "They give me their email", next: "got_contact" },
      { label: "They say don't bother following up", next: "call_ended_softly" },
    ],
  },

  close_trial: {
    context: "🎯 They're open to a trial - close it now while they're warm.",
    you: "Great - what I'd suggest is we do a first clean at a reduced rate so you can see exactly what we do with no risk. We can sort a date that works for you. What does your week look like - are mornings or afternoons better?",
    tip: "💡 Offer a specific discount for the first clean - e.g. 50% off or even free. Getting them to experience the service is worth more than the fee right now.",
    responses: [
      { label: "They agree and give a day/time", next: "close_booking" },
      { label: "They want to check their diary", next: "close_follow_up" },
      { label: "They get cold feet", next: "dm_needs_to_think" },
    ],
  },

  close_booking: {
    context: "🏆 You've got a booking! Lock in every detail.",
    you: "Brilliant - let me confirm: [Date, time, address]. I'll send you a confirmation message with my number so you've got everything. Is there anything specific you want us to focus on for the first clean?",
    tip: "💡 After the call: send a WhatsApp or email confirmation immediately. Show up 5 minutes early. Do an exceptional job - this booking could turn into a regular.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  close_follow_up: {
    context: "📅 They need to check availability - don't let it go cold.",
    you: "No problem - I'll tell you what, I'll send you a message now so you've got my details, and you can just reply with a time that suits. Does that work?",
    tip: "💡 Send a WhatsApp or text within 10 minutes of hanging up. Keep it short: 'Hi [Name], it's Fahana from Cleaning Wizard - great speaking to you. Just send me a time and I'll get it booked in for you.'",
    responses: [
      { label: "They respond and confirm", next: "close_booking" },
      { label: "Start over - new call", next: "start" },
    ],
  },

  got_contact: {
    context: "📬 You have a name and/or email - this is a warm lead.",
    you: "Thank you so much - I'll send something short over today. It won't be a sales pitch, just a quick intro so you know who we are if you ever need us.",
    tip: "💡 Follow up within 2 hours. Subject line: 'Local cleaning company - quick intro'. Keep it to 4 sentences max. End with: 'Happy to do a trial clean at no risk if you ever want to see what we're like.'",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  got_generic_email: {
    context: "📬 You only have a generic email - still worth sending.",
    you: "Perfect - I'll send something over shortly. Thanks for your time!",
    tip: "💡 Send within the hour. Subject: 'Local cleaning company - East London'. Address it to 'The team' or 'Whoever handles facilities'. Keep it very short - 3 sentences and a call to action.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  callback_booked: {
    context: "📅 You have a callback time - treat this like a booked meeting.",
    you: "Perfect - I'll call [day/time]. Thanks for your time - speak soon.",
    tip: "💡 Log this immediately. Set a phone alarm. When you call back, open with: 'Hi [Name], it's Fahana from Cleaning Wizard - we spoke [day] and you said this was a better time.'",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  call_ended_softly: {
    context: "👋 Call ended - not a loss, just not today.",
    you: "No worries at all - thanks for your time. If anything ever changes, you know where to find us.",
    tip: "💡 Log as 'Soft No'. Re-contact in 6-8 weeks. Situations change - a cleaner leaving, a business growing - your timing might be perfect next time.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  call_ended_hung_up: {
    context: "📵 They hung up - it happens. Don't take it personally.",
    you: "(Call ended by them)",
    tip: "💡 Log as 'Hung Up'. Don't call back today. You can try again in a few weeks with a fresh approach - they may have just been having a bad day.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },

  call_ended_no_data: {
    context: "❌ Hard no, no data. Move on quickly.",
    you: "(End call politely)",
    tip: "💡 Log as 'Hard No'. Don't contact again. Move to the next one - every no gets you closer to a yes.",
    responses: [
      { label: "Start over - new call", next: "start" },
    ],
  },
};

const stageColors = {
  "📞": "#3B82F6",
  "📱": "#6B7280",
  "😅": "#6B7280",
  "🛡️": "#8B5CF6",
  "📧": "#8B5CF6",
  "✅": "#10B981",
  "🧹": "#F59E0B",
  "⚡": "#EF4444",
  "😐": "#6B7280",
  "🌟": "#10B981",
  "❌": "#EF4444",
  "⏳": "#F59E0B",
  "⏱️": "#F59E0B",
  "🤔": "#8B5CF6",
  "💛": "#F59E0B",
  "💰": "#F59E0B",
  "🎯": "#10B981",
  "🏆": "#10B981",
  "📅": "#3B82F6",
  "📬": "#3B82F6",
  "👋": "#6B7280",
  "📵": "#6B7280",
  "🌐": "#3B82F6",
  "🏚️": "#6B7280",
  "🏢": "#8B5CF6",
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

  const reset = () => {
    setCurrentKey("start");
    setHistory([]);
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: "min(440px, 100%)",
      background: "#0F0F13",
      color: "#E8E8F0",
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      zIndex: 1200,
      boxShadow: "-8px 0 40px rgba(0,0,0,0.45)",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        background: "#16161D",
        borderBottom: "1px solid #2A2A35",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#22C55E",
            boxShadow: "0 0 8px #22C55E",
          }} />
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.02em" }}>
            Call Script
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {history.length > 0 && (
            <button onClick={goBack} style={{
              background: "#2A2A35", border: "none", color: "#A0A0B8",
              padding: "6px 12px", borderRadius: 6, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit",
            }}>← Back</button>
          )}
          <button onClick={reset} style={{
            background: "#2A2A35", border: "none", color: "#A0A0B8",
            padding: "6px 12px", borderRadius: 6, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>↺ Reset</button>
          <button onClick={onClose} style={{
            background: "#2A2A35", border: "none", color: "#A0A0B8",
            padding: "6px 12px", borderRadius: 6, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>✕ Close</button>
        </div>
      </div>

      {/* Breadcrumb */}
      {history.length > 0 && (
        <div style={{
          background: "#13131A", borderBottom: "1px solid #1E1E28",
          padding: "8px 20px", display: "flex", gap: 6,
          flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "#555565" }}>Path:</span>
          {history.map((h, i) => (
            <span key={i} style={{ fontSize: 11, color: "#555565", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#3B3B50" }}>{h.label}</span>
              {i < history.length - 1 && <span style={{ color: "#2A2A38" }}>›</span>}
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{
        flex: 1, width: "100%",
        padding: "24px 20px 40px",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Stage badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `${accent}18`, border: `1px solid ${accent}40`,
          borderRadius: 20, padding: "5px 14px", alignSelf: "flex-start",
        }}>
          <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>
            {current.context}
          </span>
        </div>

        {/* Your line */}
        <div style={{
          background: "#16161D", border: `1px solid ${accent}30`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: "0 12px 12px 0", padding: "18px 20px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            color: accent, textTransform: "uppercase", marginBottom: 10,
          }}>You say</div>
          <p style={{
            fontSize: 15, lineHeight: 1.7, color: "#E8E8F0",
            margin: 0, fontStyle: "italic",
          }}>"{current.you}"</p>
        </div>

        {/* Tip */}
        {current.tip && (
          <div style={{
            background: "#1A1A10", border: "1px solid #3A3A10",
            borderRadius: 10, padding: "14px 16px",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <p style={{ margin: 0, fontSize: 13, color: "#C8C870", lineHeight: 1.6 }}>
              {current.tip.replace("💡 ", "")}
            </p>
          </div>
        )}

        {/* Response options */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            color: "#555565", textTransform: "uppercase", marginBottom: 12,
          }}>They say...</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {current.responses.map((r, i) => (
              <button
                key={i}
                onClick={() => handleResponse(r.next, r.label)}
                style={{
                  background: "#16161D", border: "1px solid #2A2A35",
                  borderRadius: 10, padding: "13px 16px", color: "#C8C8DC",
                  fontSize: 14, textAlign: "left", cursor: "pointer",
                  fontFamily: "inherit", lineHeight: 1.5,
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: 12,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${accent}18`;
                  e.currentTarget.style.borderColor = `${accent}60`;
                  e.currentTarget.style.color = "#E8E8F0";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "#16161D";
                  e.currentTarget.style.borderColor = "#2A2A35";
                  e.currentTarget.style.color = "#C8C8DC";
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: 6, background: "#2A2A35",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#666678", flexShrink: 0,
                }}>{i + 1}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
