// Runs every gold case through the real food prompt (server/src/food.ts, the same code the Worker
// runs) and the app's matching and math (services/foods.ts), and reports how often each meal total
// lands within 20% (and 10%) of the reference. See evals/food/README.md.
//
//   npm run eval:food                          # dev sets (cases + scout), AI grounded in the USDA table
//   npm run eval:food -- --set holdout         # the held-out set: report it, never tune on it
//   npm run eval:food -- --arch alone          # AI alone: no table, the model estimates everything
//   npm run eval:food -- --local               # the no-AI parser only (free, offline)
//   npm run eval:food -- --cli                 # no API key: the model through `claude -p` (see evals/cli.ts)
//   npm run eval:food -- --model claude-sonnet-5-5
//   npm run eval:food -- --only branded,units  # categories or case ids
//   npm run eval:food -- --verbose             # print every miss
//   npm run eval:food -- --against evals/food/results/<earlier>.json
//   FOOD_SYSTEM_FILE=prompt.txt npm run eval:food   # try a system prompt from a file instead of food.ts
//
// Without --model, a log goes to Haiku and on to Sonnet when Haiku is unsure, as in the Worker
// (server/src/food.ts needsEscalation); the run also reports Haiku's replies alone from the same calls.
// A grounded run also reports the phone-first system from the same calls: the phone's parse where
// it's confident (services/foods.ts confidentLocal), the AI's elsewhere.
//
// Needs ANTHROPIC_API_KEY (exported or in .env.eval.local) unless --local or --cli. Never calls the Worker.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { buildFoodRequest, FOOD_ESCALATION_MODEL, FOOD_MODEL, needsEscalation, readFoodItems } from '../../server/src/food.ts';
import { buildFoodCandidates, candidateNames, confidentLocal, localFoodParse, mentionsFood, mentionsWorkout, resolveItems, splitLog } from '../../services/foods.ts';
import { MACROS, scoreFoodCase, type CaseScore, type Predicted } from './score.ts';
import type { FoodCase } from './cases.ts';
import { callViaCli } from '../cli.ts';

const { values: args } = parseArgs({
  options: {
    set: { type: 'string', default: 'dev' }, // dev (cases + scout), holdout, or a file name in this folder
    arch: { type: 'string', default: 'grounded' }, // grounded (table candidates) or alone (no table)
    local: { type: 'boolean', default: false },
    cli: { type: 'boolean', default: false }, // call the model through `claude -p` on your login (no API key)
    model: { type: 'string' },
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '8' },
    against: { type: 'string' },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
  },
});

const key = process.env.ANTHROPIC_API_KEY;
const systemFile = process.env.FOOD_SYSTEM_FILE && readFileSync(process.env.FOOD_SYSTEM_FILE, 'utf8');
if (!args.local && !args.cli && !key) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --local or --cli');

