import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { CoachCards, CoachReply } from '../services/ask';
import type { EntryRef } from '../services/moveLog';

// The Chat tab's thread: your log as one conversation, kept on this phone (and in backups) until
// cleared. Only finished things land here: what you sent plus what came of it. Log and plan items
// point to the real records, so an edit or a delete shows; nothing is copied.

export interface CoachTurnState {
  reply: CoachReply;
  raw: string; // the checked reply, sent back with later questions today
  cards?: CoachCards;
  planned?: string; // the date a suggested workout was planned for
  templateId?: string; // the template made from the suggested workout, reused on another tap
  logged?: string[]; // ids of the meal entries logged from this answer, by meal index
  remembered?: boolean | 'no'; // the remember chip's answer
  chartExerciseId?: string; // the one lift the question named, drawn from the log
}

type Stamp = { id: string; at: string };
export type NewChatItem =
  | { kind: 'you'; text: string }
  | { kind: 'logged'; workoutIds: string[]; foodEntryIds: string[]; day: string }
  | { kind: 'planned'; dates: string[]; planId?: string }
  | { kind: 'moved'; entry: EntryRef; from: string; to: string; label: string } // label: what it was called when moved
  | { kind: 'answer'; question: string; turn: CoachTurnState };
export type ChatItem = NewChatItem & Stamp;

interface ChatState {
  items: ChatItem[];
  skippedOpener?: string; // the day "Not today" was tapped
  add: (...items: NewChatItem[]) => void;
  patch: (id: string, change: Partial<CoachTurnState>) => void;
  skipOpener: (day: string) => void;
  clear: () => void;
}

export const CHAT_KEY = '@training-tracker/chat';

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      items: [],
      add: (...items) => {
        const at = new Date().toISOString();
        set((s) => ({ items: [...s.items, ...items.map((i) => ({ ...i, id: uuidv4(), at }) as ChatItem)] }));
      },
      patch: (id, change) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id && i.kind === 'answer' ? { ...i, turn: { ...i.turn, ...change } } : i)) })),
      skipOpener: (day) => set({ skippedOpener: day }),
      clear: () => set({ items: [], skippedOpener: undefined }),
    }),
    {
      name: CHAT_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items, skippedOpener: s.skippedOpener }),
    }
  )
);
