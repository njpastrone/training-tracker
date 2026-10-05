// Runs every case through the real parsing prompt (server/src/parse.ts, the same code the Worker runs)
// against the Anthropic API and scores the result field by field. See evals/parse/README.md.
//
//   npm run eval:parse                         # full run, default model
//   npm run eval:parse -- --only multi_day     # one category or case id (comma-separated)
//   npm run eval:parse -- --model claude-sonnet-5-5 --repeat 3
//   npm run eval:parse -- --against evals/parse/results/<earlier>.json   # list regressions
//
// Needs ANTHROPIC_API_KEY in the environment (or in .env.eval.local). Never calls the Worker.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { scoreCase, type Predicted } from './score.ts';

const { values: args } = parseArgs({
  options: {
    parser: { type: 'string', default: '../../server/src/parse.ts' },
    set: { type: 'string', default: 'cases' }, // or 'holdout'
    model: { type: 'string' },
    effort: { type: 'string' },
    compat: { type: 'boolean', default: false }, // send what the Worker deployed before the parse mode sends
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '8' },
    against: { type: 'string' },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
  },
});

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it)');

const parser = await import(new URL(args.parser!, import.meta.url).href);
const { cases } = (await import(`./${args.set}.ts`)) as typeof import('./cases.ts');

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};
const price = (model: string) => PRICES[Object.keys(PRICES).find((m) => model.startsWith(m)) ?? ''] ?? [0, 0];

const only = args.only?.split(',');
const selected = cases.filter((c) => !only || only.includes(c.category) || only.includes(c.id));
const repeat = Number(args.repeat);

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

async function runCase(c: (typeof cases)[number]) {
  let body = parser.buildParseRequest(c.input, { date: c.date ?? '2026-10-03', unit: c.unit ?? 'lbs' });
  if (args.model) body.model = args.model;
  if (args.effort) body.output_config = { ...body.output_config, effort: args.effort };
  if (args.compat) {
    // The Worker deployed before the parse mode forwards only these fields, with its own model and cap.
    const { system, messages, max_tokens } = body;
    body = { model: 'claude-haiku-4-5-20251001', system, messages, max_tokens: Math.min(max_tokens, 1500) };
  }
  if (!String(body.model).startsWith('claude-haiku')) delete body.temperature; // newer models reject sampling params
  // Eval-only: cache the shared system prompt across the run. Doesn't change outputs, only cost.
  if (typeof body.system === 'string') body.system = [{ type: 'text', text: body.system, cache_control: { type: 'ephemeral' } }];
  const started = Date.now();
  let text = '';
  let usage: Record<string, number> = { input_tokens: 0, output_tokens: 0 };
  let error: string | undefined;
  try {
    const data = await callAnthropic(body);
    text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    usage = data.usage;
    if (data.stop_reason !== 'end_turn') error = `stop_reason ${data.stop_reason}`;
  } catch (e) {
    error = String(e);
  }
  const ms = Date.now() - started;
  const parsed: Predicted | null = error ? null : parser.finalizeParse(text, c.input);
  const [pin, pout] = price(body.model);
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cost = ((usage.input_tokens + cacheWrite * 1.25 + cacheRead * 0.1) * pin + usage.output_tokens * pout) / 1e6;
  // What one live request costs (the Worker doesn't cache: real traffic is too sparse for a 5-minute cache).
  const liveCost = ((usage.input_tokens + cacheWrite + cacheRead) * pin + usage.output_tokens * pout) / 1e6;
  return { id: c.id, category: c.category, model: body.model, ms, cost, liveCost, usage, error, text, parsed, ...scoreCase(c, parsed) };
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        process.stderr.write('.');
      }
    }),
  );
  process.stderr.write('\n');
  return out;
}

const jobs = Array.from({ length: repeat }, () => selected).flat();
const results = await pool(jobs, Number(args.concurrency), runCase);

// Average repeats per case, then cases per category.
const byCase = new Map<string, typeof results>();
for (const r of results) byCase.set(r.id, [...(byCase.get(r.id) ?? []), r]);
const caseScore = (id: string) => byCase.get(id)!.reduce((s, r) => s + r.score, 0) / byCase.get(id)!.length;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

const categories = [...new Set(selected.map((c) => c.category))];
const rows = categories.map((cat) => {
  const ids = selected.filter((c) => c.category === cat).map((c) => c.id);
  return { category: cat, cases: ids.length, score: mean(ids.map(caseScore)), perfect: ids.filter((id) => caseScore(id) === 1).length };
});
const overall = mean(selected.map((c) => caseScore(c.id)));
const totalCost = results.reduce((s, r) => s + r.cost, 0);
const liveCost = results.reduce((s, r) => s + r.liveCost, 0) / results.length;
const latencies = results.map((r) => r.ms).sort((a, b) => a - b);

if (args.verbose) {
  for (const r of results.filter((r) => r.score < 1)) {
    console.log(`\n✗ ${r.id} (${r.score.toFixed(2)})${r.error ? ` ERROR ${r.error}` : ''}`);
    for (const m of r.misses) console.log(`    ${m}`);
  }
  console.log('');
}

console.log(`model ${results[0]?.model}${args.compat ? ' (compat: no structured output)' : ''}  cases ${selected.length} x${repeat}`);
console.table(Object.fromEntries(rows.map((r) => [r.category, { cases: r.cases, score: r.score.toFixed(3), perfect: r.perfect }])));
console.log(`OVERALL ${overall.toFixed(3)}  perfect ${selected.filter((c) => caseScore(c.id) === 1).length}/${selected.length}`);
console.log(`cost $${totalCost.toFixed(4)} total, $${(totalCost / repeat).toFixed(4)} per full pass (eval, cached), $${liveCost.toFixed(5)} per live request  latency p50 ${latencies[Math.floor(latencies.length / 2)]}ms p90 ${latencies[Math.floor(latencies.length * 0.9)]}ms`);
const errors = results.filter((r) => r.error);
if (errors.length) console.log(`${errors.length} request errors, first: ${errors[0].error}`);

const summary = { at: new Date().toISOString(), args, overall, rows, cost: totalCost, cases: Object.fromEntries([...byCase].map(([id, rs]) => [id, caseScore(id)])) };
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const outFile = new URL(`./results/${summary.at.replace(/[:.]/g, '-')}${args.label ? `-${args.label}` : ''}.json`, import.meta.url);
writeFileSync(outFile, JSON.stringify({ ...summary, results }, null, 2));
console.log(`saved ${outFile.pathname}`);

if (args.against) {
  const before = JSON.parse(readFileSync(args.against, 'utf8')) as { overall: number; cases: Record<string, number> };
  const regressions = Object.entries(summary.cases).filter(([id, s]) => before.cases[id] !== undefined && s < before.cases[id] - 1e-9);
  console.log(`\nvs ${args.against}: overall ${before.overall.toFixed(3)} -> ${overall.toFixed(3)}`);
  for (const [id, s] of regressions) console.log(`  REGRESSION ${id}: ${before.cases[id].toFixed(2)} -> ${s.toFixed(2)}`);
  if (!regressions.length) console.log('  no regressions');
}
