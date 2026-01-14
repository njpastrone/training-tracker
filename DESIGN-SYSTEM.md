# Training Tracker Design System

This document establishes design standards and component conventions for the Training Tracker app to ensure consistency across all screens and components.

## Core Principles

- **Consistency**: Same visual patterns throughout the app
- **Accessibility**: Clear text, proper contrast, appropriate touch targets
- **Performance**: Efficient component reuse and standardized styles
- **Maintainability**: Centralized design decisions

## Theme System

### Colors
Defined in `constants/theme.ts`:
- **Primary**: `#FF6B35` (Energetic Orange) - Main brand color for actions
- **Secondary**: `#00E676` (Bright Green) - Success states, positive actions
- **Background**: `#121212` (Dark) / `#FAFAFA` (Light)
- **Surface**: `#1E1E1E` (Dark) / `#FFFFFF` (Light) - Cards, surfaces
- **Text**: Use `colors.text`, `colors.textSecondary`, `colors.textTertiary`

### Spacing Scale
```typescript
spacing = {
  xs: 4,    // Tight spacing
  sm: 8,    // Small gaps
  md: 16,   // Standard spacing (most common)
  lg: 24,   // Large spacing
  xl: 32,   // Extra large
  xxl: 48   // Maximum spacing
}
```

### Typography
Use React Native Paper text variants:
- `headlineSmall`: Page titles
- `titleLarge`: Section headers (workout dates)
- `titleMedium`: Subsection headers, card titles
- `bodyLarge`: Primary content
- `bodyMedium`: Standard text
- `bodySmall`: Secondary text, metadata

## Component Standards

### Chips (Tags)

#### Muscle Group Chips
**Standard Usage**: WorkoutCard, GroupedWorkoutCard, Templates
```tsx
<Chip 
  compact 
  style={{ height: 32 }}
  textStyle={{ 
    fontSize: 12, 
    fontWeight: '600',
    textTransform: 'capitalize' 
  }}
>
  {muscleGroup}
</Chip>
```

#### Compact Chips
**Usage**: Recurring patterns, status indicators
```tsx
<Chip 
  compact 
  style={{ height: 24 }}
  textStyle={{ fontSize: 11 }}
>
  {status}
</Chip>
```

### Buttons

#### Primary Actions
```tsx
<Button 
  mode="contained" 
  style={{ marginTop: spacing.xs }}
  contentStyle={{ paddingVertical: spacing.xs }}
>
  Primary Action
</Button>
```

#### Secondary Actions
```tsx
<Button 
  mode="outlined"
  textColor={colors.textSecondary}
>
  Secondary Action
</Button>
```

### Icons

#### Standard Sizes
- **Small**: `size={20}` - Navigation arrows, inline icons
- **Medium**: `size={24}` - Main action icons, calendar, edit/delete
- **Large**: `size={64}` - Feature illustrations, empty states

#### IconButton Usage
```tsx
<IconButton
  icon="edit-outline"
  size={20}
  onPress={handleEdit}
/>
```

### Cards

#### Standard Card
```tsx
<Surface 
  style={[
    {
      borderRadius: 16,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.surface 
    }
  ]} 
  elevation={1}
>
  {/* Card content */}
</Surface>
```

#### Input Section Card
```tsx
<Surface 
  style={[
    {
      padding: spacing.lg,
      borderRadius: 16,
      marginBottom: spacing.lg,
      backgroundColor: colors.surface 
    }
  ]} 
  elevation={1}
>
  {/* Input content */}
</Surface>
```

## Layout Patterns

### Screen Container
```tsx
<SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['bottom']}>
  <ScrollView 
    style={styles.scrollView}
    contentContainerStyle={{ padding: spacing.md }}
  >
    {/* Screen content */}
  </ScrollView>
</SafeAreaView>
```

### Header with Back Button
```tsx
<View style={styles.titleRow}>
  <IconButton
    icon="arrow-left"
    size={24}
    onPress={() => router.back()}
    style={{ marginLeft: -8, marginRight: spacing.xs }}
  />
  <Text variant="headlineSmall" style={{ fontWeight: '600', color: colors.text }}>
    Screen Title
  </Text>
</View>
```

### Section Headers
```tsx
<Text variant="titleMedium" style={[
  { 
    color: colors.text, 
    fontWeight: '600',
    marginBottom: spacing.md 
  }
]}>
  Section Title
</Text>
```

## Common Patterns

### Empty States
```tsx
<Surface 
  style={[
    {
      padding: spacing.xl,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.surface 
    }
  ]} 
  elevation={0}
>
  <Text variant="bodyMedium" style={{ 
    color: colors.textSecondary, 
    textAlign: 'center' 
  }}>
    Empty state message
  </Text>
</Surface>
```

### Loading States
```tsx
<Button
  mode="contained"
  loading={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Processing...' : 'Action Text'}
</Button>
```

### Muscle Group Color Coding
Use `muscleGroupColors` from `constants/theme.ts` for consistent color mapping:
```typescript
const chipColor = muscleGroupColors[muscleGroup] || colors.primary;
```

## Best Practices

### Do's ✅
- Use spacing scale values (`spacing.md`) instead of hardcoded numbers
- Apply `textTransform: 'capitalize'` to muscle group displays
- Use consistent chip heights: 32px for main views, 24px for compact
- Follow the established card padding: `spacing.md` for content, `spacing.lg` for input sections
- Use Paper text variants instead of custom font sizes
- Apply proper text colors: `colors.text`, `colors.textSecondary`, etc.

### Don'ts ❌
- Don't use arbitrary spacing values (avoid `margin: 15` - use `spacing.md`)
- Don't mix different chip heights in the same context
- Don't hardcode colors - use theme colors
- Don't create custom text styles when Paper variants exist
- Don't forget `textTransform: 'capitalize'` on muscle group chips
- Don't use inconsistent border radius values

## File Structure Standards

### Component Files
```typescript
// ComponentName.tsx
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../constants/theme';

interface ComponentProps {
  // Props interface at top
}

export default function Component({ prop }: ComponentProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Component JSX */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Styles at bottom
  },
});
```

### Style Naming
- Use descriptive names: `templateCard` not `card1`
- Follow BEM-like pattern: `templateCard`, `templateHeader`, `templateActions`
- Group related styles together in StyleSheet

## Accessibility

### Touch Targets
- Minimum 44x44 points for interactive elements
- IconButtons with `size={20}` automatically get proper touch target
- Add `accessibilityLabel` for non-obvious actions

### Text Contrast
- Use theme text colors which ensure proper contrast
- Don't use custom opacity below 0.7 for readability

## Migration Guide

When updating existing components:

1. **Replace hardcoded spacing** with theme values
2. **Standardize chip heights**: 32px for main views, 24px for compact
3. **Add textTransform: 'capitalize'** to muscle group chips
4. **Use theme colors** instead of hardcoded values
5. **Apply consistent card styling** with proper border radius and padding

---

*This design system is living documentation. Update it when new patterns emerge or standards change.*