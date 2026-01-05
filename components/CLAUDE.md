# Components Directory

Reusable UI components for the Training Tracker app.

## Components
- `WorkoutInput.tsx`: Natural language input box with submit button
- `WorkoutCard.tsx`: Displays a single workout summary
- `WorkoutList.tsx`: Scrollable list of WorkoutCard components
- `Calendar.tsx`: Calendar heatmap showing workout frequency
- `ComingSoon.tsx`: Placeholder for features in development

## Conventions
- All components are functional with TypeScript
- Props interfaces defined at top of file
- Use React Native Paper components as base
- Styles defined with StyleSheet.create() at bottom
- Export default for main component

## Example Structure
```typescript
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  title: string;
}

export default function MyComponent({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```
