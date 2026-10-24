import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Where to look for food nearby (app/location.tsx): the three ways to say where you are, kept on this
// phone only. This key is deliberately not in services/backup.ts BACKUP_KEYS, so addresses and the typed
// area never land in a backup file, and nothing here is ever sent to our server (services/finder.ts sends
// place names, not where they were looked for).

export interface SavedPlace {
  label: 'Home' | 'Work';
  address: string; // as typed
  lat: number;
  lon: number; // geocoded once on the phone
}
export interface Area {
  text: string; // "East Village, NYC"
  lat?: number;
  lon?: number; // geocoded on the phone; unset when the geocoder found nothing (then only the words are used)
}
export type WhereKey = 'live' | 'Home' | 'Work' | 'area';

interface PlacesState {
  live: boolean; // "Where I am right now" is on (permission was granted once)
  saved: SavedPlace[];
  area?: Area;
  last?: WhereKey; // the chip used last time
  setLive: (on: boolean) => void;
  savePlace: (place: SavedPlace) => void;
  removePlace: (label: SavedPlace['label']) => void;
  setArea: (area?: Area) => void;
  setLast: (last: WhereKey) => void;
  clear: () => void;
}

export const PLACES_KEY = '@training-tracker/places';

export const usePlacesStore = create<PlacesState>()(
  persist(
    (set) => ({
      live: false,
      saved: [],
      setLive: (live) => set({ live }),
      savePlace: (place) => set((s) => ({ saved: [...s.saved.filter((p) => p.label !== place.label), place].sort((a, b) => a.label.localeCompare(b.label)) })),
      removePlace: (label) => set((s) => ({ saved: s.saved.filter((p) => p.label !== label) })),
      setArea: (area) => set({ area }),
      setLast: (last) => set({ last }),
      clear: () => set({ live: false, saved: [], area: undefined, last: undefined }),
    }),
    {
      name: PLACES_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ live: s.live, saved: s.saved, area: s.area, last: s.last }),
    }
  )
);

// The chips the finder card offers, in order, from what's set up: saved places, live location, the area
export function whereChoices(s: Pick<PlacesState, 'live' | 'saved' | 'area'>): { key: WhereKey; label: string }[] {
  return [
    ...s.saved.map((p) => ({ key: p.label, label: p.label })),
    ...(s.live ? [{ key: 'live' as const, label: 'Where I am' }] : []),
    ...(s.area?.text ? [{ key: 'area' as const, label: s.area.text.split(',')[0].trim() }] : []),
  ];
}
