// What an app built before parse mode sends (2026-10-04, between #6 and #8): its own log-parsing prompt
// through the pass-through path. A `--parser` for the parse eval, so the old prompt is scored on the
// pass-through model with the parse cases:
//   npm run eval:parse -- --cli --parser ../planner/legacy.ts --effort medium
//   npm run eval:parse -- --cli --parser ../planner/legacy.ts --model claude-haiku-4-5-20251001
// The prompt is read from git (services/claude.ts at 86645ec), so nothing is copied here.
import { execFileSync } from 'node:child_process';
import { PASSTHROUGH } from '../../server/src/index.ts';
import type { ParseOptions } from '../../server/src/parse.ts';
export { finalizeWithNames } from '../../server/src/parse.ts';

const old = execFileSync('git', ['show', '86645ec:services/claude.ts'], { encoding: 'utf8' });
const between = (from: string, to: string) => {
  const start = old.indexOf(from) + from.length;
  return old.slice(start, old.indexOf(to, start));
};
const SYSTEM_PROMPT = between('const SYSTEM_PROMPT = `', '`;\n');
const USER_MESSAGE = between('callClaude(SYSTEM_PROMPT, `', '`, 1024)'); // holds ${input}

export function buildParseRequest(input: string, _options: ParseOptions) {
  // No effort here: the parse eval's --effort sets it, and Haiku 4.5 takes none
  return { model: PASSTHROUGH.model, max_tokens: PASSTHROUGH.max_tokens, system: SYSTEM_PROMPT, messages: [{ role: 'user' as const, content: USER_MESSAGE.replace('${input}', input) }] };
}

export function buildCorrectionRequest(): never {
  throw new Error('apps from before parse mode had no correction mode');
}
