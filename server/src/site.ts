// The lifttextapp.com home page at GET / and its beta waitlist at POST /waitlist. Plain HTML with no
// script, so the form works anywhere. Colours and type follow DESIGN-SYSTEM.md (the day and night skies,
// the card material, sunrise for the one action). Keep the claims true of the app as it ships.

const SUPPORT = 'support@lifttextapp.com';
const MAX_BODY = 2048;
const MAX_EMAIL = 254;
// Each signup costs up to three KV writes (the email, the day's count, the address's count) out of the
// 1000 a day the free plan shares with the AI caps (wrangler.jsonc), so the day's signups are capped too.
const DAILY_SIGNUPS = 25;
const SIGNUPS_PER_ADDRESS = 5;

type Form = { kind: 'form'; error?: string } | { kind: 'done' } | { kind: 'busy' };

const html = (status: number, body: string, cache = 'no-store') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

function formBlock(state: Form): string {
  if (state.kind === 'done') {
    return `<div class="card" role="status">
<h2>You're on the list</h2>
<p>We'll email you when there's a spot in the TestFlight beta, and again when LiftText is on the App Store. Nothing else. To be taken off the list, email <a href="mailto:privacy@lifttextapp.com">privacy@lifttextapp.com</a>.</p>
</div>`;
  }
  const note = state.kind === 'busy' ? "Sign-ups are full for today. Please try again tomorrow." : state.error;
  return `<form class="card" method="post" action="/waitlist">
<label for="email">Get an invite to the beta</label>
<div class="row">
<input id="email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="${MAX_EMAIL}" required placeholder="you@example.com"${note ? ' aria-invalid="true" aria-describedby="note"' : ''}>
<button type="submit">Join the waitlist</button>
</div>
<div class="trap" aria-hidden="true"><label for="website">Leave this empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
${note ? `<p id="note" class="note" role="alert">${note}</p>` : '<p class="hint">Just your email. We only use it to send your invite.</p>'}
</form>`;
}

