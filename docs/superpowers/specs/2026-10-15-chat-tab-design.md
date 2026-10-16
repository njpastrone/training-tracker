# Chat tab

Date: 2026-10-15 · Status: approved 2026-10-16
Mockup: "Chat tab · your log as a thread" on the LiftText design directions canvas (https://claude.ai/artifact/ML7Z1yCk1yGeQqAAHp2HNL).
Builds on `main` after #42 (Ask the coach, Phase 0). Ships after the Daylight polish.

## Goal

Replace the Settings tab with a Chat tab. Chat is your log as one thread: everything typed into any bar lands there with the app's replies. Questions get answered from your own data. Settings moves behind a gear. At the same time, give the app's many chat entry points one simple system.

## Why this isn't the old Coach tab again

- 902c528 removed a Coach tab whose letter grades and AI weekly report/chat were the weak part; the owner picked a no-AI Progress screen instead.
- On 14 Oct the owner chose an Ask sheet from Progress over a fifth tab, and the coach research's lesson was "contextual chips over a generic chat tab" (a blank chat box is the generic pattern every wearable ships).
- bb8f5c5 merged three composers into one shared `ChatBar`.

This design keeps four tabs, is never a blank chat (it's your record, opening on something timely), and reduces entry points rather than adding one. It supersedes decision 2 of the coach report (the Ask sheet) and its "transcripts not kept" rule: the thread is now kept, on the phone only.

## The entry-point system

Today on `main`: Log bar, History bar, Progress bar, Progress's Ask pill, the Ask sheet with its own composer, the Quick-add screen, and fix boxes on saved workouts and food.

**One rule: type in any bar. Results show where you are, then land in Chat. Answers always show in Chat.**

| Bar | Placeholder | A question | Anything else |
|---|---|---|---|
| Log | "What'd you do or eat today?" | goes to Chat | log (review card on Log) |
| History | "Plan your week…" | goes to Chat | plan (PlanCard on History) |
| Progress | "Forgot something? 'legs on Wed'" | goes to Chat | late add (review card on Progress) |
| Chat | "Log something or ask" | answered in the thread | starts with "plan" → plan; else log (cards in the thread) |

- A question is decided by the existing `routeComposer` in `services/ask.ts` (`readsAsQuestion` first, `looksLikeQuestion` after the parser finds nothing). History's bar gets the same routing it lacks today.
- A question from another tab switches to the Chat tab and is asked there (replaces `router.push('/ask', { question })`).
- While a review card or PlanCard is open, every bar fixes it, as today (`logBar`).
- Removed: the Progress Ask pill (title slot left empty) and `app/ask.tsx`.
- Kept as they are: Quick-add (it's a shortcut target, log only) and the fix boxes on a saved workout or food entry (they edit one record; their fixes aren't added to the thread).

## Tabs and Settings

- Tabs: Log · History · Progress · Chat. Chat icon `bubble.left.and.text.bubble.right` (md `chat`). `app/(tabs)/settings.tsx` → `app/(tabs)/chat.tsx`.
- Settings moves unchanged to `app/settings.tsx`, a pushed stack screen. It opens from a gear `HeaderButton` in Chat's `LargeTitle` right slot (Chat only).
- Settings gains one row under Data: **Clear chat** (confirm, then empties the thread; workouts and food are untouched). "Clear all data" also clears the thread. The privacy line adds: "Chat history is saved only on this phone."

## The thread

### Storage

A new store, `stores/chatStore.ts`, Zustand `persist` on its own AsyncStorage key `@training-tracker/chat`, so a new message doesn't rewrite the big workout blob.

```ts
type ChatItem =
  | { id: string; at: string; kind: 'you'; text: string }
  | { id: string; at: string; kind: 'logged'; workoutIds: string[]; foodEntryIds: string[]; day: string }
  | { id: string; at: string; kind: 'planned'; dates: string[] }
  | { id: string; at: string; kind: 'answer'; reply: CoachReply; chartExerciseId?: string };

interface ChatState {
  items: ChatItem[];
  skippedOpener?: string; // the day "Not today" was tapped
  add(...items: ChatItem[]): void;
  clear(): void;
}
```

- Kept forever. About 200 bytes an item; ten a day is under 1 MB a year. The screen renders the newest 100 with "Show earlier" above them (ponytail: page from the store if a long thread ever gets slow).
- `logged` and `planned` point to the real records. Cards read them live from `workoutStore`, so an edit shows and a deleted workout shows as "Deleted". Nothing is copied.
- Only finished things are added: the text you sent plus the result, once saved, planned or answered. Draft fixes, parse errors and abandoned drafts aren't kept.
- Backup: `services/backup.ts` adds `@training-tracker/chat` to its keys. It's optional on restore, so older backups restore with an empty thread. The backup summary counts messages.

### Who writes to it

- `useLogDraft.save` → `you` (the original text) + `logged`. This covers Log, Progress late adds and Chat.
- `usePlanner` save → `you` + `planned`.
- The coach → `you` + `answer`.

### Rendering (Chat tab)

Built on `ChatScreen` with `follow`, like `app/ask.tsx` today:

- Day separators ("Yesterday · 6:30 pm") when 30+ minutes pass between items.
- `you` → `UserBubble`.
- `logged` → "Logged · Push" card: muscle dots and exercise count, plus food totals if there's food; "Open ›" opens the workout (or the day screen when it's food only). The title comes from the existing workout naming used on History.
- `planned` → "Planned · Legs, Thu" with "Open ›" to that day.
- `answer` → `CoachCard`, plus a chart when `chartExerciseId` is set.

## The coach

- Reuses `askCoach` (`services/ask.ts`), the Worker's coach mode, `coachPack` and `coachGuards` unchanged. Sonnet 5.5, 4-week summary up front, no tools.
- Thread context: only today's last 6 question/answer pairs are sent back (well under the Worker's 24-message limit). Older answers stay visible but aren't sent. This replaces `useCoach`'s per-visit thread and its 12-turn "Start over".
- **Charts are drawn on the phone.** If a question names exactly one exercise you've logged with weights (matched through `exerciseIdentity`), the answer gets `chartExerciseId` and the card draws the last 5 sessions' top sets from `services/progress.ts`, with a "175 → 190 lb · 3×8" caption. The model never supplies chart numbers. No Worker, prompt or eval change.
- Follow-up chips after an answer are the coach's own `chips`, as today.

