// Runs every case through the real parsing prompt (server/src/parse.ts, the same code the Worker runs)
// against the Anthropic API and scores the result field by field. See evals/parse/README.md.
//
//   npm run eval:parse                         # full run, default model
//   npm run eval:parse -- --only multi_day     # one category or case id (comma-separated)
//   npm run eval:parse -- --model claude-sonnet-5-5 --repeat 3
//   npm run eval:parse -- --against evals/parse/results/<earlier>.json   # list regressions
//   npm run eval:parse -- --set corrections    # typed fixes and questions about a draft (correction mode)
//   npm run eval:parse -- --cli                # no API key: the model through `claude -p` (see evals/cli.ts)
//
// Needs ANTHROPIC_API_KEY in the environment (or in .env.eval.local), unless --cli. Never calls the Worker.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { identityCounts, scoreCase, scoreReply, type Predicted } from './score.ts';
import { identityFor } from './identity.ts';
import { callViaCli } from '../cli.ts';

const { values: args } = parseArgs({
  options: {
    parser: { type: 'string', default: '../../server/src/parse.ts' },
    set: { type: 'string', default: 'cases' }, // or 'holdout', 'identity', 'corrections'
    model: { type: 'string' },
    effort: { type: 'string' },
    compat: { type: 'boolean', default: false }, // send what the Worker deployed before the parse mode sends
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '8' },
    against: { type: 'string' },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
    cli: { type: 'boolean', default: false }, // call the model through `claude -p` on your login (no API key)
  },
});

const key = process.env.ANTHROPIC_API_KEY;
if (!key && !args.cli) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --cli');

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

async function runCase(c: (typeof cases)[number] & { draft?: { exercises: { name: string }[] }; fix?: string; reply?: boolean; callIt?: { exercise: string; words: string } }) {
  // A correction picks from the exercises its draft and fix name, like the app does
  const identity = identityFor(c.fix ? { ...c, input: `${c.draft!.exercises.map((e) => e.name).join(', ')}\n${c.fix}` } : c);
  const exercises = identity.candidates.map(({ name, muscleGroup, also, yours }) => ({ name, muscleGroup, also, yours }));
  const options = { date: c.date ?? '2026-10-03', unit: c.unit ?? 'lbs', exercises };
  let body = c.fix ? parser.buildCorrectionRequest(c.draft, c.fix, options) : parser.buildParseRequest(c.input, options);
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
    const data = args.cli ? await callViaCli(body) : await callAnthropic(body);
    text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    usage = data.usage;
    if (data.stop_reason !== 'end_turn') error = `stop_reason ${data.stop_reason}`;
  } catch (e) {
    error = String(e);
  }
  const ms = Date.now() - started;
  // A correction also returns its reply (an answer to a question in the fix), scored with the workout
  const finalized = error ? null : parser.finalizeWithNames(text, c.unit ?? 'lbs', identity);
  const parsed: Predicted | null = finalized?.parsed ?? null;
  const replyScore = c.fix ? scoreReply(c, finalized && { ...finalized, exercises: finalized.parsed.exercises }) : undefined;
  const [pin, pout] = price(body.model);
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cost = ((usage.input_tokens + cacheWrite * 1.25 + cacheRead * 0.1) * pin + usage.output_tokens * pout) / 1e6;
  // What one live request costs (the Worker doesn't cache: real traffic is too sparse for a 5-minute cache).
  const liveCost = ((usage.input_tokens + cacheWrite + cacheRead) * pin + usage.output_tokens * pout) / 1e6;
  const s = scoreCase(c, parsed);
  const scored = replyScore
    ? { points: s.points + replyScore.points, total: s.total + replyScore.total, misses: [...s.misses, ...replyScore.misses] }
    : s;
  return { id: c.id, category: c.category, model: body.model, ms, cost, liveCost, usage, error, text, parsed, identity: identityCounts(c, parsed), ...scored, score: scored.points / scored.total };
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
const sum = (k: 'silent' | 'needless' | 'wronglyNew' | 'exercises') => results.reduce((s, r) => s + r.identity[k], 0);
console.log(`IDENTITY silent mismatches ${sum('silent')} (gate: 0)  needless flags ${sum('needless')}/${sum('exercises')} (${((100 * sum('needless')) / (sum('exercises') || 1)).toFixed(1)}%, target <= 5%)  wrongly new ${sum('wronglyNew')} (target 0)`);
for (const m of [...new Set(results.flatMap((r) => r.identity.mismatches))]) console.log(`  SILENT ${m}`);
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
