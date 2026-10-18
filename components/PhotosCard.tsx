import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { SkyCard, SectionLabel } from './Sky';
import Row from './Row';
import { photoSummary } from '../services/photos';
import { spacing } from '../constants/theme';

// The way into progress photos from Progress: locked, showing only how many and the latest date. No photo
// ever shows outside the Photos screen.
export default function PhotosCard() {
  const router = useRouter();
  const [{ count, last }, setSummary] = useState(photoSummary);
  useFocusEffect(useCallback(() => setSummary(photoSummary()), []));

  return (
    <>
      <SectionLabel style={styles.label}>Progress photos</SectionLabel>
      <SkyCard style={styles.card}>
        <Row
          first
          icon="lock.fill"
          title={count && last ? `${count} ${count === 1 ? 'photo' : 'photos'} · last ${format(parseISO(last), 'MMM d')}` : 'Take your first progress photo'}
          subtitle="Locked with Face ID · only on this iPhone"
          onPress={() => router.push('/photos')}
        />
      </SkyCard>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    marginHorizontal: spacing.xs,
    marginTop: spacing.gap,
    marginBottom: spacing.sm,
  },
  card: {
    paddingVertical: spacing.xs,
  },
});
