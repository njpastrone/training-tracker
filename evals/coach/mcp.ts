// Eval-only: never shipped in the app or the Worker. It wraps the existing COACH_TOOLS from server/src/coach.ts, adds no tools,
// and approximates the Worker's one-round tool limit with a timing heuristic (calls more than 1.5 s after the first are turned away).
// The coach's read tools as an MCP server, so `claude -p` (run.ts --cli) can call them on the fixture
// the way the phone does. Each call and its result is appended to the log file run.ts reads back.
//
//   node --import tsx evals/coach/mcp.ts <user> <log file>

import { appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { ANSWER_REMINDER, COACH_TOOLS } from '../../server/src/coach.ts';
import { runTool } from '../../services/coachTools.ts';
import { INPUTS, NOW } from './fixture.ts';

const [user, log] = process.argv.slice(2) as [keyof typeof INPUTS, string];
const send = (id: unknown, result: unknown) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
const reply = (id: unknown, text: string, isError = false) => send(id, { content: [{ type: 'text', text }], ...(isError ? { isError } : {}) });
let first = 0;

createInterface({ input: process.stdin }).on('line', (line) => {
  const { id, method, params } = JSON.parse(line);
  if (method === 'initialize') send(id, { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'coach', version: '1' } });
  else if (method === 'tools/list') send(id, { tools: COACH_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema })) });
  else if (method === 'tools/call') {
    first ||= Date.now();
    // ponytail: one round of tools, as the Worker allows: calls from one model turn land within
    // milliseconds of each other, so a call seconds later is a second round and gets turned away
    if (Date.now() - first > 1500) return reply(id, `Tools are off now. ${ANSWER_REMINDER}`, true);
    const out = runTool(params.name, params.arguments, INPUTS[user], NOW);
    appendFileSync(log, `${JSON.stringify({ name: params.name, input: params.arguments, out })}\n`);
    reply(id, `${JSON.stringify(out)}\n${ANSWER_REMINDER}`, !!out.error);
  } else if (id !== undefined) send(id, {});
});