### AI cost and limits

- One question = one device slot (20 a day, shared with parsing), exactly as today. Questions the regex can't place still cost two (parse, then coach); unchanged.
- Opening the tab, the opener, the chips, log and plan cards and charts cost nothing: all on the phone.
- When the cap is hit, the Worker's message shows as the bar's error, as today.
- What leaves the phone is unchanged: the question, the 4-week summary and today's last 6 pairs. The thread itself never leaves the phone. The consent sheet copy doesn't change.

## The opener

A card at the bottom of the thread, written on the phone, never stored. The first rule that applies wins:

1. **Planned today and not logged yet** (and not skipped today) → "Legs is planned for today." plus one line from the digest when true ("Quads haven't been trained in the last 7 days."). **Start legs** opens that template's review card in the thread (`log.startFromTemplate`, same as Log). **Not today** sets `skippedOpener` to today and hides the card; the schedule isn't changed.
2. **5+ days since the last workout, with a usual week** → "6 days since your last workout. Start with whatever has rested longest." Chips: "What should I start with?"
3. **Empty thread** → "Tell me what you did or ate, or ask about your training."
4. Otherwise, no card.

Wording follows the coach's voice: "the last 7 days", never "this week"; no exclamation marks.

**Chips on Chat** are questions from your own log (new `askChips` in `services/suggestions.ts`): your most-logged lift ("Is my bench stuck?"), "What should I train tomorrow?", and "How's my protein?" when you have a protein goal. For new users, the Ask sheet's `STARTERS` instead.

## Files

- New: `app/(tabs)/chat.tsx`, `stores/chatStore.ts`, `components/ThreadCards.tsx` (logged, planned and opener cards), `services/opener.ts` (pure: picks the opener from store data).
- Moved: `app/(tabs)/settings.tsx` → `app/settings.tsx`.
- Changed: `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `history.tsx`, `progress.tsx` (questions → Chat; Ask pill removed), `hooks/useLogDraft.ts` and `hooks/usePlanner.ts` (append on save), `hooks/useCoach.ts` (thread from the store), `components/CoachCard.tsx` (optional chart), `services/suggestions.ts` (`askChips`), `services/backup.ts`, `app/_layout.tsx` (settings route in, ask route out).
- Deleted: `app/ask.tsx`.
- Docs: README, CLAUDE.md feature list, DESIGN-SYSTEM.md (Chat tab, gear), FEATURES.md.

## Testing

- `services/opener.test.mts`: each rule, the order between them, skipped today, and a deleted plan.
- `services/suggestions.test.mts`: `askChips` for names-only, numbered and new users.
- `services/backup.test.mts`: a backup with and without the chat key restores.
- Chat store: adding, clearing, and that "Clear all data" clears it.
- Routing: a History-bar question goes to Chat, not the planner.
- Simulator: log on Log → card appears in Chat; ask on Progress → switches to Chat and answers; "is my bench stuck?" shows a chart; delete the workout → its card says Deleted; Start / Not today; gear → Settings → Clear chat; backup round trip.
- OTA only: no new native modules.

## Out of scope

- AI-written openers, notifications, coach tools and memory (later coach phases).
- Searching the thread.
- Adding fix-box edits to the thread.
- A gear on the other tabs.
