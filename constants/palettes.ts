import { SKY, type SkyStops } from '../services/sky';

// Colour schemes. Every colour the tabs paint comes from one palette, light and dark each, plus its sky
// and the glow at the top of a screen. Settings › App colours picks one; `ThemeContext` hands it out.
// To add a palette: copy an entry, change the values, keep every token (services/palettes.test.mts checks).
// Both shipped palettes pass WCAG AA on every text pair (data/lt-ui-b/report.md, round 6 finals).

export type PaletteId = 'classic' | 'cool';
export const DEFAULT_PALETTE: PaletteId = 'classic';

// Classic, light: text levels, card material, the coral accent (`sunrise`), cobalt for planned, mint for the toast
const classicLight = {
  text: '#0E1430',
  textSecondary: '#3E4766',
  textTertiary: '#5F6889',
  card: 'rgba(255,255,255,0.62)',
  cardLine: 'rgba(255,255,255,0.8)',
  glass: 'rgba(255,255,255,0.5)',
  glassLine: 'rgba(255,255,255,0.85)',
  dim: 'rgba(14,20,48,0.06)',
  sunrise: '#C93F17', // the one action on a screen, done, and Training's hue
  sunriseSoft: '#FF7A4F',
  onSunrise: '#FFFFFF',
  cobalt: '#3560F0',
  indigo: '#5534C8', // you: your messages, the Chat tab
  onIndigo: '#FFFFFF',
  mint: '#13865A',
  // The twins' hues (DESIGN-SYSTEM.md, Colour): Training is coral (sunrise), Food is mint; each hero is a gradient from A to B.
  // Both light ends are held where white body text reaches 4.5:1, and hero labels are 92% white
  trainA: '#AE3410',
  trainB: '#C73F15',
  trainSoft: 'rgba(232,98,47,0.16)',
  food: '#0B7A57',
  foodA: '#075C43',
  foodB: '#0C7E5C',
  foodSoft: 'rgba(14,143,102,0.16)',
  chatSoft: 'rgba(85,52,200,0.14)',
  onHero: '#FFFFFF',
  onHeroSoft: 'rgba(255,255,255,0.92)',
  heroTrack: 'rgba(255,255,255,0.22)',
  error: '#D70015',
  warning: '#B25E00',
  // Solid surfaces: Reduce Transparency, sheets, and screens not yet on the sky
  background: '#F6F5FF',
  surface: '#F7F9FF',
  border: '#D5DCEF',
  disabled: '#A3AAC4',
  overlay: 'rgba(14,20,48,0.4)',
};

export type Tokens = typeof classicLight;

// Classic, dark: always night
const classicDark: Tokens = {
  text: '#F3F5FF',
  textSecondary: '#B0B7D6',
  textTertiary: '#8E96BD',
  card: 'rgba(255,255,255,0.075)',
  cardLine: 'rgba(255,255,255,0.13)',
  glass: 'rgba(255,255,255,0.10)',
  glassLine: 'rgba(255,255,255,0.18)',
  dim: 'rgba(255,255,255,0.06)',
  sunrise: '#FF7F57',
  sunriseSoft: '#FF9D7A',
  onSunrise: '#2A1208',
  cobalt: '#8EA6FF',
  indigo: '#A995FF',
  onIndigo: '#0A1030',
  mint: '#52D9A0',
  trainA: '#A12E0B',
  trainB: '#C0471A',
  trainSoft: 'rgba(255,127,87,0.2)',
  food: '#3BE2A3',
  foodA: '#075841',
  foodB: '#0D7E5C',
  foodSoft: 'rgba(59,226,163,0.18)',
  chatSoft: 'rgba(169,149,255,0.18)',
  onHero: '#FFFFFF',
  onHeroSoft: 'rgba(255,255,255,0.92)',
  heroTrack: 'rgba(255,255,255,0.22)',
  error: '#FF6961',
  warning: '#FFB340',
  background: '#1E1A44',
  surface: '#1C2142',
  border: '#2E3460',
  disabled: '#5A6189',
  overlay: 'rgba(0,0,0,0.6)',
};

