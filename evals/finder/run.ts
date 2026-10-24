// Runs every finder case through the real finder prompt (server/src/finder.ts, the same code the Worker
// runs) and scores the picks. See README.md.
//
//   npm run eval:finder                        # the app's models: Haiku 5.5, Sonnet 5.5 when unsure
//   npm run eval:finder -- --model claude-sonnet-5-5
//   npm run eval:finder -- --only oils,numbers # categories or case ids
//   npm run eval:finder -- --cli               # no API key: the model through `claude -p` (see evals/cli.ts)
//   npm run eval:finder -- --verbose           # print every failed check with the picks
//   npm run eval:finder -- --repeat 2
//
// Needs ANTHROPIC_API_KEY (exported or in .env.eval.local) unless --cli. Never calls the Worker.

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { buildFinderRequest, FINDER_ESCALATION_MODEL, FINDER_MODEL, needsFinderEscalation, tally } from '../../server/src/finder.ts';
import { scoreFinderCase, type CaseScore } from './score.ts';
import { cases, type FinderCase } from './cases.ts';
import { callViaCli } from '../cli.ts';

const { values: args } = parseArgs({
  options: {
    model: { type: 'string' },
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '6' },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
    cli: { type: 'boolean', default: false },
  },
});

const key = process.env.ANTHROPIC_API_KEY;
if (!key && !args.cli) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --cli');
const only = args.only?.split(',');
const selected = cases.filter((c) => !only || only.includes(c.category) || only.includes(c.id));
const DATE = '2026-10-24';

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
const price = (model: string) => PRICES[Object.keys(PRICES).find((m) => model.startsWith(m)) ?? ''] ?? [0, 0];

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
async function callAnthropic(body: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (e) {
      if (attempt < 5) continue;
      throw new Error(`Anthropic request failed: ${String(e)}`);
    }
    if (res.ok) return res.json();
    if (attempt < 5 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
}

// One model call: its text, how it ended, cost and time
async function ask(body: Record<string, unknown>) {
  const started = Date.now();
  let text = '';
  let stop: string | undefined;
  let error: string | undefined;
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };
  try {
    // The CLI can't take the finder's thinking-off or output-format fields; it sends the prompt as is
    const data = args.cli ? await callViaCli(body as Parameters<typeof callViaCli>[0]) : await callAnthropic(body);
    text = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    usage = data.usage;
    stop = data.stop_reason;
  } catch (e) {
    error = String(e);
  }
  const [pin, pout] = price(String(body.model));
  const cost = ((usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1) * pin + usage.output_tokens * pout) / 1e6;
  return { text, stop, error, usage, cost, ms: Date.now() - started };
}

type Result = CaseScore & { id: string; category: string; ms: number; cost: number; escalated: boolean; error?: string; text: string };

async function runCase(c: FinderCase): Promise<Result> {
  const input = { date: DATE, ...c.input };
  const body: Record<string, unknown> = buildFinderRequest(input, args.model ?? FINDER_MODEL);
  const first = await ask(body);
  const escalate = !args.model && (first.error !== undefined || needsFinderEscalation(first.stop, first.text, input));
  const calls = escalate ? [first, await ask(buildFinderRequest(input, FINDER_ESCALATION_MODEL))] : [first];
  const last = calls[calls.length - 1];
  const score = scoreFinderCase(c, last.error ? '' : last.text);
  return { ...score, id: c.id, category: c.category, ms: calls.reduce((t, k) => t + k.ms, 0), cost: calls.reduce((t, k) => t + k.cost, 0), escalated: calls.length > 1, error: last.error ?? (last.stop !== 'end_turn' ? `stop_reason ${last.stop}` : undefined), text: last.text };
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
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const model = args.model ?? `${FINDER_MODEL} (thinking off), ${FINDER_ESCALATION_MODEL} when unsure`;

const checks = results.flatMap((r) => r.checks);
const byCheck: Record<string, string> = {};
for (const name of ['readable', 'no health claims', 'places from the list', 'numbers make sense', 'best is sure enough', 'never list honoured', 'kcal within 20% of published', 'protein within 20% of published']) {
  const ks = checks.filter((k) => k.name === name);
  byCheck[name] = `${pct(ks.filter((k) => k.pass).length, ks.length)} (${ks.length})`;
}
const summary = {
  cases: results.length,
  'mean score': mean(results.map((r) => r.score)).toFixed(2),
  'all checks': pct(results.filter((r) => r.score === 1).length, results.length),
  escalated: pct(results.filter((r) => r.escalated).length, results.length),
  errors: results.filter((r) => r.error).length,
  'p50 ms': median(results.map((r) => r.ms)),
  '$/search': mean(results.map((r) => r.cost)).toFixed(5),
};
const categories = [...new Set(selected.map((c) => c.category))];
const byCategory = Object.fromEntries(categories.map((cat) => {
  const rs = results.filter((r) => r.category === cat);
  return [cat, { cases: rs.length, 'mean score': mean(rs.map((r) => r.score)).toFixed(2), 'all checks': pct(rs.filter((r) => r.score === 1).length, rs.length) }];
}));

if (args.verbose) {
  for (const r of results.filter((r) => r.score < 1)) {
    console.log(`\n✗ ${r.id} [${r.category}]${r.escalated ? ' (escalated)' : ''}${r.error ? ` ERROR ${r.error}` : ''}`);
    for (const k of r.checks.filter((k) => !k.pass)) console.log(`    ${k.name}: ${k.detail ?? ''}`);
    for (const p of r.reply?.picks ?? []) console.log(`    · ${p.place}: ${p.item} · ${p.kcal} kcal · ${p.protein} g · $${p.price} · hits ${tally(p.verdicts).hits}/${p.verdicts.length} · ${p.confidence}`);
  }
  console.log('');
}

console.log(`${model}${args.cli ? ' via claude -p (thinking and output format not pinned)' : ''}  cases ${selected.length} x${args.repeat}`);
console.table(summary);
console.table(byCheck);
console.table(byCategory);
const errors = results.filter((r) => r.error);
if (errors.length) console.log(`${errors.length} errors, first: ${errors[0].error}`);

const at = new Date().toISOString();
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const outFile = new URL(`./results/${at.replace(/[:.]/g, '-')}${args.cli ? '-cli' : ''}${args.label ? `-${args.label}` : ''}.json`, import.meta.url);
writeFileSync(outFile, JSON.stringify({ at, args, model, summary, byCheck, byCategory, results }, null, 2));
console.log(`saved ${outFile.pathname}`);
const totalCost = results.reduce((t, r) => t + r.cost, 0);
if (totalCost && !args.cli) {
  const ledger = new URL('./results/spend.log', import.meta.url);
  appendFileSync(ledger, `${at} finder ${args.label || '-'} ${totalCost.toFixed(4)}\n`);
  const spent = readFileSync(ledger, 'utf8').trim().split('\n').reduce((s, l) => s + Number(l.split(' ').pop()), 0);
  console.log(`API spend so far (results/spend.log): $${spent.toFixed(2)}`);
}
