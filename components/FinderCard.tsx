import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, spacing } from '../constants/theme';
import { PREFERENCE_LABEL, tally, type FinderPick, type PickVerdict } from '../server/src/finder';
import type { FinderResult } from '../services/finder';
import { usePlacesStore, whereChoices, type WhereKey } from '../stores/placesStore';
import { SkyCard } from './Sky';
import { Pill } from './Glass';
import LogoMark from './LogoMark';

interface Props {
  result: FinderResult;
  logged?: boolean;
  busy?: boolean;
  onWhere: (where: WhereKey) => void; // runs it again from another place
  onDirections: (place: string) => void;
  onLog: () => void;
}

const miles = (m: number) => `${(m / 1609.344).toFixed(1)} mi`;
const price = (p: number) => `~$${p % 1 ? p.toFixed(2) : p}`;

// The one-button finder's answer (data/lt-ui-g, g-nearby): where it looked, one best pick with its order,
// price and a scorecard of hits and misses per preference, Directions and Log it, then the other picks as
// rows. Every number is an estimate and reads like one; a miss is a warning dash, never red; a verdict the
// place doesn't publish is grey "unknown". No health claims anywhere: the phone's fixed phrases only.
export default function FinderCard({ result, logged, busy, onWhere, onDirections, onLog }: Props) {
  const { colors } = useTheme();
  const places = usePlacesStore();
  const choices = whereChoices(places);
  const [best, ...rest] = result.picks;
  const t = tally(best.verdicts);
  const header = result.walkMinutes ? `Best within a ${result.walkMinutes}-minute walk of` : 'Best within a short drive of';
  return (
    <Animated.View entering={FadeInDown.springify().damping(17)}>
      <SkyCard accessibilityLiveRegion="polite">
        <View style={styles.top}>
          <LogoMark size={18} color={colors.sunrise} />
          <Text variant="titleMedium" style={[styles.fill, { color: colors.text }]}>{header}</Text>
        </View>
        <View style={styles.chips}>
          {choices.map(c => {
            const on = c.key === result.where;
            return (
              <Pressable
                key={c.key}
                onPress={() => !on && !busy && onWhere(c.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !!busy }}
                accessibilityLabel={`Look near ${c.label}`}
                style={[styles.chip, on ? { backgroundColor: colors.text } : { backgroundColor: colors.dim }]}
              >
                {on && <SymbolView name="checkmark" size={11} weight="bold" tintColor={colors.surface} />}
                <Text style={[styles.chipLabel, { color: on ? colors.surface : colors.text }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.placeRow}>
          <Text variant="headlineSmall" style={[styles.fill, { color: colors.text }]}>{best.place}</Text>
          {best.minutes !== undefined && best.distanceM !== undefined && (
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{best.minutes} min · {miles(best.distanceM)}</Text>
          )}
        </View>
        <Text variant="bodyLarge" style={{ color: colors.text }}>{best.item}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.text }]}>{price(best.price)}</Text>
          <Text style={[styles.likely, { color: colors.sunrise }]}>
            Likely hits {t.hits} of {t.of}{t.unknown ? ` · ${t.unknown} unknown` : ''}
          </Text>
        </View>
        {best.why ? <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>{best.why}</Text> : null}

        <Scorecard pick={best} />

        <View style={styles.actions}>
          <Pill icon="mappin.and.ellipse" size="small" label="Directions" onPress={() => onDirections(best.place)} />
          <Pill icon={logged ? 'arrow.uturn.backward' : 'checkmark'} variant="glass" size="small" label={logged ? 'Logged · Undo' : 'Log it when eaten'} onPress={onLog} />
        </View>

        {rest.map((p, i) => {
          const pt = tally(p.verdicts);
          const miss = p.verdicts.find(v => v.verdict === 'miss');
          const unknown = p.verdicts.find(v => v.verdict === 'unknown');
          const note = miss ? `${PREFERENCE_LABEL[miss.preference].toLowerCase()}: no${miss.reason ? ` · ${miss.reason}` : ''}` : unknown ? `${PREFERENCE_LABEL[unknown.preference].toLowerCase()} unknown` : '';
          return (
            <Pressable key={i} onPress={() => onDirections(p.place)} accessibilityRole="button" accessibilityLabel={`${p.place}, ${p.item}. Open in Maps`} style={[styles.row, { borderTopColor: colors.dim }]}>
              <View style={styles.fill}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {p.place}{p.minutes !== undefined ? ` · ${p.minutes} min` : ''}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {p.item} · likely {pt.hits} of {pt.of}{note ? ` · ${note}` : ''}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowPrice, { color: colors.text }]}>{price(p.price)}</Text>
                {p.confidence < 0.6 && <Text variant="labelSmall" style={{ color: colors.textTertiary }}>a guess</Text>}
              </View>
            </Pressable>
          );
        })}

        <Text variant="bodySmall" style={[styles.fine, { color: colors.textTertiary }]}>
          {result.guessed
            ? `No place list this time: these are places the AI knows in ${result.whereLabel}, so check they're still there. `
            : 'Estimates from what these places usually serve, not exact nutrition; an independent place is a guess from the kind of place it is. '}
          "Spike" is a judgment from carbs, not a medical measure. Oils are as the restaurant publishes them, or unknown.
          {result.guessed ? '' : ' Places from Apple Maps on your iPhone.'}
        </Text>
      </SkyCard>
    </Animated.View>
  );
}

