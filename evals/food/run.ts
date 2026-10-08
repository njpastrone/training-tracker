// Runs every gold case through the real food prompt (server/src/food.ts, the same code the Worker
// runs) and the app's matching and math (services/foods.ts), against the Anthropic API, and reports
// how often each meal total lands within 20% of the reference. See evals/food/README.md.
//
//   npm run eval:food                          # full run, Haiku 4.5
//   npm run eval:food -- --local               # the no-AI parser only (free, offline)
//   npm run eval:food -- --hybrid              # the phone's parse when it's confident, AI for the rest
//   npm run eval:food -- --cli                 # no API key: the model through `claude -p` (see evals/cli.ts)
//   npm run eval:food -- --only branded,units  # categories or case ids
//   npm run eval:food -- --verbose             # print every miss
//   npm run eval:food -- --against evals/food/results/<earlier>.json
//
// Needs ANTHROPIC_API_KEY (exported or in .env.eval.local) unless --local or --cli. Never calls the Worker.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { buildFoodRequest, readFoodItems } from '../../server/src/food.ts';
import { buildFoodCandidates, candidateName, confidentLocal, localFoodParse, mentionsFood, mentionsWorkout, resolveItems, splitLog } from '../../services/foods.ts';
import { MACROS, scoreFoodCase, type Predicted } from './score.ts';
import type { FoodCase } from './cases.ts';
import { callViaCli } from '../cli.ts';

