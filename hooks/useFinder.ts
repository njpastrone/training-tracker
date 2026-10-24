import { useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError } from '../services/claude';
import { findNearby, mapsUrl, NoWhereError, pickEntry, type FinderResult } from '../services/finder';
import { useChatStore, type ChatItem } from '../stores/chatStore';
import { usePlacesStore, type WhereKey } from '../stores/placesStore';
import { useWorkoutStore } from '../stores/workoutStore';

export const FIND_CHIP = 'Find healthy food near me';
export const REFINE_CHIPS = ['Cheaper', 'No seed oils at all', "I'm driving"];

type NearbyItem = Extract<ChatItem, { kind: 'nearby' }>;
const nearbyById = (id: string) => useChatStore.getState().items.find((i): i is NearbyItem => i.id === id && i.kind === 'nearby');

// Find food near you, from the Chat tab: one tap runs the search and the result lands in the thread
// as a card (components/FinderCard.tsx). The first tap with nowhere set up opens Where to look.
// A where chip on the card or a follow-up chip runs it again and replaces that card's result;
// Log it writes the best pick into today's food, and tapping again takes it out.
export function useFinder() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null); // what you asked, shown while it searches
  const [error, setError] = useState<string | null>(null);
  const items = useChatStore(s => s.items);
  const hasWhere = usePlacesStore(s => s.live || s.saved.length > 0 || !!s.area?.text);

  const run = async (ask?: string, where?: WhereKey, replace?: string) => {
    if (pending) return;
    if (!hasWhere) {
      router.push('/location');
      return;
    }
    setPending(ask ?? FIND_CHIP);
    setError(null);
    try {
      const result = await findNearby({ where, ask });
      if (replace && nearbyById(replace)) useChatStore.getState().patchNearby(replace, { result, logged: undefined });
      else useChatStore.getState().add({ kind: 'you', text: ask ?? FIND_CHIP }, { kind: 'nearby', result });
    } catch (err) {
      if (err instanceof NoWhereError) return router.push('/location');
      console.error('Finder error:', err);
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Couldn't look just now, try again.");
    } finally {
      setPending(null);
    }
  };

  // The best pick into today's food log; tapping again takes it back out
  const log = (id: string) => {
    const item = nearbyById(id);
    if (!item) return;
    const { addFoodEntry, removeFoodItem } = useWorkoutStore.getState();
    if (item.logged) {
      for (const food of useWorkoutStore.getState().foodEntries.find(e => e.id === item.logged)?.items ?? []) removeFoodItem(item.logged, food.id);
      useChatStore.getState().patchNearby(id, { logged: undefined });
    } else {
      const entry = pickEntry(item.result.picks[0]);
      addFoodEntry(entry);
      useChatStore.getState().patchNearby(id, { logged: entry.id });
    }
  };

  const directions = (place: string) => Linking.openURL(mapsUrl(place)).catch(() => setError("Couldn't open Maps."));

  // Follow-up chips while the newest thing in the thread is a finder result
  const last = items[items.length - 1];
  const chips = last?.kind === 'nearby' ? REFINE_CHIPS : [];
  const refine = (ask: string) => run(ask, last?.kind === 'nearby' ? last.result.where : undefined);
  return { pending, busy: !!pending, error, clearError: () => setError(null), run, log, directions, chips, refine };
}
