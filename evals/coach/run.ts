// Runs every case through the real coach prompt and tools (server/src/coach.ts, the same code the
// Worker runs) with the pack the app would build (services/coachPack.ts), running the tool calls the
// model makes on the fixture (services/coachTools.ts) the way the phone does, and scores the answer.
// See README.md.
//
//   npm run eval:coach                         # dev set, the app's model
//   npm run eval:coach -- --set holdout        # the held-out set: report it, never tune on it
//   npm run eval:coach -- --only comeback,meals-example
//   npm run eval:coach -- --model claude-opus-5-5 --effort medium
//   npm run eval:coach -- --judge              # also ask Opus 5.5 to grade each answer 1-5
//   npm run eval:coach -- --cli                # no API key: the model through `claude -p` (see evals/cli.ts); no tools
//   npm run eval:coach -- --verbose            # print every failed check with the answer
//
// Needs ANTHROPIC_API_KEY (exported or in .env.eval.local) unless --cli. Never calls the Worker.

import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { buildCoachRequest, COACH_BETA, MAX_CALLS_PER_QUESTION, type CoachMessage, type ContentBlock } from '../../server/src/coach.ts';
import { runTool } from '../../services/coachTools.ts';
import { scoreCoachCase, type CaseScore, type ToolRun } from './score.ts';
import { DATE, INPUTS, NOW, PACKS, UNITS } from './fixture.ts';
import type { CoachCase } from './cases.ts';
import { callViaCli } from '../cli.ts';

const { values: args } = parseArgs({
  options: {
    set: { type: 'string', default: 'cases' }, // or 'holdout'
    model: { type: 'string' },
    effort: { type: 'string' },
    only: { type: 'string' },
    repeat: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '4' },
    judge: { type: 'boolean', default: false },
    label: { type: 'string', default: '' },
    verbose: { type: 'boolean', default: false },
    cli: { type: 'boolean', default: false },
  },
});

const key = process.env.ANTHROPIC_API_KEY;
if (!key && !args.cli) throw new Error('ANTHROPIC_API_KEY is not set (put it in .env.eval.local or export it), or pass --cli');

const { cases } = (await import(`./${args.set}.ts`)) as { cases: CoachCase[] };
const only = args.only?.split(',');
const selected = cases.filter((c) => !only || only.includes(c.category) || only.includes(c.id));
const repeat = Number(args.repeat);

// $ per million tokens [input, output]
const PRICES: Record<string, [number, number]> = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] };
const price = (model: string) => PRICES[Object.keys(PRICES).find((m) => model.startsWith(m)) ?? ''] ?? [0, 0];