// "~48 g protein", "Low spike likely · no rice": the fixed phrase per preference and verdict, then the model's reason
function verdictLine(v: PickVerdict, pick: FinderPick): { title: string; sub?: string } {
  const reason = v.reason;
  const label = PREFERENCE_LABEL[v.preference];
  if (v.verdict === 'unknown') return { title: `${label} unknown`, sub: reason || 'not published' };
  const hit = v.verdict === 'hit';
  switch (v.preference) {
    case 'high_protein': return { title: `~${Math.round(pick.protein)} g protein`, sub: hit ? undefined : reason || 'under 30 g' };
    case 'low_spike': return { title: hit ? 'Low spike likely' : 'Spike likely', sub: reason || `~${Math.round(pick.carbs)} g carbs` };
    case 'simple': return { title: hit ? 'Simple' : 'Not simple', sub: reason || undefined };
    case 'no_seed_oils': return { title: hit ? 'No seed oils' : 'Seed oils likely', sub: reason || undefined };
    case 'cheap': return { title: price(pick.price), sub: reason || (hit ? 'on budget' : 'over budget') };
    case 'low_calorie': return { title: `~${Math.round(pick.kcal).toLocaleString('en-US')} kcal`, sub: hit ? undefined : reason || 'over 600' };
    case 'high_fiber': return { title: pick.fiber !== undefined ? `~${Math.round(pick.fiber)} g fiber` : 'Fiber', sub: reason || undefined };
  }
}

// One row per preference: a sunrise check, a warning dash for a miss, a grey ring for unknown
function Scorecard({ pick }: { pick: FinderPick }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {pick.verdicts.map(v => {
        const line = verdictLine(v, pick);
        const hit = v.verdict === 'hit';
        const miss = v.verdict === 'miss';
        return (
          <View key={v.preference} style={styles.cell} accessible accessibilityLabel={`${PREFERENCE_LABEL[v.preference]}: ${v.verdict}. ${line.title}${line.sub ? `, ${line.sub}` : ''}`}>
            <View style={[styles.mark, hit ? { backgroundColor: colors.sunrise } : miss ? { backgroundColor: colors.warning + '33' } : { borderWidth: 2, borderColor: colors.textTertiary }]}>
              {hit ? <SymbolView name="checkmark" size={11} weight="bold" tintColor={colors.onSunrise} /> : miss ? <SymbolView name="minus" size={11} weight="bold" tintColor={colors.warning} /> : null}
            </View>
            <View style={styles.fill}>
              <Text variant="bodyMedium" style={{ color: colors.text, fontWeight: '600' }}>{line.title}</Text>
              {line.sub ? <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{line.sub}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.gap },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, borderRadius: 999, paddingHorizontal: 12 },
  chipLabel: { fontFamily: fonts.rounded, fontSize: 14, fontWeight: '700' },
  placeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  price: { fontFamily: fonts.rounded, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  likely: { fontFamily: fonts.rounded, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.gap, rowGap: 10 },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingRight: spacing.sm },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderTopWidth: 1, marginTop: spacing.sm },
  rowRight: { alignItems: 'flex-end' },
  rowPrice: { fontFamily: fonts.rounded, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  fine: { marginTop: spacing.gap },
});
