import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, font } from '@/theme/colors';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warn';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
  big,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  big?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
      ? colors.danger
      : variant === 'warn'
      ? colors.warn
      : variant === 'ghost'
      ? 'transparent'
      : colors.surfaceAlt;
  const fg =
    variant === 'primary' || variant === 'danger' || variant === 'warn'
      ? '#0B0F14'
      : colors.text;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        big && styles.big,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={[styles.label, big && styles.labelBig, { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { paddingVertical: spacing.xl, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: font.md, fontWeight: '700' },
  labelBig: { fontSize: font.xl },
});
