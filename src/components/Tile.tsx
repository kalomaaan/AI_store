import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, font } from '@/theme/colors';

export function Tile({
  title,
  subtitle,
  badge,
  icon,
  onPress,
  tint,
}: {
  title: string;
  subtitle?: string;
  badge?: string | null;
  icon?: ReactNode;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: tint ?? colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.iconRow}>
        <Text style={[styles.icon, { color: tint ?? colors.primary }]}>{icon}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: tint ?? colors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 130,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { fontSize: 32 },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textDim, fontSize: font.sm, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { color: '#0B0F14', fontWeight: '800', fontSize: font.sm },
});