const SETS: Record<string, string[]> = { dev: ['cases', 'scout'], holdout: ['holdout-1', 'holdout-2', 'holdout-3'] };
const files = SETS[args.set!] ?? [args.set!];
const cases = (await Promise.all(files.map((f) => import(`./${f}.ts`).then((m) => m.cases as FoodCase[])))).flat();
const only = args.only?.split(',');
const selected = cases.filter((c) => !only || only.includes(c.category) || only.includes(c.id));

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = { 'claude-haiku-4-5': [1, 5], 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
const price = (model: string) => PRICES[Object.keys(PRICES).find((m) => model.startsWith(m)) ?? ''] ?? [0, 0];

async function callAnthropic(body: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if (attempt < 5 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
}

type Usage = { input_tokens: number; output_tokens: number; thinking_tokens?: number };
type Result = CaseScore & { system: string; id: string; category: string; input: string; ms: number; cost: number; failed: boolean; predicted: Predicted | null; error?: string; text?: string; escalated?: boolean; usage?: Usage[] };

// One model call: its text, how it ended, cost and time
async function ask(body: Record<string, unknown>) {
  const started = Date.now();
  let text = '';
  let stop: string | undefined;
  let error: string | undefined;
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };
  try {
    const data = args.cli ? await callViaCli(body as Parameters<typeof callViaCli>[0]) : await callAnthropic(body);
    text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    usage = data.usage;
    stop = data.stop_reason;
  } catch (e) {
    error = String(e);
  }
  const [pin, pout] = price(String(body.model));
  return { text, stop, error, usage, cost: (usage.input_tokens * pin + usage.output_tokens * pout) / 1e6, ms: Date.now() - started };
}

async function runCase(c: FoodCase): Promise<Result[]> {
  const date = c.date ?? '2026-10-03';
  const started = Date.now();
  const base = { id: c.id, category: c.category, input: c.input };
  if (args.local) {
    // What the app does with AI off: the food parts of the message, read on the phone
    const food = splitLog(c.input).food;
    const predicted = { items: food ? localFoodParse(food).items : [] };
    return [{ ...base, system: 'no AI', ms: Date.now() - started, cost: 0, failed: false, predicted, ...scoreFoodCase(c, predicted) }];
  }
  const grounded = args.arch !== 'alone';
  const candidates = grounded ? buildFoodCandidates(c.input) : [];
  const body: Record<string, unknown> = buildFoodRequest(c.input, { date, foods: candidateNames(c.input, candidates) });
  if (args.model) body.model = args.model;
  if (systemFile) body.system = systemFile;
  const score = (calls: Awaited<ReturnType<typeof ask>>[], system: string): Result => {
    const { text, stop, error } = calls[calls.length - 1];
    const read = error ? null : readFoodItems(text, candidates.length);
    const predicted = read ? { items: resolveItems(read.items, candidates) } : null;
    const cost = calls.reduce((t, k) => t + k.cost, 0);
    const ms = calls.reduce((t, k) => t + k.ms, 0);
    const why = error ?? (stop !== 'end_turn' ? `stop_reason ${stop}` : read ? undefined : 'unreadable JSON');
    return { ...base, system, ms, cost, failed: !predicted, predicted, error: why, text, escalated: calls.length > 1, usage: calls.map((k) => k.usage), ...scoreFoodCase(c, predicted) };
  };
  const first = await ask(body);
  const escalate = !args.model && (first.error !== undefined || needsEscalation(first.stop, first.text, candidates.length));
  const calls = escalate ? [first, await ask({ ...body, model: FOOD_ESCALATION_MODEL })] : [first];
  const ai = score(calls, grounded ? 'AI every log, grounded in USDA' : 'AI alone');
  const alone = args.model ? [] : [score([first], `${String(body.model)} alone`)];
  if (!grounded) return [ai, ...alone];
  // The app: the phone's parse where it's confident (no AI call, no cost, instant), the AI's elsewhere
  const phone = confidentLocal(c.input);
  const phoneFirst: Result = phone
    ? { ...base, system: 'Phone first, then AI', ms: 0, cost: 0, failed: false, predicted: { items: phone.items }, ...scoreFoodCase(c, { items: phone.items }) }
    : { ...ai, system: 'Phone first, then AI' };
  return [ai, phoneFirst, ...alone];
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      process.stderr.write('.');
    }
  }));
  process.stderr.write('\n');
  return out;
}

const jobs = Array.from({ length: Number(args.repeat) }, () => selected).flat();
const results = (await pool(jobs, Number(args.concurrency), runCase)).flat();
const systems = [...new Set(results.map((r) => r.system))];

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');
const share = (rs: Result[], f: (r: Result) => boolean) => pct(rs.filter(f).length, rs.length);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const model = args.local ? 'no model' : (args.model ?? `${FOOD_MODEL}, ${FOOD_ESCALATION_MODEL} when unsure`) + (systemFile ? ` (prompt ${process.env.FOOD_SYSTEM_FILE})` : '');

// One row per system: within 20% and 10%, failures, latency, cost per log
const summary = Object.fromEntries(systems.map((s) => {
  const rs = results.filter((r) => r.system === s);
  return [s, {
    logs: rs.length,
    ...Object.fromEntries(MACROS.map((k) => [`${k} 20%`, share(rs, (r) => r.hits[k])])),
    'all 4 20%': share(rs, (r) => r.all),
    ...Object.fromEntries(MACROS.map((k) => [`${k} 10%`, share(rs, (r) => r.tight[k])])),
    failed: rs.filter((r) => r.failed).length,
    escalated: share(rs, (r) => !!r.escalated),
    'p50 ms': median(rs.map((r) => r.ms)),
    '$/log': (rs.reduce((t, r) => t + r.cost, 0) / rs.length).toFixed(5),
  }];
}));

