import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { dailySummary } from '@/db/repo/sales';
import { lowStockList } from '@/db/repo/products';
import { colors, font, radius, spacing } from '@/theme/colors';
import { fmtDate, money, nowIso } from '@/lib/format';

export default function Today() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [lows, setLows] = useState<any[]>([]);

  const reload = useCallback(async () => {
    const today = nowIso();
    const [s, l] = await Promise.all([dailySummary(today), lowStockList()]);
    setSummary(s);
    setLows(l);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!summary) return <Screen><Text style={styles.muted}>Loading…</Text></Screen>;

  const margin =
    summary.revenue > 0 ? ((summary.profit / summary.revenue) * 100).toFixed(1) : '0';

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.subhead}>{fmtDate(nowIso())}</Text>

        <View style={styles.row2}>
          <Stat label="Revenue" value={money(summary.revenue)} accent={colors.text} />
          <Stat label="Profit" value={money(summary.profit)} accent={colors.primary} />
        </View>
        <View style={styles.row2}>
          <Stat label="Sales" value={String(summary.sales)} />
          <Stat label="Margin" value={`${margin}%`} accent={colors.info} />
        </View>
        <View style={styles.row2}>
          <Stat label="Gross" value={money(summary.grossSales)} />
          <Stat label="COGS" value={money(summary.cogs)} accent={colors.warn} />
        </View>

        <Text style={styles.section}>Top sellers</Text>
        {summary.top.length === 0 ? (
          <Text style={styles.muted}>No sales yet today.</Text>
        ) : (
          summary.top.map((t: any, idx: number) => (
            <Card key={idx} style={styles.topRow}>
              <Text style={styles.topRank}>#{idx + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.topName}>{t.name}</Text>
                <Text style={styles.topMeta}>{t.qty} sold</Text>
              </View>
              <Text style={styles.topAmt}>{money(t.revenue)}</Text>
            </Card>
          ))
        )}

        <View style={styles.lowHead}>
          <Text style={styles.section}>Low stock ({lows.length})</Text>
          {lows.length > 0 && (
            <Button label="View inventory" variant="ghost" onPress={() => router.push('/inventory')} />
          )}
        </View>
        {lows.length === 0 ? (
          <Text style={styles.muted}>All items above threshold.</Text>
        ) : (
          lows.map((p) => (
            <Card key={p.id} style={styles.lowRow}>
              <Text style={styles.lowName}>{p.name}</Text>
              <Text style={styles.lowStock}>
                {p.stock} {p.unit}{' '}
                <Text style={styles.muted}>(min {p.lowStock})</Text>
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  subhead: { color: colors.textDim, fontSize: font.md, paddingTop: spacing.md, marginBottom: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  statValue: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  section: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  topRank: { color: colors.textDim, fontSize: font.lg, fontWeight: '900', width: 32 },
  topName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  topMeta: { color: colors.textDim, fontSize: font.sm },
  topAmt: { color: colors.primary, fontSize: font.md, fontWeight: '800' },
  lowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderColor: colors.warn + '88',
  },
  lowName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  lowStock: { color: colors.warn, fontSize: font.md, fontWeight: '700' },
  muted: { color: colors.textDim, fontSize: font.sm, padding: spacing.sm },
});