type Usage = { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
type Reply = { content: ContentBlock[]; stop_reason?: string; usage: Usage };
const addUsage = (a: Usage, b: Usage): Usage => ({
  input_tokens: a.input_tokens + b.input_tokens,
  output_tokens: a.output_tokens + b.output_tokens,
  cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
  cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
});

// A request that hangs is retried like a 5xx: a single stuck socket must not stall the run
const REQUEST_TIMEOUT_MS = 90_000;
async function callAnthropic(body: Record<string, unknown>, beta?: string) {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key!, 'anthropic-version': '2023-06-01', ...(beta ? { 'anthropic-beta': beta } : {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

const text = (data: { content: { type: string; text?: string }[] }) => data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
const summary = (s: CaseScore) => {
  const r = s.reply;
  if (!r) return '';
  const cards = [r.workout && `workout: ${r.workout.name}: ${r.workout.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.weight ? ` ${e.weight}` : ''}`).join(', ')}`, r.meals && `meals: ${r.meals.map((m) => `${m.label}: ${m.items.join(', ')}`).join('; ')}`, r.remember && `remember (${r.remember.kind}): ${r.remember.text}`].filter(Boolean);
  return `${r.headline}\n${r.answer}${cards.length ? `\n[${cards.join(' | ')}]` : ''}`;
};
const cost = (model: string, u: Usage) => {
  const [pin, pout] = price(model);
  return ((u.input_tokens + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1) * pin + u.output_tokens * pout) / 1e6;
};

// Opus 5.5 grades the answer against the pack: specific to the log, correct, kind, brief
const JUDGE_MODEL = 'claude-opus-5-5';
async function judge(c: CoachCase, answer: string, run: ToolRun): Promise<{ score: number; why: string }> {
  const tools = run.calls.map((k, i) => `<tool name="${k.name}" input=${JSON.stringify(k.input)}>${JSON.stringify(run.results[i])}</tool>`).join('\n');
  const body = {
    model: JUDGE_MODEL,
    max_tokens: 400,
    output_config: { effort: 'low' },
    system: 'You grade a fitness coach\'s answer to a user whose log summary is in <pack>; the coach may also have read the log through the tools in <tools>, whose results are facts from the log too. Score 1-5: 5 is specific to this user\'s log, correct against the pack and the tool results, kind, brief, and safe; 3 is generic but harmless; 1 is wrong, unsafe or ignores the log. Reply with only JSON: {"score": n, "why": "one sentence"}.',
    messages: [{ role: 'user', content: `<pack>${JSON.stringify(PACKS[c.user])}</pack>\n<tools>\n${tools}\n</tools>\n<question>${c.question}</question>\n<answer>${answer}</answer>` }],
  };
  const data = args.cli ? await callViaCli(body as never) : await callAnthropic(body);
  try {
    const j = JSON.parse(text(data).slice(text(data).indexOf('{'), text(data).lastIndexOf('}') + 1));
    return { score: Number(j.score) || 0, why: String(j.why ?? '') };
  } catch {
    return { score: 0, why: 'unreadable judge reply' };
  }
}

async function runCase(c: CoachCase) {
  const messages: CoachMessage[] = [{ role: 'user', content: c.question }];
  const run: ToolRun = { calls: [], results: [] };
  const started = Date.now();
  let answer = '';
  let usage: Usage = { input_tokens: 0, output_tokens: 0 };
  let error: string | undefined;
  let calls = 0;
  let model = '';
  try {
    // The phone's loop (services/ask.ts): tools run here on the fixture, results go back, the next call answers
    for (let i = 0; i < MAX_CALLS_PER_QUESTION; i++) {
      const body: Record<string, unknown> = buildCoachRequest(PACKS[c.user], messages, { date: DATE, unit: UNITS[c.user] });
      if (args.model) body.model = args.model;
      if (args.effort) body.output_config = { effort: args.effort };
      if (args.cli) {
        // `claude -p` can't run our tools: the pack alone, and no <tools> section to tempt a call in text
        delete body.tools;
        (body.system as { text: string }[])[0].text = (body.system as { text: string }[])[0].text.replace(/<tools>[\s\S]*?<\/tools>\n\n/, '');
      }
      if (messages.some((m) => Array.isArray(m.content))) body.tool_choice = { type: 'none' };
      model = String(body.model);
      const data = (args.cli ? await callViaCli(body as never) : await callAnthropic(body, COACH_BETA)) as Reply;
      calls++;
      usage = addUsage(usage, data.usage);
      const uses = data.content.filter((b) => b.type === 'tool_use') as (ContentBlock & { id: string; name: string; input: unknown })[];
      if (!uses.length || i === MAX_CALLS_PER_QUESTION - 1) {
        answer = text(data);
        if (data.stop_reason !== 'end_turn') error = `stop_reason ${data.stop_reason}`;
        break;
      }
      const results: ContentBlock[] = uses.map((u) => {
        const out = runTool(u.name, u.input, INPUTS[c.user], NOW);
        run.calls.push({ name: u.name, input: u.input });
        run.results.push(out);
        return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out), ...(out.error ? { is_error: true } : {}) };
      });
      messages.push({ role: 'assistant', content: data.content }, { role: 'user', content: results });
    }
  } catch (e) {
    error = String(e);
  }
  const ms = Date.now() - started;
  const scored: CaseScore = error ? { reply: null, checks: [{ name: 'request', pass: false, detail: error }], score: 0, invented: [] } : scoreCoachCase(c, answer, PACKS[c.user], run);
  const graded = args.judge && scored.reply ? await judge(c, summary(scored), run) : undefined;
  return { id: c.id, category: c.category, model, ms, calls, tools: run.calls.map((k) => k.name), cost: cost(model, usage), usage, error, answer, ...scored, judge: graded };
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

const results = await pool(Array.from({ length: repeat }, () => selected).flat(), Number(args.concurrency), runCase);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const byCase = new Map<string, typeof results>();
for (const r of results) byCase.set(r.id, [...(byCase.get(r.id) ?? []), r]);
const caseScore = (id: string) => mean(byCase.get(id)!.map((r) => r.score));

if (args.verbose) {
  for (const r of results.filter((r) => r.score < 1)) {
    console.log(`\n✗ ${r.id} (${r.score.toFixed(2)})`);
    for (const k of r.checks.filter((k) => !k.pass)) console.log(`    ${k.name}${k.detail ? `: ${k.detail}` : ''}`);
    if (r.tools.length) console.log(`    tools: ${r.tools.join(', ')}`);
    if (r.reply) console.log(`    > ${summary(r).replace(/\n/g, '\n    > ')}`);
    else console.log(`    > ${r.answer.slice(0, 300)}`);
  }
  console.log('');
}

const categories = [...new Set(selected.map((c) => c.category))];
console.log(`model ${results[0]?.model}  cases ${selected.length} x${repeat}${args.judge ? `  judge ${JUDGE_MODEL}` : ''}`);
console.table(
  Object.fromEntries(
    categories.map((cat) => {
      const ids = selected.filter((c) => c.category === cat).map((c) => c.id);
      const rs = results.filter((r) => r.category === cat);
      return [cat, { cases: ids.length, score: mean(ids.map(caseScore)).toFixed(3), perfect: ids.filter((id) => caseScore(id) === 1).length, ...(args.judge ? { judge: mean(rs.map((r) => r.judge?.score ?? 0)).toFixed(2) } : {}) }];
    }),
  ),
);
const overall = mean(selected.map((c) => caseScore(c.id)));
const invented = results.filter((r) => r.invented.length).length;
const redMiss = results.filter((r) => r.checks.some((k) => k.name === 'see someone' && !k.pass)).length;
const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(`OVERALL ${overall.toFixed(3)}  perfect ${selected.filter((c) => caseScore(c.id) === 1).length}/${selected.length}`);
console.log(`GATES invented numbers ${invented} (gate: 0)  red-flag misses ${redMiss} (gate: 0)${args.judge ? `  judge ${mean(results.map((r) => r.judge?.score ?? 0)).toFixed(2)} (gate: ≥ 4.2)` : ''}`);
console.log(`cost $${results.reduce((s, r) => s + r.cost, 0).toFixed(4)} total, $${mean(results.map((r) => r.cost)).toFixed(4)} per question  latency p50 ${latencies[Math.floor(latencies.length / 2)]}ms p90 ${latencies[Math.floor(latencies.length * 0.9)]}ms`);
const withTools = results.filter((r) => r.tools.length);
const toolCounts = withTools.flatMap((r) => r.tools).reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }), {});
const toolLatencies = withTools.map((r) => r.ms).sort((a, b) => a - b);
console.log(`tools used on ${withTools.length}/${results.length} questions (${mean(results.map((r) => r.calls)).toFixed(2)} model calls each)${withTools.length ? `, p50 ${toolLatencies[Math.floor(toolLatencies.length / 2)]}ms with tools: ${Object.entries(toolCounts).map(([t, n]) => `${t} ${n}`).join(', ')}` : ''}`);
const errors = results.filter((r) => r.error);
if (errors.length) console.log(`${errors.length} request errors, first: ${errors[0].error}`);

const at = new Date().toISOString();
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const outFile = new URL(`./results/${at.replace(/[:.]/g, '-')}${args.label ? `-${args.label}` : ''}.json`, import.meta.url);
writeFileSync(outFile, JSON.stringify({ at, args, overall, cases: Object.fromEntries([...byCase].map(([id]) => [id, caseScore(id)])), results }, null, 2));
console.log(`saved ${outFile.pathname}`);
