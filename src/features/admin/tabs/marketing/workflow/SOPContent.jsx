import { MKT, FONT, SERIF, SLabel, MktAlert, Divider } from './MktShared';

// ── Local helpers ─────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{ background: MKT.card, border: `0.5px solid ${MKT.border}`, borderRadius: 10, padding: '1.25rem', marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

function SubHead({ children }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
      textTransform: 'uppercase', color: MKT.gold, marginBottom: 10, marginTop: 20,
      paddingBottom: 6, borderBottom: `0.5px solid ${MKT.border}`,
    }}>
      {children}
    </div>
  );
}

function P({ children, style }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.8, margin: '0 0 10px', ...style }}>
      {children}
    </p>
  );
}

function Li({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.03)' }}>
      <span style={{ color: MKT.gold, flexShrink: 0, fontFamily: FONT, fontSize: 13, marginTop: 2 }}>→</span>
      <span style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.7 }}>{children}</span>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'rgba(201,169,110,0.12)', border: `0.5px solid rgba(201,169,110,0.35)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontFamily: SERIF, fontSize: 15, color: MKT.gold,
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: MKT.text, marginBottom: 5 }}>{title}</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: MKT.muted, lineHeight: 1.75 }}>{children}</div>
      </div>
    </div>
  );
}

function TabBadge({ label }) {
  return (
    <span style={{
      background: 'rgba(201,169,110,0.1)', border: `0.5px solid rgba(201,169,110,0.3)`,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontFamily: FONT, color: MKT.gold,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

function ConnectsTo({ tabs }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 10, borderTop: `0.5px solid ${MKT.border}`, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ fontFamily: FONT, fontSize: 11, color: MKT.dim }}>Connects to:</span>
      {tabs.map(t => <TabBadge key={t} label={t} />)}
    </div>
  );
}

const KEYS = [
  { key: 'mkt_paid_farhana',       desc: 'Workflow — Paid (Farhana) channel cards' },
  { key: 'mkt_paid_steven',        desc: 'Workflow — Paid (Steven) channel cards' },
  { key: 'mkt_free_steven',        desc: 'Workflow — Free (Steven) channel cards' },
  { key: 'mkt_free_farhana',       desc: 'Workflow — Free (Farhana) channel cards' },
  { key: 'mkt_daily_rhythm',       desc: 'Workflow — Daily rhythm schedule rows' },
  { key: 'mkt_checklist',          desc: 'Weekly tracker — checklist items and check states' },
  { key: 'mkt_message',            desc: 'Weekly tracker — weekly focus message' },
  { key: 'mkt_budget_rows',        desc: 'Budget — paid channel budget allocation table' },
  { key: 'mkt_budget_free',        desc: 'Budget — free channel effort tracker rows' },
  { key: 'mkt_budget_cut',         desc: 'Budget — what to cut section' },
  { key: 'mkt_budget_scale',       desc: 'Budget — what to scale section' },
  { key: 'mkt_targets_monthly',    desc: 'Targets — monthly booking target rows' },
  { key: 'mkt_targets_cards',      desc: 'Targets — milestone and roadmap cards' },
  { key: 'mkt_analytics_sections', desc: 'Analytics — metric input sections and all fields' },
  { key: 'mkt_weekly_history',     desc: 'Analytics — weekly history snapshots (bookings, impressions, CTR, spend, reviews)' },
  { key: 'mkt_priority_actions',   desc: 'Analytics — this week\'s three priority actions' },
  { key: 'mkt_investment_channels',desc: 'Analytics — investment decisions (monthly spend and bookings per channel)' },
  { key: 'mkt_forecast_bars',      desc: 'Booking forecast — 12-week bar chart rows' },
  { key: 'mkt_forecast_milestones',desc: 'Booking forecast — revenue milestone tiles' },
  { key: 'mkt_forecast_cards',     desc: 'Booking forecast — strategic insight cards' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SOPContent() {
  return (
    <div>

      {/* ── What this dashboard is ── */}
      <SLabel first>What this dashboard is</SLabel>
      <Card>
        <P>
          The Marketing Workflow is a private, self-contained dashboard built inside the London Cleaning Wizard admin panel.
          It gives Farhana and Steven a single place to track every marketing channel, budget decision, weekly result, and growth target — without needing spreadsheets, separate apps, or paid analytics tools.
        </P>
        <P>
          It runs entirely in your browser. Nothing is sent to a server. All data is saved locally in your browser's storage (localStorage), which means:
        </P>
        <Li>It works offline — no internet required once the page loads</Li>
        <Li>It costs nothing to run or store</Li>
        <Li>It remembers everything you enter across sessions on the same device</Li>
        <Li>It is private — the data only exists on the device you use it on</Li>
        <div style={{ marginTop: 14 }}>
          <MktAlert type="warn" style={{ fontSize: 12 }}>
            Because data is stored in browser localStorage, clearing your browser cache or switching to a different device will lose your saved history.
            Do not clear browser storage without first noting down your key numbers. The most important data to preserve is the weekly history in the Analytics tab.
          </MktAlert>
        </div>
      </Card>

      {/* ── Progress bar ── */}
      <SLabel>The progress bar — shown at the top of every tab</SLabel>
      <Card>
        <P>
          At the very top of the dashboard, above the tab navigation, there is a thin progress bar labelled "Progress toward booking a day."
          This shows how far you are toward 30 bookings per month — the point at which the business generates enough cleaning revenue to sustain itself without relying on new marketing spend.
        </P>
        <SubHead>How it calculates</SubHead>
        <Li>It reads the last four saved weeks of booking data from the Analytics tab history</Li>
        <Li>It adds up the total bookings across those four weeks and divides by 30</Li>
        <Li>The result is shown as a percentage and a label</Li>
        <Li>It refreshes automatically every time you switch to a different tab — so after saving a week in Analytics, switch away and back to see it update</Li>
        <SubHead>Colour meaning</SubHead>
        <Li>Green: you have hit or exceeded 30 bookings across the last four weeks</Li>
        <Li>Amber: you are 60% or more of the way there</Li>
        <Li>Blue-green: you are below 60% — keep going</Li>
        <Li>If no weekly data has been saved yet: shows "Save your first week in the Analytics tab"</Li>
        <ConnectsTo tabs={['Analytics']} />
      </Card>

      {/* ── Weekly routine ── */}
      <SLabel>How to run your week — the full routine</SLabel>
      <Card>
        <P style={{ marginBottom: 18 }}>
          This is the operating rhythm that makes the dashboard useful. The dashboard only gives valuable output if you give it consistent input.
          Follow these steps every week — it takes about 30 minutes of admin time across the week, mostly in short bursts.
        </P>
        <Step n="1" title="Monday — 15 minutes together (Workflow tab)">
          Open the Workflow tab. In the Daily Rhythm section find the Monday standing check-in.
          Answer the four questions together: (1) How many bookings came in last week and where from?
          (2) Which channel sent the most traffic to the booking page?
          (3) Which channel cost the most time or money with the least return?
          (4) What one thing do we do differently this week?
          Write the answer to question four in the priority actions box in Analytics before you close the tab.
        </Step>
        <Step n="2" title="Monday through Sunday — run the channels">
          Work through the Workflow tab cards. Each card tells you what the channel is, what to do on it, and how often.
          Post on Instagram, engage on Facebook groups, stay active on Nextdoor, respond to Bark leads within one hour.
          Google Ads and LSA run in the background — check them twice a week, not daily.
        </Step>
        <Step n="3" title="Daily — tick off the Weekly tracker">
          Open the Weekly tracker tab each morning. Each item has an owner tag.
          Farhana handles her items, Steven handles his, Both items need coordination.
          Tick off tasks as you complete them throughout the week.
          At the start of each new week, manually uncheck all items to reset the list.
        </Step>
        <Step n="4" title="End of week (Friday or Sunday) — enter your numbers (Analytics tab)">
          Open Analytics. Check the date picker says the correct Monday for this week — it defaults to the current Monday automatically.
          Enter numbers for every channel: impressions, clicks, CTR, spend, bookings from each campaign, Instagram reach, Facebook enquiries, Nextdoor posts, Google Business views, total reviews.
          Fill in as many fields as you have data for. You do not need every field to be filled.
          Click "Check all performance" — this saves the week and colours all dots.
        </Step>
        <Step n="5" title="End of week — write your 3 priority actions (Analytics tab)">
          Immediately after checking performance, scroll to "This week's priority actions."
          Write one to three specific changes you are committing to for the coming week.
          Be precise: not "do more Instagram" but "post one reel before/after by Wednesday."
          These persist — check them at your Monday meeting to see if they moved the numbers.
        </Step>
        <Step n="6" title="End of week — check forecast (Booking forecast tab)">
          Open the Booking forecast tab. Enter your current week number and your total bookings to date since launch.
          Click "Update forecast" to get a status: ahead, on track, slightly behind, or behind — with specific guidance on what to focus on.
        </Step>
        <Step n="7" title="Monthly — update investment decisions (Analytics tab)">
          At the end of each month, scroll to "Investment decisions — cost per booking" in the Analytics tab.
          Enter the total spend and total bookings attributed to each channel for that month.
          Cost per booking calculates automatically.
          After four weeks of weekly history data exists, the Investment recommendations section below will tell you which channels to scale, hold, or pause — with exact budget figures and booking projections.
        </Step>
      </Card>

      {/* ── Workflow tab ── */}
      <SLabel>Tab reference — Workflow</SLabel>
      <Card>
        <P>
          The Workflow tab is the strategy home base. It shows how every marketing channel works, what to do on it, and who owns it.
          It is the reference document you use to run the channels day to day.
        </P>
        <SubHead>The four channel sections</SubHead>
        <P>
          Channels are divided into four groups: Paid (Farhana), Paid (Steven), Free (Steven), Free (Farhana).
          Paid channels cost money. Free channels cost time. Each section contains cards — click a card to expand it and read the full detail for that channel.
        </P>
        <Li>Each card explains what the channel is, what to do on it, how often, and what success looks like</Li>
        <Li>Cards can be dragged and reordered within their section — drag the most important channels to the top</Li>
        <Li>Cards can also be dragged between sections — for example if Steven takes over a channel from Farhana, drag the card across</Li>
        <SubHead>Daily Rhythm section</SubHead>
        <P>
          Below the channel cards is the Daily Rhythm — a schedule showing what marketing activities happen each day of the week.
          Each row shows the time commitment, the activity description, and who owns it.
        </P>
        <Li>The Monday 15-minute check-in is a standing row here — it is the most important weekly ritual in the whole system</Li>
        <Li>In edit mode: update times, activity descriptions, and owner labels as your schedule changes</Li>
        <SubHead>What this tab stores</SubHead>
        <P>
          The Workflow tab stores all card content and rhythm rows in localStorage. Changes here — adding cards, renaming them, moving them — do not affect numbers in any other tab.
          This tab is pure reference and strategy content.
        </P>
        <ConnectsTo tabs={['Weekly tracker']} />
      </Card>

      {/* ── Budget tab ── */}
      <SLabel>Tab reference — Budget</SLabel>
      <Card>
        <P>
          The Budget tab shows exactly where the £500 per month shared marketing budget is allocated, what each allocation pays for, and what changes to make if performance goes up or down.
        </P>
        <SubHead>Budget allocation table</SubHead>
        <P>
          Each row is a paid channel with its monthly spend figure, what the money covers, and a note on expected return.
          This is where you record budget changes after the Investment recommendations in Analytics tell you to scale or pause a channel.
        </P>
        <Li>In edit mode: update spend figures when you reallocate budget. The table does not auto-calculate totals — update the numbers manually after any reallocation</Li>
        <Li>This table does not pull from Analytics automatically. It is a separate record you maintain</Li>
        <SubHead>Free channel effort tracker</SubHead>
        <P>
          Below the paid budget is a tracker for free channels showing the weekly time investment rather than money.
          Use this to make sure free channels are not being quietly dropped when the week gets busy.
        </P>
        <SubHead>What to cut and what to scale</SubHead>
        <P>
          Two reference sections at the bottom of the Budget tab. When Investment recommendations say "Pause" a channel, come here to see which channel gets the freed-up budget.
          When recommendations say "Scale," come here to update the allocation table with the new figure.
        </P>
        <ConnectsTo tabs={['Analytics — Investment decisions']} />
      </Card>

      {/* ── Targets tab ── */}
      <SLabel>Tab reference — Targets</SLabel>
      <Card>
        <P>
          The Targets tab shows the monthly booking goals and the six-month growth roadmap.
          It is a planning and reference document — it does not update automatically from Analytics data.
        </P>
        <SubHead>Monthly booking targets</SubHead>
        <P>
          Shows what you are aiming for in terms of total bookings, recurring clients, and revenue at each stage of growth.
          These are the high-level goalposts that put the weekly numbers in context.
        </P>
        <Li>In edit mode: adjust targets if the business is growing faster or slower than originally projected</Li>
        <SubHead>Six-month roadmap</SubHead>
        <P>
          A milestone-by-milestone view showing how the business moves from a standing start to booking a day.
          Each milestone has what it requires, what it means for revenue, and what it unlocks.
        </P>
        <SubHead>Important: Targets here do not change the Analytics scorecard</SubHead>
        <P>
          The hit/miss formula in the Analytics scorecard uses a fixed calculation built into the code (weeks 1–4 target is 1 booking, weeks 5–8 is 2, and so on).
          Changing monthly target figures in this tab does not change what counts as "Hit" or "Miss" in the weekly history table.
        </P>
        <ConnectsTo tabs={['Analytics — scorecard', 'Booking forecast']} />
      </Card>

      {/* ── Weekly tracker ── */}
      <SLabel>Tab reference — Weekly tracker</SLabel>
      <Card>
        <P>
          The Weekly tracker is the operational checklist — every recurring marketing task that needs to happen each week, with a clear owner on each item.
          It is the day-to-day companion to the Workflow tab's strategy cards.
        </P>
        <SubHead>How to use it</SubHead>
        <Li>Each item shows an owner badge: Farhana (blue), Steven (green), or Both (amber)</Li>
        <Li>Tick off each task as you complete it during the week</Li>
        <Li>At the start of each new week, manually uncheck all items to reset the list</Li>
        <Li>Drag items to reorder — put the highest-priority tasks at the top so they get done first if time is short</Li>
        <SubHead>Edit mode</SubHead>
        <Li>Rename task descriptions to match how you actually work</Li>
        <Li>Change owner from Farhana to Steven or Both</Li>
        <Li>Add new recurring tasks that come up as the business grows</Li>
        <Li>Delete tasks that are no longer relevant</Li>
        <SubHead>What this tab stores</SubHead>
        <P>
          All checklist items — including their check state — are stored in localStorage.
          If you check a box on Monday, it will still be checked when you come back on Friday.
          The checklist does not reset automatically at the start of a new week — you reset it manually.
        </P>
      </Card>

      {/* ── Analytics tab ── */}
      <SLabel>Tab reference — Analytics</SLabel>
      <Card>
        <P>
          Analytics is the most important tab in the dashboard. It is where you input all your weekly numbers, where the dashboard saves your history, and where most of the automated output — scorecard, trend chart, investment recommendations, progress bar — comes from.
          Everything else either feeds into this tab or reads from it.
        </P>

        <SubHead>The week date picker</SubHead>
        <P>
          At the top of the metric input card is a date field labelled "Week commencing."
          It defaults automatically to the Monday of the current week.
          Always check this date before clicking "Check all performance" — the date is the unique key that identifies which week the data belongs to.
          If you save data with the wrong date, a row appears in the history table for the wrong week.
          You can correct it by setting the date to the correct Monday and clicking "Check all performance" again — the new data will merge into the existing row for that date.
        </P>

        <SubHead>Metric input sections</SubHead>
        <P>
          There are seven input sections: Farhana's Google Ads, Steven's Google Ads, Instagram, Facebook, Nextdoor, Google Business Profile, and Overall results.
          Each metric has a target range shown in grey text and a coloured dot that shows status once you enter a value.
        </P>
        <Li>Green dot: the number meets or exceeds the target range</Li>
        <Li>Amber dot: the number is within 70% of the target — close but not quite there</Li>
        <Li>Red dot: the number is significantly below target</Li>
        <Li>Grey dot: no number entered yet</Li>
        <Li>Dots appear as you type — you do not need to click "Check all performance" to see them</Li>
        <Li>In edit mode: rename sections, add or remove individual metrics, update target ranges, drag sections to reorder</Li>

        <SubHead>Check all performance button</SubHead>
        <P>
          This is the most important single action in the entire dashboard. Clicking it does three things at once:
        </P>
        <Li>Forces all dots to show, so you can see which metrics are on and off target</Li>
        <Li>Saves a snapshot of the week to the history table — the date, total bookings, impressions, CTR, spend, and reviews</Li>
        <Li>If a row for that date already exists in the history, it merges rather than overwrites — only fields with a non-empty value get updated, so previous data is never destroyed</Li>
        <P style={{ marginTop: 8 }}>
          After clicking, the button shows a summary: how many metrics are on target and how many need attention.
        </P>

        <SubHead>This week's priority actions</SubHead>
        <P>
          Three text fields below the metric inputs. Write one to three specific, concrete actions you are committing to for the coming week based on what the numbers just told you.
          These persist — they will still be here when you return. Update them each week after reviewing performance.
          At your Monday check-in, look at these and discuss whether they moved the numbers.
        </P>

        <SubHead>Running scorecard</SubHead>
        <P>
          Three summary tiles that appear automatically once at least one week of data has been saved: Weeks on target, Weeks missed, and Current streak.
          These calculate live from the history — you do not need to enter anything extra.
        </P>
        <Li>A week counts as "on target" if bookings met or exceeded the weekly target for that week number. The target formula: weeks 1–4 require 1 booking, weeks 5–8 require 2, weeks 9–12 require 3, weeks 13–16 require 4, weeks 17–20 require 5, week 21 onwards require 6</Li>
        <Li>Streak counts consecutive on-target weeks, stopping at the first miss</Li>
        <Li>The scorecard only counts weeks where bookings data was actually entered — empty weeks are skipped</Li>

        <SubHead>Weekly history table</SubHead>
        <P>
          A table of every week you have ever recorded, shown newest first.
          Columns: Week number, Date, Bookings, Target, Status (Hit or Miss), Impressions, CTR%, Spend, Reviews.
        </P>
        <Li>Grows automatically each time you click "Check all performance" with a new week date</Li>
        <Li>Old rows are never deleted — they are permanent</Li>
        <Li>Scroll horizontally if the table is cut off on a narrow screen</Li>

        <SubHead>Booking trend chart</SubHead>
        <P>
          A line chart below the history table showing bookings per week over time, built automatically from saved history data.
          When the line trends upward: marketing is working, keep going.
          When it flattens: something needs changing — use the Investment recommendations to decide what.
          When it drops: urgent — share Analytics data with Claude for a channel review.
        </P>

        <SubHead>Investment decisions — cost per booking</SubHead>
        <P>
          A monthly (not weekly) tracking section for spend and bookings per channel.
          For each of the seven channels — Farhana's Google Ads, Steven's Google Ads, LSA, Instagram boost, Facebook boost, Bark, Flyer — enter the total amount spent this month and the total bookings you can attribute to that channel.
        </P>
        <Li>Cost per booking calculates automatically: total spend divided by total bookings</Li>
        <Li>Under £30 per booking: green — this channel is efficient, consider scaling</Li>
        <Li>£30 to £60 per booking: amber — acceptable but worth monitoring</Li>
        <Li>Over £60 per booking, or zero bookings: red — this channel is not converting</Li>
        <Li>In edit mode: rename channels or add new ones. Deleting a channel only removes it from this table, not from the history</Li>

        <SubHead>Investment recommendations</SubHead>
        <P>
          Appears below the cost per booking table. Locked until you have saved 4 weeks of weekly history data — before that it shows a countdown.
          Once unlocked, each channel with data shows one recommendation:
        </P>
        <Li>Scale (green): cost per booking is under £30 and overall bookings are growing week on week (last 2 weeks of history are higher than the 2 weeks before that). Shows the exact new budget, expected additional bookings, and new monthly target based on your current conversion rate</Li>
        <Li>Hold and watch (green): cost per booking is excellent but bookings are not yet growing consistently week on week. Wait and watch before increasing spend</Li>
        <Li>Hold (amber): cost per booking is between £30 and £60. Keep current budget and review in 2 weeks</Li>
        <Li>Pause (red): cost per booking is over £60, or zero bookings recorded. Reallocate this budget to the channel with the lowest cost per booking</Li>
        <Li>Channels where both spend and bookings are blank are skipped — no recommendation shown</Li>
        <ConnectsTo tabs={['Progress bar', 'Booking forecast', 'Budget']} />
      </Card>

      {/* ── Forecast tab ── */}
      <SLabel>Tab reference — Booking forecast</SLabel>
      <Card>
        <P>
          The Booking forecast tab helps you check whether your current pace will reach a booking a day within 24 weeks.
          It has two tools: a live forecast checker you use each week, and a reference section that gives strategic context.
        </P>

        <SubHead>Forecast checker</SubHead>
        <P>
          Enter your current week number (1–24), total bookings to date since launch, and optionally your recurring client count and Google review count.
          Click "Update forecast" to get a verdict: ahead, on track, slightly behind, or behind.
        </P>
        <Li>Ahead by 3 or more bookings: you are outpacing the plan. Focus on converting one-off clients to recurring — a recurring client at £245 per clean is worth £12,740 per year</Li>
        <Li>On track: bookings match the week's target. Stay consistent and keep all channels running</Li>
        <Li>Slightly behind by 1 or 2: double down on personal network and Facebook groups — these are the fastest-converting free channels</Li>
        <Li>Behind by 3 or more: pause lower-performing paid channels and share Analytics data with Claude for a channel-by-channel review</Li>

        <SubHead>12-week booking forecast bars</SubHead>
        <P>
          A visual bar chart showing the expected weekly booking ramp from weeks 1 to 12, based on £500/month budget with all channels active at the same time.
          The numbers inside each bar show expected bookings in that period. These are conservative estimates.
        </P>
        <Li>In edit mode: adjust bar labels, percentage widths, and text descriptions if your actual ramp is tracking differently</Li>

        <SubHead>Revenue milestones</SubHead>
        <P>
          Four reference tiles showing the revenue levels that mark key growth stages: break-even on ad spend, first profitable month, scaling point, and booking a day.
          These are reference benchmarks — they do not calculate automatically from your data.
        </P>

        <SubHead>Strategic insight cards</SubHead>
        <P>
          Two explanatory cards below the milestones.
          The recurring client multiplier card explains why five regular weekly clients outperform 200 one-off bookings.
          The review flywheel card explains how Google reviews compound and why sending the review link within 2 hours of every clean gets a 3x higher response rate.
        </P>
        <ConnectsTo tabs={['Analytics — weekly history', 'Targets']} />
      </Card>

      {/* ── Data flow ── */}
      <SLabel>How data flows between tabs</SLabel>
      <Card>
        <P>
          Most tabs are independent — they store their own content and do not read from each other.
          The Analytics tab is the exception. It is the data hub that powers the progress bar, scorecard, trend chart, and investment recommendations across the entire dashboard.
        </P>

        <SubHead>Analytics → Progress bar (every tab)</SubHead>
        <P>
          Every time you click "Check all performance" in Analytics, bookings data is written to localStorage under the key mkt_weekly_history.
          The progress bar at the top of every tab reads the last four entries from that same key and calculates percentage toward 30 bookings per month.
          It refreshes each time you switch tabs — so after saving in Analytics, switch to any other tab to see the bar update.
        </P>

        <SubHead>Analytics → Scorecard, history table, trend chart</SubHead>
        <P>
          All three read from the same mkt_weekly_history data. They update the moment a new week is saved. No extra action required — saving a week in Analytics automatically feeds all three.
        </P>

        <SubHead>Analytics → Investment recommendations</SubHead>
        <P>
          The recommendation engine reads two things: (1) the cost per booking figures you entered in the Investment decisions table (stored under mkt_investment_channels), and (2) whether bookings are growing week on week, which it detects by comparing the last 2 weeks of history with the 2 weeks before that.
          Both pieces of data update independently — channel spend is monthly, history is weekly.
        </P>

        <SubHead>Budget and Analytics — informed by each other, not linked</SubHead>
        <P>
          When Investment recommendations say "Scale — increase budget by £50/month," you act on that by going to the Budget tab and manually updating the allocation table.
          The Budget tab does not pull from Analytics automatically. These two sections inform each other through your decisions, not through automated data transfer.
        </P>

        <SubHead>Workflow and Tracker — fully isolated</SubHead>
        <P>
          The Workflow tab and Weekly tracker tab store their own content independently.
          Editing cards, checklists, or rhythm rows here does not change any numbers in Analytics, Targets, or Forecast.
          They are reference and operational tools only.
        </P>
      </Card>

      {/* ── Edit mode ── */}
      <SLabel>Edit mode — how it works</SLabel>
      <Card>
        <P>
          Every tab shares a single Edit button in the top-right corner of the dashboard header.
          Clicking it switches the entire dashboard into edit mode. The button changes to "Done editing."
          Clicking "Done editing" returns everything to normal view.
        </P>

        <SubHead>What edit mode lets you do across all tabs</SubHead>
        <Li>Rename any card title, row label, section header, or metric name by clicking directly on the text</Li>
        <Li>Add new items — channels, cards, rows, metrics — using the dashed "+ Add..." buttons that appear at the bottom of each section</Li>
        <Li>Delete items using the × button that appears on each item in edit mode</Li>
        <Li>Drag and reorder items within any section</Li>
        <Li>In the Workflow tab specifically: drag cards between sections (Paid Farhana to Paid Steven, and so on)</Li>

        <SubHead>What edit mode does not change</SubHead>
        <Li>The hit/miss formula in the Analytics scorecard — that is calculated from a fixed weekly target schedule built into the code</Li>
        <Li>The weekly targets used by the Booking forecast checker — those are also in the code</Li>
        <Li>Saved history data — deleting a metric from the Analytics input list does not delete the history rows that previously included that metric's data</Li>

        <SubHead>Saving in edit mode</SubHead>
        <P>
          All edits save automatically to localStorage as you type or make changes. There is no save button.
          Clicking "Done editing" exits edit mode — it does not trigger a save, because the data was already saved as you worked.
          If you refresh the page while in edit mode, all changes are preserved.
        </P>
      </Card>

      {/* ── localStorage reference ── */}
      <SLabel>Storage keys — technical reference</SLabel>
      <Card>
        <P style={{ marginBottom: 14 }}>
          Each section of the dashboard saves its data under a separate key in localStorage.
          This is useful if you ever need to debug a specific section, export data, or reset one part without affecting the rest.
          To view or edit these in your browser, open DevTools (F12), go to Application → Local Storage.
        </P>
        {KEYS.map(({ key, desc }) => (
          <div key={key} style={{ display: 'flex', gap: 16, padding: '7px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
            <code style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: MKT.gold, flexShrink: 0, paddingTop: 1, minWidth: 230 }}>{key}</code>
            <span style={{ fontFamily: FONT, fontSize: 12, color: MKT.muted, lineHeight: 1.6 }}>{desc}</span>
          </div>
        ))}
      </Card>

    </div>
  );
}