const { values: args } = parseArgs({
  options: {
    set: { type: 'string', default: 'cases' },
    local: { type: 'boolean', default: false },
    hybrid: { type: 'boolean', default: false }, // the phone's parse when it's confident, else AI
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
if (!args.local && !args.cli && !key) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --local or --cli');

const { cases } = (await import(`./${args.set}.ts`)) as { cases: FoodCase[] };
const only = args.only?.split(',');
const selected = cases.filter((c) => !only || only.includes(c.category) || only.includes(c.id));

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = { 'claude-haiku-4-5': [1, 5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
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

async function runCase(c: FoodCase) {
  const date = c.date ?? '2026-10-03';
  const started = Date.now();
  let predicted: Predicted | null = null;
  let text = '';
  let error: string | undefined;
  let cost = 0;
  let usage = { input_tokens: 0, output_tokens: 0 };
  const candidates = buildFoodCandidates(c.input);
  const confident = args.hybrid ? confidentLocal(c.input) : null;
  if (confident) {
    predicted = { items: confident.items };
  } else if (args.local) {
    // What the app does with AI off: food parts of the message, read on the phone
    const food = splitLog(c.input).food;
    predicted = { items: food ? localFoodParse(food).items : [] };
  } else {
    const body: Record<string, unknown> = buildFoodRequest(c.input, { date, foods: candidates.map(candidateName) });
    if (args.model) body.model = args.model;
    if (!String(body.model).startsWith('claude-haiku')) delete body.temperature;
    try {
      const data = args.cli ? await callViaCli(body as Parameters<typeof callViaCli>[0]) : await callAnthropic(body);
      text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
      usage = data.usage;
      if (data.stop_reason !== 'end_turn') error = `stop_reason ${data.stop_reason}`;
      const read = readFoodItems(text, candidates.length);
      predicted = read ? { items: resolveItems(read.items, candidates) } : null;
      if (!read) error ??= 'unreadable JSON';
    } catch (e) {
      error = String(e);
    }
    const [pin, pout] = price(String(body.model));
    cost = (usage.input_tokens * pin + usage.output_tokens * pout) / 1e6;
  }
  const s = scoreFoodCase(c, predicted);
  // Router: would the app send this to the food parser, and also to the workout parser?
  // ("mixed" here, "combined-workout-food" in the scout set)
  const router = { food: mentionsFood(c.input), workout: mentionsWorkout(c.input) };
  return { id: c.id, category: c.category, input: c.input, ms: Date.now() - started, cost, usage, error, text, candidates: candidates.length, predicted, router, ...s };
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
const results = await pool(jobs, Number(args.concurrency), runCase);

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-');
const categories = [...new Set(selected.map((c) => c.category))];
const table = (rs: typeof results) => ({
  cases: rs.length,
  kcal: pct(rs.filter((r) => r.hits.kcal).length, rs.length),
  protein: pct(rs.filter((r) => r.hits.protein).length, rs.length),
  carbs: pct(rs.filter((r) => r.hits.carbs).length, rs.length),
  fat: pct(rs.filter((r) => r.hits.fat).length, rs.length),
  'all 4': pct(rs.filter((r) => r.all).length, rs.length),
  ...(rs.some((r) => r.atTolerance !== undefined) ? { 'kcal at its tolerance': pct(rs.filter((r) => r.atTolerance).length, rs.length) } : {}),
});
const rows = Object.fromEntries(categories.map((cat) => [cat, table(results.filter((r) => r.category === cat))]));
rows.OVERALL = table(results);

if (args.verbose) {
  for (const r of results.filter((r) => !r.all)) {
    console.log(`\n✗ ${r.id} [${r.category}] ${r.error ? `ERROR ${r.error}` : ''}\n    "${r.input}"`);
    for (const m of r.misses) console.log(`    ${m}`);
    for (const i of r.predicted?.items ?? []) console.log(`    · ${i.name} ${i.grams ?? '?'} g ${i.source} ${MACROS.map((k) => `${k} ${i.macros[k]}`).join(' ')}`);
  }
  console.log('');
}

const totalCost = results.reduce((s, r) => s + r.cost, 0);
const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
const items = results.flatMap((r) => r.predicted?.items ?? []);
const foodCases = results.filter((r) => selected.find((c) => c.id === r.id)!.items.length > 0);
console.log(`${args.hybrid ? `hybrid (phone for ${results.filter((r) => !r.usage.input_tokens && !r.error).length} logs) + ` : ''}${args.local ? 'local parser (no AI)' : `model ${String(buildFoodRequest('', { date: '2026-10-03' }).model)}${args.model ? ` → ${args.model}` : ''}`}  cases ${selected.length} x${args.repeat}  (within 20%, floors kcal 25, macros 3 g)`);
console.table(rows);
console.log(`items ${items.length}: ${pct(items.filter((i) => i.source === 'usda').length, items.length)} from USDA, ${pct(items.filter((i) => i.source === 'estimate').length, items.length)} AI estimates`);
const mixed = (r: (typeof results)[number]) => selected.find((c) => c.id === r.id)!.workout !== undefined;
console.log(`router: food parser called for ${foodCases.filter((r) => r.router.food).length}/${foodCases.length} food logs; workout parser also called for ${results.filter((r) => !mixed(r) && r.router.workout).length} logs with no workout, missed for ${results.filter((r) => mixed(r) && !r.router.workout).length} of ${results.filter(mixed).length} with one`);
if (!args.local) {
  if (args.cli) console.log('via claude -p: temperature not pinned; tokens are the CLI\'s minus its own context; no API spend');
  console.log(`cost $${totalCost.toFixed(4)} this run, $${(totalCost / results.length).toFixed(5)} per food parse (no caching, like the Worker)  latency p50 ${latencies[Math.floor(latencies.length / 2)]}ms p90 ${latencies[Math.floor(latencies.length * 0.9)]}ms`);
  console.log(`tokens per parse: ${Math.round(results.reduce((s, r) => s + r.usage.input_tokens, 0) / results.length)} in, ${Math.round(results.reduce((s, r) => s + r.usage.output_tokens, 0) / results.length)} out`);
}
const errors = results.filter((r) => r.error);
if (errors.length) console.log(`${errors.length} errors, first: ${errors[0].error}`);

const at = new Date().toISOString();
const summary = { at, args, rows, cost: totalCost, cases: Object.fromEntries(results.map((r) => [r.id, r.all])) };
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const outFile = new URL(`./results/${at.replace(/[:.]/g, '-')}${args.local ? '-local' : args.hybrid ? '-hybrid' : ''}${args.cli ? '-cli' : ''}${args.label ? `-${args.label}` : ''}.json`, import.meta.url);
writeFileSync(outFile, JSON.stringify({ ...summary, results }, null, 2));
console.log(`saved ${outFile.pathname}`);
// Running API spend across eval runs (the results folder is git-ignored)
if (totalCost && !args.cli) {
  const ledger = new URL('./results/spend.log', import.meta.url);
  appendFileSync(ledger, `${at} food ${args.label || '-'} ${totalCost.toFixed(4)}\n`);
  const spent = readFileSync(ledger, 'utf8').trim().split('\n').reduce((s, l) => s + Number(l.split(' ').pop()), 0);
  console.log(`API spend so far (results/spend.log): $${spent.toFixed(2)}`);
}

if (args.against) {
  const before = JSON.parse(readFileSync(args.against, 'utf8')) as { cases: Record<string, boolean> };
  const lost = Object.entries(summary.cases).filter(([id, ok]) => before.cases[id] === true && !ok).map(([id]) => id);
  const won = Object.entries(summary.cases).filter(([id, ok]) => before.cases[id] === false && ok).map(([id]) => id);
  console.log(`\nvs ${args.against}: fixed ${won.length} (${won.join(', ')}), broke ${lost.length} (${lost.join(', ')})`);
}
