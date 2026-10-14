// Runs every case through the pass-through path's prompts (the planner in services/planner.ts and the
// template parser in services/claude.ts, the same prompts the app sends) on the Worker's pass-through
// model and scores the reply. See README.md.
//
//   npm run eval:planner                       # the Worker's model and effort (server/src/index.ts)
//   npm run eval:planner -- --model claude-haiku-4-5-20251001   # the model from before (no effort)
//   npm run eval:planner -- --model claude-haiku-5-5 --effort low --repeat 3
//   npm run eval:planner -- --only tweak,kg-strength
//   npm run eval:planner -- --against evals/planner/results/<earlier>.json   # list regressions
//   npm run eval:planner -- --cli              # no API key: the model through `claude -p` (see evals/cli.ts)
//
// Needs ANTHROPIC_API_KEY (exported or in .env.eval.local) unless --cli. Never calls the Worker.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mock } from 'node:test';
import { parseArgs } from 'node:util';
import { addDays, format, parseISO } from 'date-fns';
import { callViaCli } from '../cli.ts';
import { PASSTHROUGH } from '../../server/src/index.ts';

// The app services load AsyncStorage; an in-memory one lets them run under node (needs --experimental-test-module-mocks)
const mem = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k) },
});
const { PLANNER_PROMPT, plannerMessage } = await import('../../services/planner.ts');
const { TEMPLATE_PARSING_PROMPT, templateMessage } = await import('../../services/claude.ts');
const { cases, TODAY } = await import('./cases.ts');
const { scorePlanCase, scoreTemplateCase } = await import('./score.ts');

const { values: args } = parseArgs({
  options: {
    model: { type: 'string' },
    effort: { type: 'string' },
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '4' },
    against: { type: 'string' },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
    cli: { type: 'boolean', default: false },
  },
});

const key = process.env.ANTHROPIC_API_KEY;
if (!key && !args.cli) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --cli');

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = { 'claude-haiku-4-5': [1, 5], 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
const price = (model: string) => PRICES[Object.keys(PRICES).find(m => model.startsWith(m)) ?? ''] ?? [0, 0];

const only = args.only?.split(',');
const selected = cases.filter(c => !only || only.includes(c.category) || only.includes(c.id));
const repeat = Number(args.repeat);
const WINDOW_END = format(addDays(parseISO(TODAY), 13), 'yyyy-MM-dd');

async function callAnthropic(body: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if (attempt < 5 && (res.status === 429 || res.status >= 500)) {
      await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
}

async function runCase(c: (typeof cases)[number]) {
  // Exactly what the Worker sends for the app's own prompt
  const model = args.model ?? PASSTHROUGH.model;
  const [system, content] = c.kind === 'plan'
    ? [PLANNER_PROMPT, plannerMessage(c.request, c.draft ?? null, c.history, c.recentMessages ?? [], TODAY, WINDOW_END)]
    : [TEMPLATE_PARSING_PROMPT, templateMessage(c.input)];
  const body: Record<string, unknown> = { model, max_tokens: PASSTHROUGH.max_tokens, system, messages: [{ role: 'user', content }] };
  // Haiku 4.5 (the model from before) takes no effort; 5.x models take the Worker's or the flag's
  if (!model.startsWith('claude-haiku-4-5')) body.output_config = { effort: args.effort ?? PASSTHROUGH.effort };
  const started = Date.now();
  let text = '';
  let usage: Record<string, number> = { input_tokens: 0, output_tokens: 0 };
  let error: string | undefined;
  try {
    const data = args.cli ? await callViaCli(body as Parameters<typeof callViaCli>[0]) : await callAnthropic(body);
    text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    usage = data.usage;
    if (data.stop_reason !== 'end_turn') error = `stop_reason ${data.stop_reason}`;
  } catch (e) {
    error = String(e);
  }
  const ms = Date.now() - started;
  const scored = error ? { checks: [{ name: 'usable', pass: false }], score: 0 } : c.kind === 'plan' ? scorePlanCase(c, text, TODAY, WINDOW_END) : scoreTemplateCase(c, text);
  const [pin, pout] = price(model);
  const cost = ((usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)) * pin + usage.output_tokens * pout) / 1e6;
  return { id: c.id, category: c.category, model, ms, cost, usage, error, text, checks: scored.checks, score: scored.score };
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

const byCase = new Map<string, typeof results>();
for (const r of results) byCase.set(r.id, [...(byCase.get(r.id) ?? []), r]);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const caseScore = (id: string) => mean(byCase.get(id)!.map(r => r.score));

const categories = [...new Set(selected.map(c => c.category))];
const rows = categories.map(cat => {
  const ids = selected.filter(c => c.category === cat).map(c => c.id);
  return { category: cat, cases: ids.length, score: mean(ids.map(caseScore)), perfect: ids.filter(id => caseScore(id) === 1).length };
});
const overall = mean(selected.map(c => caseScore(c.id)));
const unusable = results.filter(r => r.checks[0]?.pass === false).length;
const latencies = results.map(r => r.ms).sort((a, b) => a - b);

if (args.verbose) {
  for (const r of results.filter(r => r.score < 1)) {
    console.log(`\n✗ ${r.id} (${r.score.toFixed(2)})${r.error ? ` ERROR ${r.error}` : ''}`);
    for (const x of r.checks.filter(x => !x.pass)) console.log(`    ${x.name}`);
  }
  console.log('');
}

console.log(`model ${results[0]?.model}${results[0]?.model.startsWith('claude-haiku-4-5') ? '' : ` effort ${args.effort ?? PASSTHROUGH.effort}`}  cases ${selected.length} x${repeat}`);
console.table(Object.fromEntries(rows.map(r => [r.category, { cases: r.cases, score: r.score.toFixed(3), perfect: r.perfect }])));
console.log(`OVERALL ${overall.toFixed(3)}  perfect ${selected.filter(c => caseScore(c.id) === 1).length}/${selected.length}  unusable replies ${unusable}/${results.length}`);
console.log(`cost $${mean(results.map(r => r.cost)).toFixed(5)} per request (${Math.round(mean(results.map(r => r.usage.output_tokens)))} output tokens)  latency p50 ${latencies[Math.floor(latencies.length / 2)]}ms p90 ${latencies[Math.floor(latencies.length * 0.9)]}ms`);
const errors = results.filter(r => r.error);
if (errors.length) console.log(`${errors.length} request errors, first: ${errors[0].error}`);

const summary = { at: new Date().toISOString(), args, overall, rows, cases: Object.fromEntries([...byCase].map(([id]) => [id, caseScore(id)])) };
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
