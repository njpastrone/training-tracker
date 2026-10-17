// The privacy policy and terms of use, served as plain pages at GET /privacy and GET /terms so the app,
// App Store Connect and TestFlight can link one URL that ships with the Worker. DRAFT: a lawyer reads
// both before the paid launch. The contact address comes from the CONTACT_EMAIL var (README), never this file.
// Keep what they say about data in step with what the app and this Worker actually send and keep.

const UPDATED = 'October 17, 2026';

const page = (title: string, body: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiftText ${title}</title>
<style>
  :root { color-scheme: light dark; --bg: #fffaf3; --text: #1f1a14; --muted: #6b6155; --note: #fff0d6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #16130f; --text: #f3ece2; --muted: #b3a797; --note: #3a2c16; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 20px; margin: 32px 0 8px; }
  p, li { margin: 0 0 10px; }
  .muted { color: var(--muted); }
  .draft { background: var(--note); border-radius: 12px; padding: 12px 14px; margin: 16px 0 24px; }
</style>
</head>
<body><main>
<h1>LiftText ${title}</h1>
<p class="muted">Last updated ${UPDATED}</p>
<p class="draft"><strong>DRAFT.</strong> This text has not yet been reviewed by a lawyer and may change before LiftText's App Store launch.</p>
${body}
</main></body>
</html>`;

const privacy = (contact: string) => page('Privacy Policy', `
<p>LiftText is a workout and food log for iPhone, made by an independent developer in the United States ("we", "us"). This policy says what LiftText collects, where it goes, how long it's kept and how to delete it. Questions or requests: ${contact}.</p>

<h2>The short version</h2>
<ul>
<li>There's no account. Your workouts, food, plans and settings are saved only on your phone.</li>
<li>If you're 18 or older and turn on AI reading, what you type is sent through our server to Anthropic's Claude AI to be read. Our server doesn't store it. Anthropic deletes it within 30 days and doesn't use it to train its AI.</li>
<li>If you're under 18, or you choose "Not now", AI is off and nothing you type leaves your phone.</li>
<li>We don't sell your data, show ads, track you across apps or use analytics tools.</li>
</ul>

<h2>What stays on your phone</h2>
<p>Everything you log or set up: workouts, food, plans, templates, your schedule, goals, settings, and the things you asked the coach to remember. Backups you export, and the weekly backup, are files in the Files app (On My iPhone › LiftText › Backups) that only you can share. If iCloud Backup is on for your iPhone, Apple includes LiftText's data in your iPhone's backup, under Apple's privacy policy.</p>
<p>LiftText doesn't read or write Apple Health data, and it doesn't use your photos, contacts or location.</p>

<h2>What leaves your phone, and why</h2>
<p><strong>Only with AI reading on.</strong> When you log, fix a card, plan a week or ask the coach, LiftText sends to our server, which passes it to Anthropic:</p>
<ul>
<li>what you type, including anything you mention about pain, injuries, sleep, mood or body weight, and the workout or food card you're fixing</li>
<li>exercise names (yours and matching ones from the built-in list) and food names from the built-in food list that match what you typed</li>
<li>your weight unit and the date</li>
<li>when you plan a week: a summary of your recent training and your goals</li>
<li>when you ask the coach: a summary of your last 4 weeks of training and food, your goals, the things you asked it to remember, your question, and what the question needs (for example one exercise's history or a day's meals)</li>
</ul>
<p>Your full history, your name and your photos are never sent. We use this only to turn what you type into a workout or food log, plan your week and answer your questions.</p>
<p><strong>With every AI request</strong>, the app also sends a random ID it made for this install and, on a real iPhone, a signature from a key Apple's App Attest service checked, which proves the request comes from a genuine copy of LiftText. Neither is linked to who you are. We use them to limit how many AI requests each phone makes a day and to stop abuse of our server.</p>
<p><strong>Always:</strong> the app checks for updates with Expo (our update service), which sees your phone's OS, the app version and a random update ID. Apple collects crash and usage data from TestFlight and the App Store as your iPhone's settings allow, under Apple's privacy policy.</p>

<h2>Who receives it</h2>
<ul>
<li><strong>Anthropic</strong> runs the Claude AI. Under its commercial terms it acts as our processor, may not train its models on this data, and deletes it within 30 days. If its safety systems flag a request as breaking its usage policy, it may keep that request for up to 2 years.</li>
<li><strong>Cloudflare</strong> runs our server. It sees your IP address and request details for each AI request.</li>
<li><strong>Expo</strong> delivers app updates.</li>
<li><strong>Apple</strong> distributes the app and runs App Attest.</li>
</ul>
<p>Each of them is bound to protect the data at least as well as this policy does. We share nothing with anyone else.</p>

<h2>How long it's kept</h2>
<ul>
<li>Our server never stores what you type. It keeps a count of each phone's AI requests per day under the random ID, deleted after 2 days, and a per-question counter for the coach, deleted after 15 minutes.</li>
<li>For App Attest it keeps the public half of your phone's App Attest key and a counter. It identifies the key, not you.</li>
<li>Server logs record the time, the random ID or key ID, which AI model answered and how much text it read and wrote (counts, not the text), plus the request details Cloudflare logs. They're deleted after 7 days.</li>
<li>Anthropic: up to 30 days, or up to 2 years if flagged, as above.</li>
</ul>

<h2>Your choices</h2>
<ul>
<li><strong>Turn AI off</strong> anytime: Settings › AI reading › Not now. LiftText keeps working on your phone: each line or comma you type becomes an exercise you fill in by hand, and common foods are looked up on the phone.</li>
<li><strong>Delete your data</strong>: Settings › Clear all data deletes your workouts, food and settings. It leaves templates, your schedule, saved plans and backup files, so delete those in the app or in the Files app. Deleting LiftText removes everything it saved on the phone.</li>
<li>We can't find your requests by your name because we never have it. Email us with your request and we'll answer within 45 days.</li>
</ul>

<h2>Age limits</h2>
<p>LiftText isn't meant for children under 13. AI reading is for people 18 and older: the app asks before the first AI request, and if you say you're under 18, AI stays off and nothing you type leaves your phone. If you believe a child sent us data, email us; our server holds nothing we could connect to them, and we'll help however we can.</p>

<h2>Consumer health data (Washington, Nevada, Connecticut and other states)</h2>
<p>This section is our consumer health data privacy policy under Washington's My Health My Data Act and similar laws.</p>
<ul>
<li><strong>What we collect:</strong> only with AI reading on, the health-related things you choose to type, such as exercise, food, pain or injuries, sleep, mood and body weight, and the training and food summary described above. It comes from you.</li>
<li><strong>Why:</strong> to read your logs, plan your training and answer your questions. Nothing else.</li>
<li><strong>Who receives it:</strong> Anthropic and Cloudflare, as our processors, only to do that. We don't sell it or share it with anyone else.</li>
<li><strong>Consent:</strong> nothing is collected until you agree on the AI reading screen. You can withdraw consent anytime in Settings › AI reading.</li>
<li><strong>Your rights:</strong> you can ask what we hold about you, ask us to delete it, and withdraw consent. Email ${contact}. We answer within 45 days. If we turn down your request, reply to our answer to appeal; we'll decide within 45 days, and if we still turn it down you can contact your state's attorney general (in Washington: atg.wa.gov/file-complaint).</li>
</ul>

<h2>Security</h2>
<p>Everything sent to our server is encrypted in transit (HTTPS). The AI service key stays on our server and never ships in the app.</p>

<h2>Where LiftText is offered</h2>
<p>LiftText is offered in the United States only.</p>

<h2>Changes</h2>
<p>If we change what LiftText collects or who receives it, we'll update this page and the date above, and the app will ask again before sending anything new.</p>
`);

const terms = (contact: string) => page('Terms of Use', `
<p>These terms cover your use of LiftText, a workout and food log for iPhone made by an independent developer in the United States ("we", "us"). They add to Apple's standard Licensed Application End User License Agreement, which also applies. By using LiftText you agree to them. Questions: ${contact}.</p>

<h2>Who can use LiftText</h2>
<ul>
<li>You must be 13 or older and in the United States.</li>
<li>AI features (reading your logs, planning and the coach) are for people 18 and older. If you're under 18, use LiftText with AI off.</li>
</ul>

<h2>Not medical advice</h2>
<p>LiftText is a log, not a doctor, coach or dietitian. Plans, suggested weights, food numbers and answers are suggestions, not medical, nutrition or training advice. Start lighter than you think, stop if something hurts, and check with a doctor before you start a new program or if you have an injury or a health condition. You exercise at your own risk.</p>

<h2>AI can be wrong</h2>
<p>AI reads what you type and can get it wrong: exercises, sets, weights, foods and amounts. Review every card before you save it. Food numbers are estimates.</p>

<h2>Using LiftText fairly</h2>
<ul>
<li>Use LiftText's AI only through the app, for your own training and food.</li>
<li>Don't try to get around daily limits, reach our server outside the app, copy or reverse engineer the app, or use it to break the law.</li>
<li>We may limit or stop AI access for anyone who misuses it.</li>
</ul>

<h2>The beta</h2>
<p>During the TestFlight beta LiftText is free. Features may change, break or go away, and the AI has a daily limit per phone. Before any paid features start, these terms will be updated to cover price, renewal, trials and cancellation, and the app will show them before you buy.</p>

<h2>Your data</h2>
<p>What you log is yours. Our <a href="privacy">Privacy Policy</a> says what's collected and how to delete it.</p>

<h2>No warranty</h2>
<p>LiftText is provided "as is" and "as available". As far as the law allows, we make no promises that it will be accurate, uninterrupted or free of errors, and we aren't responsible for data lost on your phone: keep backups.</p>

<h2>Limit of liability</h2>
<p>As far as the law allows, we aren't liable for indirect, incidental or consequential damages, or for injury from exercise or diet choices you make, and our total liability is limited to the amount you paid for LiftText in the last 12 months (or $50 if that's more). Some states don't allow these limits, so they may not all apply to you.</p>

<h2>Changes and ending</h2>
<p>We may update these terms; the date above shows the latest. If you keep using LiftText after a change, the new terms apply. You can stop anytime by deleting the app.</p>

<h2>Governing law</h2>
<p>[To be completed with counsel: the state whose law governs these terms and where disputes are heard.]</p>
`);

// The page for a GET path, or null when the path isn't one
export function legalPage(path: string, contactEmail?: string): Response | null {
  const render = path === '/privacy' ? privacy : path === '/terms' ? terms : null;
  if (!render) return null;
  const contact = contactEmail ? `<a href="mailto:${contactEmail}">${contactEmail}</a>` : 'the support email on LiftText\'s App Store page';
  return new Response(render(contact), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
