// The lifttextapp.com home page at GET / and its beta waitlist at POST /waitlist. Plain HTML with no
// script, so the form works anywhere. Colours and type follow DESIGN-SYSTEM.md (the day and night skies,
// the card material, sunrise for the one action). The hero phone is the Log screen drawn in HTML from
// ParsedCard and FoodRows with real USDA numbers (data/foods.ts); keep it in step with the app, and keep
// the claims true of the app as it ships.

const SUPPORT = 'support@lifttextapp.com';
const MAX_BODY = 2048;
const MAX_EMAIL = 254;
// Each signup costs up to three KV writes (the email, the day's count, the address's count) out of the
// Workers Paid KV write budget shared with the AI caps (wrangler.jsonc), so the day's signups are capped too.
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

// The LiftText mark (assets/source/logo-glyph.svg): the bubble with the barbell cut out
const MARK = 'M292 232 H732 A140 140 0 0 1 872 372 V532 C872 610 890 680 938 726 C944 732 940 741 931 740 C870 736 820 716 784 686 C770 676 755 672 732 672 H292 A140 140 0 0 1 152 532 V372 A140 140 0 0 1 292 232 Z M282.5 426.5 H287.6 V383.15 A11.9 11.9 0 0 1 299.5 371.25 H311.4 A11.9 11.9 0 0 1 323.3 383.15 V426.5 H328.4 V355.1 A15.3 15.3 0 0 1 343.7 339.8 H362.4 A15.3 15.3 0 0 1 377.7 355.1 V426.5 H382.8 V414.6 A6.8 6.8 0 0 1 389.6 407.8 H394.7 A6.8 6.8 0 0 1 401.5 414.6 V426.5 H622.5 V414.6 A6.8 6.8 0 0 1 629.3 407.8 H634.4 A6.8 6.8 0 0 1 641.2 414.6 V426.5 H646.3 V355.1 A15.3 15.3 0 0 1 661.6 339.8 H680.3 A15.3 15.3 0 0 1 695.6 355.1 V426.5 H700.7 V383.15 A11.9 11.9 0 0 1 712.6 371.25 H724.5 A11.9 11.9 0 0 1 736.4 383.15 V426.5 H741.5 A25.5 25.5 0 0 1 741.5 477.5 H736.4 V520.85 A11.9 11.9 0 0 1 724.5 532.75 H712.6 A11.9 11.9 0 0 1 700.7 520.85 V477.5 H695.6 V548.9 A15.3 15.3 0 0 1 680.3 564.2 H661.6 A15.3 15.3 0 0 1 646.3 548.9 V477.5 H641.2 V489.4 A6.8 6.8 0 0 1 634.4 496.2 H629.3 A6.8 6.8 0 0 1 622.5 489.4 V477.5 H401.5 V489.4 A6.8 6.8 0 0 1 394.7 496.2 H389.6 A6.8 6.8 0 0 1 382.8 489.4 V477.5 H377.7 V548.9 A15.3 15.3 0 0 1 362.4 564.2 H343.7 A15.3 15.3 0 0 1 328.4 548.9 V477.5 H323.3 V520.85 A11.9 11.9 0 0 1 311.4 532.75 H299.5 A11.9 11.9 0 0 1 287.6 520.85 V477.5 H282.5 A25.5 25.5 0 0 1 282.5 426.5 Z';
const mark = (size: number) => `<svg class="mark" width="${size}" height="${size}" viewBox="98 37 900 900" aria-hidden="true"><use href="#mark"/></svg>`;
// Feature icons, 24 px strokes in the SF Symbols spirit (the app itself uses SF Symbols)
const icon = (d: string) => `<svg class="icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICONS = {
  workouts: '<path d="M6.5 6v12M17.5 6v12M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  meals: '<path d="M7 3v18M4.5 3v5.5a2.5 2.5 0 0 0 5 0V3M17.5 21V3c-2.2 1-3.5 3.5-3.5 7v3h3.5"/>',
  history: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  ask: '<path d="M4 7a3.5 3.5 0 0 1 3.5-3.5h9A3.5 3.5 0 0 1 20 7v6a3.5 3.5 0 0 1-3.5 3.5H11l-5 4v-4.2A3.5 3.5 0 0 1 4 13z"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 18.5h3"/>',
};

const page = (state: Form) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiftText: log workouts and meals by typing</title>
<meta name="description" content="LiftText is a workout and food log for iPhone. Type what you did and what you ate in plain English and it becomes sets, reps, weights and macros. Now in beta.">
<meta name="theme-color" content="#8AA8FF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D0B2A" media="(prefers-color-scheme: dark)">
<style>
  :root { color-scheme: light dark; --text: #0E1430; --text2: #3E4766; --text3: #5F6889; --card: rgba(255,255,255,0.62); --line: rgba(255,255,255,0.8); --glass: rgba(255,255,255,0.5); --glass-line: rgba(255,255,255,0.85); --dim: rgba(14,20,48,0.06); --sunrise: #D2441C; --sunrise-soft: #FF7A4F; --on-sunrise: #FFFFFF; --indigo: #5534C8; --on-indigo: #FFFFFF; --cobalt: #3560F0; --error: #D70015; --base: #F6F5FF;
    --sky: linear-gradient(#8AA8FF, #BCC9FF 40%, #E0E3FF 70%, #F6F5FF); --glow: rgba(255,250,240,0.9); --frame: #0E1430; --shadow: 0 40px 80px -30px rgba(40,50,120,0.45); }
  @media (prefers-color-scheme: dark) { :root { --text: #F3F5FF; --text2: #B0B7D6; --text3: #8189AE; --card: rgba(255,255,255,0.075); --line: rgba(255,255,255,0.13); --glass: rgba(255,255,255,0.1); --glass-line: rgba(255,255,255,0.18); --dim: rgba(255,255,255,0.06); --sunrise: #FF7F57; --sunrise-soft: #FF9D7A; --on-sunrise: #2A1208; --indigo: #A995FF; --on-indigo: #0A1030; --cobalt: #8EA6FF; --error: #FF6961; --base: #1E1A44;
    --sky: linear-gradient(#0D0B2A, #1A1640 40%, #2A1F52 70%, #1E1A44); --glow: #2A2766; --frame: #05051A; --shadow: 0 40px 80px -30px rgba(0,0,0,0.7); } }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body { margin: 0; background: radial-gradient(60% 520px at 100% 0, var(--glow), transparent 70%) no-repeat, var(--sky) 0 0 / 100% 1000px no-repeat, var(--base); color: var(--text); font: 17px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  h1, h2, h3, label, button, .button, .badge, .tagline, .brand, .num { font-family: ui-rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size: clamp(38px, 6.4vw, 64px); line-height: 1.04; letter-spacing: -0.025em; font-weight: 800; margin: 18px 0 16px; text-wrap: balance; }
  h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
  h3 { font-size: 17px; font-weight: 700; margin: 0 0 4px; }
  p { margin: 0 0 12px; }
  a { color: var(--text2); }
  :focus-visible { outline: 3px solid var(--cobalt); outline-offset: 2px; }
  .mark { fill: currentColor; flex: none; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 18px; padding-bottom: 18px; }
  .brand { display: inline-flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; color: var(--text); text-decoration: none; }
  .glass { display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border-radius: 22px; font-size: 15px; font-weight: 700; color: var(--text); text-decoration: none; background: var(--glass); border: 1px solid var(--glass-line); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
  .hero { display: grid; gap: 48px; padding-top: 24px; padding-bottom: 72px; align-items: center; }
  .tagline { font-size: clamp(22px, 2.6vw, 26px); font-weight: 700; margin: 0 0 12px; }
  .lede { font-size: 19px; color: var(--text2); max-width: 34em; }
  .badge { display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text2); background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 26px; padding: 20px; -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
  #join { scroll-margin-top: 24px; }
  #join .card { margin: 28px 0 0; max-width: 540px; }
  label { display: block; font-size: 17px; font-weight: 700; margin-bottom: 10px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; }
  input { flex: 1 1 220px; min-height: 50px; font: inherit; color: var(--text); background: var(--base); border: 1px solid var(--dim); border-radius: 25px; padding: 0 18px; }
  button, .button { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-height: 50px; font-size: 17px; font-weight: 700; color: var(--on-sunrise); background: var(--sunrise); border: 0; border-radius: 25px; padding: 0 22px; cursor: pointer; text-decoration: none; }
  .hint, .note { font-size: 15px; margin: 10px 0 0; color: var(--text3); }
  .note { color: var(--error); }
  .trap { position: absolute; left: -9999px; }
  /* The phone: an honest mockup of the Log tab, drawn with the app's own tokens */
  .stage { position: relative; display: flex; justify-content: center; }
  .stage::before { content: ""; position: absolute; inset: 8% 4% 0; background: radial-gradient(closest-side, var(--sunrise-soft), transparent); opacity: 0.28; filter: blur(30px); }
  .phone { position: relative; margin: 0; width: min(310px, 100%); aspect-ratio: 310 / 640; padding: 10px; border-radius: 52px; background: var(--frame); box-shadow: var(--shadow), inset 0 0 0 1.5px rgba(255,255,255,0.14); }
  .screen { position: relative; height: 100%; overflow: hidden; border-radius: 42px; padding: 52px 14px 14px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; line-height: 1.35; background: radial-gradient(70% 220px at 100% 0, var(--glow), transparent 70%) no-repeat, var(--sky) 0 0 / 100% 70% no-repeat, var(--base); }
  .screen::before { content: ""; position: absolute; top: 11px; left: 50%; width: 92px; height: 27px; margin-left: -46px; border-radius: 14px; background: #000; }
  .status { position: absolute; top: 15px; left: 30px; right: 26px; display: flex; justify-content: space-between; font: 600 13px/1 -apple-system, BlinkMacSystemFont, sans-serif; }
  .status i { width: 22px; height: 11px; border-radius: 3.5px; border: 1.5px solid currentColor; opacity: 0.85; background: linear-gradient(90deg, currentColor 70%, transparent 0) 1px 1px / calc(100% - 2px) calc(100% - 2px) no-repeat; }
  .lt { margin: 4px 4px 0; }
  .lt b { display: block; font: 800 26px/1.1 ui-rounded, -apple-system, sans-serif; letter-spacing: -0.01em; }
  .lt span { color: var(--text2); font-size: 13px; }
  .you { align-self: flex-end; max-width: 82%; padding: 8px 12px; border-radius: 17px 17px 5px 17px; background: var(--indigo); color: var(--on-indigo); }
  .parsed { border-radius: 20px; padding: 12px; }
  .parsed .head { display: flex; align-items: center; gap: 7px; font: 700 15px/1.2 ui-rounded, -apple-system, sans-serif; }
  .parsed .head .mark { color: var(--sunrise); }
  .sum { color: var(--text2); font-size: 12.5px; margin: 2px 0 6px 23px; }
  .label { font: 700 11px/1 ui-rounded, -apple-system, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text3); margin: 10px 0 2px; }
  .item { display: flex; gap: 8px; align-items: flex-start; padding: 9px 0; border-top: 1px solid var(--dim); }
  .dot { flex: none; width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; }
  .item .name { flex: 1; font-weight: 500; }
  .chips { display: flex; gap: 4px; margin-top: 4px; }
  .chip { padding: 3px 6px; border-radius: 8px; background: var(--dim); color: var(--text2); font-size: 12px; }
  .chip b, .num { color: var(--text); font-weight: 700; font-variant-numeric: tabular-nums; }
  .macro { text-align: right; font-size: 12px; color: var(--text2); white-space: nowrap; }
  .macro .num { display: block; font-size: 13px; }
  .acts { display: flex; gap: 8px; margin-top: 10px; }
  .acts span { flex: 1; text-align: center; padding: 9px 0; border-radius: 18px; font: 700 14px/1.2 ui-rounded, -apple-system, sans-serif; }
  .acts .save { background: var(--sunrise); color: var(--on-sunrise); }
  .acts .discard { background: var(--dim); }
  .composer { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding: 7px 7px 7px 15px; border-radius: 24px; color: var(--text3); background: var(--glass); border: 1px solid var(--glass-line); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
  .composer i { width: 28px; height: 28px; border-radius: 50%; background: var(--dim); }
  @media (prefers-reduced-motion: no-preference) {
    .you { animation: rise 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.15) 0.35s both; }
    .parsed { animation: bloom 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.1) 0.95s both; transform-origin: 80% 0; }
  }
  @keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.96); } }
  @keyframes bloom { from { opacity: 0; transform: translateY(18px) scale(0.94); } }
  /* Sections */
  section.wrap { padding-top: 32px; padding-bottom: 32px; }
  .kicker { font: 700 13px/1 ui-rounded, -apple-system, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text3); margin: 0 0 14px; }
  .pair { display: grid; gap: 16px; }
  .example { display: flex; flex-direction: column; gap: 12px; }
  .example .you { font-size: 17px; padding: 10px 16px; border-radius: 22px 22px 6px 22px; max-width: 90%; animation: none; }
  .example ul { list-style: none; margin: 0; padding: 0; }
  .example li { display: flex; align-items: baseline; gap: 10px; padding: 10px 0; border-top: 1px solid var(--dim); }
  .example li:first-child { border-top: 0; padding-top: 0; }
  .example li .dot { align-self: center; margin: 0; width: 9px; height: 9px; }
  .example h3 { flex: 1; margin: 0; }
  .example li span { color: var(--text2); font-variant-numeric: tabular-nums; text-align: right; }
  .features { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
  .features li { padding: 22px; }
  .icon { fill: none; stroke: var(--text); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .tile { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: var(--dim); margin-bottom: 14px; }
  .features p { color: var(--text2); margin: 0; }
  .cta { text-align: center; padding: 40px 24px; margin: 24px 0 8px; }
  .cta p { font-size: 19px; max-width: 30em; margin: 0 auto 20px; }
  footer.wrap { padding-top: 24px; padding-bottom: 48px; font-size: 15px; color: var(--text3); }
  footer p { margin: 0 0 6px; }
  footer a { margin-right: 16px; }
  footer .brand { font-size: 17px; margin-bottom: 10px; color: var(--text2); }
  @media (max-width: 420px) { button { flex: 1 1 100%; } .glass { padding: 0 14px; } }
  @media (min-width: 720px) { .pair { grid-template-columns: 1fr 1fr; } .features { grid-template-columns: repeat(6, 1fr); } .features li { grid-column: span 2; } .features li:nth-child(-n+2) { grid-column: span 3; } section.wrap { padding-top: 48px; padding-bottom: 48px; } }
  @media (min-width: 960px) { .hero { grid-template-columns: minmax(0, 1fr) 360px; gap: 72px; padding-top: 40px; padding-bottom: 96px; } .phone { width: 340px; } }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><path id="mark" d="${MARK}" fill-rule="evenodd"/></defs></svg>
<header class="wrap top">
<a class="brand" href="/">${mark(28)}LiftText</a>
<a class="glass" href="#join">Join the beta</a>
</header>
<main>
<div class="wrap hero">
<div>
<span class="badge">iPhone · In beta</span>
<h1>Log your workouts and meals by typing them.</h1>
<p class="tagline">Type it like a text. We'll log it.</p>
<p class="lede">LiftText is a workout and food log for iPhone. Write what you did and what you ate the way you'd text a friend, and it turns into exercises, sets, reps, weights and macros. No forms, no exercise pickers, no food database to search.</p>
<div id="join">${formBlock(state)}</div>
</div>
<div class="stage">
<figure class="phone" role="img" aria-label="The LiftText Log screen. You type “bench 3x5 185, then 2 eggs and toast” and it shows Bench Press, 3 sets of 5 at 185 lb, and 2 eggs and a slice of toast with their protein and calories, ready to save.">
<div class="screen" aria-hidden="true">
<div class="status"><span>9:41</span><i></i></div>
<div class="lt"><b>Good morning</b><span>Tuesday, October 6</span></div>
<div class="you">bench 3x5 185, then 2 eggs and toast</div>
<div class="card parsed">
<div class="head">${mark(16)}Got it. Look right?</div>
<div class="sum">1 exercise · 3 sets · 2,775 lb</div>
<div class="item"><span class="dot" style="background:#F0764F"></span><div class="name">Bench Press<div class="chips"><span class="chip"><b>3</b> sets</span><span class="chip"><b>5</b> reps</span><span class="chip"><b>185</b> lb</span></div></div></div>
<div class="label">Food</div>
<div class="sum" style="margin-left:0">2 foods · 15 g protein · 228 kcal</div>
<div class="item"><span class="dot" style="background:#E3B33A"></span><div class="name">Egg<div class="chips"><span class="chip"><b>2</b> each</span></div></div><div class="macro"><span class="num">13 g protein</span>155 kcal</div></div>
<div class="item"><span class="dot" style="background:#C99A5B"></span><div class="name">Toast, white<div class="chips"><span class="chip"><b>1</b> slice</span></div></div><div class="macro"><span class="num">3 g protein</span>73 kcal</div></div>
<div class="acts"><span class="save">Save</span><span class="discard">Discard</span></div>
</div>
<div class="composer">What'd you do or eat today?<i></i></div>
</div>
</figure>
</div>
</div>
<section class="wrap" aria-label="Examples">
<p class="kicker">You type</p>
<div class="pair">
<div class="card example" aria-label="Example">
<p class="you">“bench 3x8 at 135, then pull-ups 3 sets of 10”</p>
<ul>
<li><span class="dot" style="background:#F0764F"></span><h3>Bench Press</h3><span>3 × 8 · 135 lbs</span></li>
<li><span class="dot" style="background:#4B8DF8"></span><h3>Pull-ups</h3><span>3 × 10</span></li>
</ul>
</div>
<div class="card example" aria-label="Example meal">
<p class="you">“3 eggs and 2 slices of sourdough”</p>
<ul>
<li><span class="dot" style="background:#E3B33A"></span><h3>Egg</h3><span>3 · 233 kcal · 19 g protein</span></li>
<li><span class="dot" style="background:#C99A5B"></span><h3>Sourdough</h3><span>2 slices · 169 kcal · 7 g protein</span></li>
</ul>
</div>
</div>
</section>
<section class="wrap" aria-label="Features">
<ul class="features">
<li class="card"><span class="tile">${icon(ICONS.workouts)}</span><h3>Workouts, typed</h3><p>AI reads what you type into exercises, sets, reps and weights. You review the card before it's saved, and fix anything by typing “actually 3x10”.</p></li>
<li class="card"><span class="tile">${icon(ICONS.meals)}</span><h3>Meals, typed</h3><p>Write what you ate and get calories, protein, carbs and fat. Everyday foods use USDA nutrition data; brands and restaurant meals are estimates. Fix anything the same way: “it was 2 eggs, not 3”.</p></li>
<li class="card"><span class="tile">${icon(ICONS.history)}</span><h3>Your history and progress</h3><p>A calendar of every day you trained, personal records, weekly goals, and how long since you last worked each muscle.</p></li>
<li class="card"><span class="tile">${icon(ICONS.ask)}</span><h3>Ask about your training and food</h3><p>Questions like “what did I bench last week?” or “how much protein did I eat yesterday?” get answered from your own log.</p></li>
<li class="card"><span class="tile">${icon(ICONS.phone)}</span><h3>Stays on your phone</h3><p>No account. Your log is saved on your iPhone. AI is optional and only for people 18 and older; with it off, LiftText still works.</p></li>
</ul>
</section>
<section class="wrap">
<div class="card cta">
<p>LiftText is in a free TestFlight beta in the United States. Join the waitlist and we'll send you an invite.</p>
<a class="button" href="#join">Join the waitlist</a>
</div>
</section>
</main>
<footer class="wrap">
<p class="brand">${mark(22)}LiftText</p>
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
