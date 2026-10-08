// Runs a Messages request through the Claude Code CLI (`claude -p`) on your own login, for evals
// without an API key. Same model, system prompt and user message as the Worker sends, but the CLI
// can't pin temperature and adds a few hundred tokens of its own context, so results are close to
// production, not identical: confirm with an API-key run before release.

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Body = { model: string; system?: string | { text: string }[]; messages: { content: string }[] };

// An empty folder to run in, so no project CLAUDE.md is picked up
const dir = mkdtempSync(join(tmpdir(), 'eval-cli-'));
const systemFiles = new Map<string, string>();

function systemFile(system: string) {
  let file = systemFiles.get(system);
  if (!file) {
    file = join(dir, `system-${systemFiles.size}.txt`);
    writeFileSync(file, system);
    systemFiles.set(system, file);
  }
  return file;
}

function run(model: string, system: string, user: string): Promise<{ result: string; usage: { input_tokens: number; output_tokens: number }; stop_reason: string; is_error: boolean }> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--system-prompt-file', systemFile(system), '--output-format', 'json',
      '--tools', '', '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence'];
    // Thinking off, like the Worker's plain request
    const child = spawn('claude', args, { cwd: dir, env: { ...process.env, MAX_THINKING_TOKENS: '0' } });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`claude -p exited ${code}: ${(err || out).slice(0, 300)}`));
      }
    });
    child.stdin.end(user);
  });
}

// Tokens the CLI adds to every request, measured once with a near-empty prompt
let overhead: Promise<number> | undefined;
export const cliOverhead = () => (overhead ??= run('claude-haiku-4-5', 'x', 'x').then((r) => Math.max(0, r.usage.input_tokens - 2)));

// The Anthropic response shape the eval runners read: content, usage (the CLI's own context
// subtracted, so costs read like the Worker's) and stop_reason
export async function callViaCli(body: Body) {
  const system = typeof body.system === 'string' ? body.system : (body.system ?? []).map((b) => b.text).join('\n');
  for (let attempt = 0; ; attempt++) {
    try {
      const [r, extra] = await Promise.all([run(body.model, system, body.messages[0].content), cliOverhead()]);
      if (r.is_error) throw new Error(`claude -p error: ${r.result}`.slice(0, 300));
      return {
        content: [{ type: 'text', text: r.result }],
        usage: { input_tokens: Math.max(0, r.usage.input_tokens - extra), output_tokens: r.usage.output_tokens },
        stop_reason: r.stop_reason,
      };
    } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((ok) => setTimeout(ok, 3000 * (attempt + 1)));
    }
  }
}