// Deep and cool, light: Training deep indigo (`sunrise` keeps its name), Food teal, you a clear blue, a cool off-white
const coolLight: Tokens = {
  text: '#121633',
  textSecondary: '#404A6E',
  textTertiary: '#5E688C',
  card: 'rgba(255,255,255,0.62)',
  cardLine: 'rgba(255,255,255,0.8)',
  glass: 'rgba(255,255,255,0.5)',
  glassLine: 'rgba(255,255,255,0.85)',
  dim: 'rgba(14,20,48,0.06)',
  sunrise: '#4E38CA',
  sunriseSoft: '#8E7CF0',
  onSunrise: '#FFFFFF',
  cobalt: '#3560F0',
  indigo: '#2E5FD4',
  onIndigo: '#FFFFFF',
  mint: '#13865A',
  trainA: '#3A2A9C',
  trainB: '#5A3FCF',
  trainSoft: 'rgba(78,56,202,0.16)',
  food: '#0B7570',
  foodA: '#0A5A57',
  foodB: '#0B726B',
  foodSoft: 'rgba(11,117,112,0.16)',
  chatSoft: 'rgba(46,95,212,0.14)',
  onHero: '#FFFFFF',
  onHeroSoft: 'rgba(255,255,255,0.92)',
  heroTrack: 'rgba(255,255,255,0.22)',
  error: '#D70015',
  warning: '#B25E00',
  background: '#F3F4FB',
  surface: '#F5F7FD',
  border: '#D3D9EC',
  disabled: '#A3AAC4',
  overlay: 'rgba(14,20,48,0.4)',
};

// Deep and cool, dark: near-navy
const coolDark: Tokens = {
  text: '#F2F4FF',
  textSecondary: '#B3BBDC',
  textTertiary: '#8690B8',
  card: 'rgba(255,255,255,0.075)',
  cardLine: 'rgba(255,255,255,0.13)',
  glass: 'rgba(255,255,255,0.10)',
  glassLine: 'rgba(255,255,255,0.18)',
  dim: 'rgba(255,255,255,0.06)',
  sunrise: '#A08CFF',
  sunriseSoft: '#B9A9FF',
  onSunrise: '#120C33',
  cobalt: '#8EA6FF',
  indigo: '#8FB3FF',
  onIndigo: '#0A1030',
  mint: '#52D9A0',
  trainA: '#3B2BAC',
  trainB: '#6246DA',
  trainSoft: 'rgba(160,140,255,0.2)',
  food: '#3ED1C2',
  foodA: '#0A5955',
  foodB: '#0C756D',
  foodSoft: 'rgba(62,209,194,0.18)',
  chatSoft: 'rgba(143,179,255,0.18)',
  onHero: '#FFFFFF',
  onHeroSoft: 'rgba(255,255,255,0.92)',
  heroTrack: 'rgba(255,255,255,0.22)',
  error: '#FF6961',
  warning: '#FFB340',
  background: '#0F1430',
  surface: '#131A3A',
  border: '#273066',
  disabled: '#5A6189',
  overlay: 'rgba(0,0,0,0.6)',
};

export interface SkyPalette {
  dawn: SkyStops;
  day: SkyStops;
  dusk: SkyStops;
  night: SkyStops;
}

export interface Palette {
  id: PaletteId;
  name: string; // as Settings shows it
  light: Tokens;
  dark: Tokens;
  sky: SkyPalette; // the gradients the week paints (services/sky.ts)
  glow: { light: string; dark: string }; // the soft wash at the top right of every screen (components/Sky.tsx)
}

export const PALETTES: Record<PaletteId, Palette> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    light: classicLight,
    dark: classicDark,
    sky: SKY,
    glow: { light: 'rgba(255,248,232,0.75)', dark: 'rgba(42,39,102,0.9)' },
  },
  cool: {
    id: 'cool',
    name: 'Deep and cool',
    light: coolLight,
    dark: coolDark,
    // A cool sky: dawn is lavender-grey, day a clear periwinkle, dusk a muted mauve, night near-navy
    sky: {
      dawn: ['#C7CCEE', '#DADDF5', '#EAECFA', '#F3F4FB'],
      day: ['#93ADFF', '#BFCDFF', '#E0E6FF', '#F3F4FB'],
      dusk: ['#AFA2E3', '#C7BFEC', '#E1DDF5', '#F2F1FA'],
      night: ['#060A20', '#0C1232', '#141B46', '#0F1430'],
    },
    glow: { light: 'rgba(236,240,255,0.75)', dark: 'rgba(20,27,70,0.9)' },
  },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
export const paletteOf = (id: string | undefined): Palette => PALETTES[(id as PaletteId) in PALETTES ? (id as PaletteId) : DEFAULT_PALETTE];