// kcal and protein within 20% by category, per system
const categories = [...new Set(selected.map((c) => c.category))];
const byCategory = Object.fromEntries(categories.map((cat) => [cat, Object.fromEntries(systems.flatMap((s) => {
  const rs = results.filter((r) => r.system === s && r.category === cat);
  const name = s.split(',')[0];
  return [[`${name}: kcal`, share(rs, (r) => r.hits.kcal)], [`${name}: protein`, share(rs, (r) => r.hits.protein)]];
}))]));

if (args.verbose) {
  for (const r of results.filter((r) => r.system === systems[0] && !r.hits.kcal)) {
    console.log(`\n✗ ${r.id} [${r.category}] ${r.error ? `ERROR ${r.error}` : ''}\n    "${r.input}"`);
    for (const m of r.misses) console.log(`    ${m}`);
    for (const i of r.predicted?.items ?? []) console.log(`    · ${i.name} ${i.grams ?? '?'} g ${i.source} ${MACROS.map((k) => `${k} ${Math.round(i.macros[k])}`).join(' ')}`);
  }
  console.log('');
}

console.log(`${model}${args.cli ? ' via claude -p (temperature not pinned)' : ''}  set ${args.set}  cases ${selected.length} x${args.repeat}`);
console.table(summary);
console.table(byCategory);
const foodLogs = selected.filter((c) => c.items.length);
console.log(`router: food parser called for ${foodLogs.filter((c) => mentionsFood(c.input)).length}/${foodLogs.length} food logs on the first try; workout parser also called for ${selected.filter((c) => !c.workout && mentionsWorkout(c.input)).length} logs with no workout, missed for ${selected.filter((c) => c.workout && !mentionsWorkout(c.input)).length} of ${selected.filter((c) => c.workout).length} with one`);
const errors = results.filter((r) => r.error);
if (errors.length) console.log(`${errors.length} request errors, first: ${errors[0].error}`);

const at = new Date().toISOString();
const saved = { at, args, model, summary, byCategory, cases: Object.fromEntries(results.filter((r) => r.system === systems[0]).map((r) => [r.id, r.hits.kcal])) };
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const outFile = new URL(`./results/${at.replace(/[:.]/g, '-')}-${args.set}${args.local ? '-local' : `-${args.arch}`}${args.cli ? '-cli' : ''}${args.label ? `-${args.label}` : ''}.json`, import.meta.url);
writeFileSync(outFile, JSON.stringify({ ...saved, results }, null, 2));
console.log(`saved ${outFile.pathname}`);
// Running API spend across eval runs (the results folder is git-ignored)
const totalCost = results.filter((r) => r.system === systems[0]).reduce((t, r) => t + r.cost, 0);
if (totalCost && !args.cli) {
  const ledger = new URL('./results/spend.log', import.meta.url);
  appendFileSync(ledger, `${at} food ${args.label || '-'} ${totalCost.toFixed(4)}\n`);
  const spent = readFileSync(ledger, 'utf8').trim().split('\n').reduce((s, l) => s + Number(l.split(' ').pop()), 0);
  console.log(`API spend so far (results/spend.log): $${spent.toFixed(2)}`);
}

if (args.against) {
  const before = JSON.parse(readFileSync(args.against, 'utf8')) as { cases: Record<string, boolean> };
  const lost = Object.entries(saved.cases).filter(([id, ok]) => before.cases[id] === true && !ok).map(([id]) => id);
  const won = Object.entries(saved.cases).filter(([id, ok]) => before.cases[id] === false && ok).map(([id]) => id);
  console.log(`\nvs ${args.against}: fixed ${won.length} (${won.join(', ')}), broke ${lost.length} (${lost.join(', ')})`);
}