const page = (state: Form) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiftText: log workouts and meals by typing</title>
<meta name="description" content="LiftText is a workout and food log for iPhone. Type what you did and what you ate in plain English and it becomes sets, reps, weights and macros. Now in beta.">
<style>
  :root { color-scheme: light dark; --text: #0E1430; --text2: #3E4766; --text3: #5F6889; --card: rgba(255,255,255,0.62); --line: rgba(255,255,255,0.8); --dim: rgba(14,20,48,0.06); --sunrise: #D2441C; --on-sunrise: #FFFFFF; --cobalt: #3560F0; --error: #D70015; --base: #F6F5FF;
    --sky: linear-gradient(#8AA8FF, #BCC9FF 18%, #E0E3FF 32%, #F6F5FF 45%); }
  @media (prefers-color-scheme: dark) { :root { --text: #F3F5FF; --text2: #B0B7D6; --text3: #8189AE; --card: rgba(255,255,255,0.075); --line: rgba(255,255,255,0.13); --dim: rgba(255,255,255,0.06); --sunrise: #FF7F57; --on-sunrise: #2A1208; --cobalt: #8EA6FF; --error: #FF6961; --base: #1E1A44;
    --sky: linear-gradient(#0D0B2A, #1A1640 18%, #2A1F52 32%, #1E1A44 45%); } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: var(--sky) no-repeat, var(--base); color: var(--text); font: 17px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main, footer { max-width: 640px; margin: 0 auto; padding: 0 16px; }
  main { padding-top: 48px; }
  h1, h2, h3, label, button, .badge, .tagline { font-family: ui-rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size: 40px; line-height: 1.12; font-weight: 800; margin: 12px 0; }
  h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
  h3 { font-size: 17px; font-weight: 700; margin: 0 0 2px; }
  p { margin: 0 0 12px; }
  .tagline { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
  .lede { font-size: 19px; color: var(--text2); }
  .badge { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text2); background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 26px; padding: 20px; margin: 24px 0; -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
  label { display: block; font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; }
  input { flex: 1 1 220px; min-height: 50px; font: inherit; color: var(--text); background: var(--base); border: 1px solid var(--dim); border-radius: 25px; padding: 0 18px; }
  button { flex: 0 0 auto; min-height: 50px; font-size: 17px; font-weight: 700; color: var(--on-sunrise); background: var(--sunrise); border: 0; border-radius: 25px; padding: 0 22px; cursor: pointer; }
  input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid var(--cobalt); outline-offset: 2px; }
  .hint, .note { font-size: 15px; margin: 10px 0 0; color: var(--text3); }
  .note { color: var(--error); }
  .trap { position: absolute; left: -9999px; }
  .demo p { margin: 0; }
  .typed { font-size: 17px; }
  .sets { list-style: none; margin: 14px 0 0; padding: 14px 0 0; border-top: 1px solid var(--dim); }
  .sets li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; }
  .sets span { color: var(--text2); font-variant-numeric: tabular-nums; }
  .features { list-style: none; padding: 0; margin: 32px 0; display: grid; gap: 18px; }
  .features p { color: var(--text2); margin: 0; }
  a { color: var(--text2); }
  footer { padding-top: 16px; padding-bottom: 40px; font-size: 15px; color: var(--text3); }
  footer p { margin: 0 0 6px; }
  footer a { margin-right: 16px; }
  @media (max-width: 420px) { h1 { font-size: 34px; } button { flex: 1 1 100%; } }
</style>
</head>
<body>
<main>
<span class="badge">iPhone · In beta</span>
<h1>Log your workouts and meals by typing them.</h1>
<p class="tagline">Type it like a text. We'll log it.</p>
<p class="lede">LiftText is a workout and food log for iPhone. Write what you did and what you ate the way you'd text a friend, and it turns into exercises, sets, reps, weights and macros. No forms, no exercise pickers, no food database to search.</p>
${formBlock(state)}
<div class="card demo" aria-label="Example">
<p class="hint">You type</p>
<p class="typed">“bench 3x8 at 135, then pull-ups 3 sets of 10”</p>
<ul class="sets">
<li><h3>Bench Press</h3><span>3 × 8 · 135 lbs</span></li>
<li><h3>Pull-ups</h3><span>3 × 10</span></li>
</ul>
</div>
<div class="card demo" aria-label="Example meal">
<p class="hint">You type</p>
<p class="typed">“3 eggs and 2 slices of sourdough”</p>
<ul class="sets">
<li><h3>Egg</h3><span>3 · 233 kcal · 19 g protein</span></li>
<li><h3>Sourdough</h3><span>2 slices · 169 kcal · 7 g protein</span></li>
</ul>
</div>
<ul class="features">
<li><h3>Workouts, typed</h3><p>AI reads what you type into exercises, sets, reps and weights. You review the card before it's saved, and fix anything by typing “actually 3x10”.</p></li>
<li><h3>Meals, typed</h3><p>Write what you ate and get calories, protein, carbs and fat. Everyday foods use USDA nutrition data; brands and restaurant meals are estimates. Fix anything the same way: “it was 2 eggs, not 3”.</p></li>
<li><h3>Your history and progress</h3><p>A calendar of every day you trained, personal records, weekly goals, and how long since you last worked each muscle.</p></li>
<li><h3>Ask about your training and food</h3><p>Questions like “what did I bench last week?” or “how much protein did I eat yesterday?” get answered from your own log.</p></li>
<li><h3>Stays on your phone</h3><p>No account. Your log is saved on your iPhone. AI is optional and only for people 18 and older; with it off, LiftText still works.</p></li>
</ul>
<p>LiftText is in a free TestFlight beta in the United States. Join the waitlist and we'll send you an invite.</p>
</main>
<footer>
<p><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:${SUPPORT}">${SUPPORT}</a></p>
<p>LiftText is a log, not medical advice.</p>
</footer>
</body>
</html>`;

export const homePage = () => html(200, page({ kind: 'form' }), 'public, max-age=3600');

const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

// ponytail: KV counters are read-then-write, so a burst can overshoot the caps by a few. Fine for a waitlist.
// Stores waitlist:<email> = sign-up time, with no expiry (the privacy policy says how long it's kept).
// Read the list with `npx wrangler kv key list --binding USAGE --prefix waitlist: --remote`.
export async function joinWaitlist(request: Request, kv: KVNamespace, now: Date): Promise<Response> {
  if (Number(request.headers.get('content-length')) > MAX_BODY) return html(413, page({ kind: 'form', error: 'That was too long. Please enter just your email.' }));
  const text = await request.text();
  if (text.length > MAX_BODY) return html(413, page({ kind: 'form', error: 'That was too long. Please enter just your email.' }));
  const form = new URLSearchParams(text);
  // A bot that fills the hidden field gets the thank-you page and nothing is stored
  if (form.get('website')) return html(200, page({ kind: 'done' }));
  const email = (form.get('email') ?? '').trim().toLowerCase();
  if (email.length > MAX_EMAIL || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>".]{2,}$/.test(email)) {
    return html(400, page({ kind: 'form', error: "That doesn't look like an email address. Please check it and try again." }));
  }

  const day = now.toISOString().slice(0, 10);
  const dayKey = `waitlist-count:${day}`;
  // The address is kept only as a hash, and only for the day
  const addressKey = `waitlist-ip:${await sha256(request.headers.get('cf-connecting-ip') ?? 'unknown')}:${day}`;
  try {
    const m = Number(await kv.get(addressKey)) || 0;
    if (m >= SIGNUPS_PER_ADDRESS) return html(429, page({ kind: 'busy' }));
    const n = Number(await kv.get(dayKey)) || 0;
    if (n >= DAILY_SIGNUPS) return html(429, page({ kind: 'busy' }));
    const ttl = { expirationTtl: 2 * 24 * 60 * 60 };
    const isNew = !(await kv.get(`waitlist:${email}`));
    await Promise.all([kv.put(dayKey, String(n + 1), ttl), kv.put(addressKey, String(m + 1), ttl), isNew && kv.put(`waitlist:${email}`, now.toISOString())]);
  } catch (err) {
    console.error('waitlist error', err);
    return html(503, page({ kind: 'form', error: 'Something went wrong on our side. Please try again in a minute.' }));
  }
  return html(200, page({ kind: 'done' }));
}
