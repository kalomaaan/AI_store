import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Tile } from '@/components/Tile';
import { Card } from '@/components/Card';
import { useApp } from '@/stores/app';
import { colors, font, spacing } from '@/theme/colors';
import { dailySummary } from '@/db/repo/sales';
import { lowStockList } from '@/db/repo/products';
import { listCustomers, listMerchants } from '@/db/repo/people';
import { expectedCash } from '@/db/repo/cash';
import { money, fmtDate, nowIso } from '@/lib/format';
import { compareVersions, currentVersion, fetchLatestRelease } from '@/lib/update';

export default function Home() {
  const router = useRouter();
  const storeName = useApp((s) => s.storeName);
  const session = useApp((s) => s.session);
  const refreshSession = useApp((s) => s.refreshSession);

  const [summary, setSummary] = useState<{ revenue: number; profit: number; sales: number } | null>(
    null
  );
  const [lowCount, setLowCount] = useState(0);
  const [utang, setUtang] = useState(0);
  const [merchantOwed, setMerchantOwed] = useState(0);
  const [cash, setCash] = useState<number | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const today = nowIso();
    const [s, low, customers, merchants] = await Promise.all([
      dailySummary(today),
      lowStockList(),
      listCustomers(),
      listMerchants(),
    ]);
    setSummary(s);
    setLowCount(low.length);
    setUtang(customers.reduce((a, c) => a + Math.max(0, c.balance), 0));
    setMerchantOwed(merchants.reduce((a, m) => a + Math.max(0, m.balance), 0));
    await refreshSession();
    if (session) setCash(await expectedCash(session.id));
    else setCash(null);
  }, [refreshSession, session]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchLatestRelease()
        .then((latest) => {
          if (cancelled) return;
          if (compareVersions(latest.version, currentVersion()) > 0) {
            setUpdateAvailable(latest.version);
          } else setUpdateAvailable(null);
        })
        .catch(() => setUpdateAvailable(null));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text style={styles.hello}>{storeName}</Text>
          <Text style={styles.date}>{fmtDate(nowIso())}</Text>
        </View>

        <Card style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.kLabel}>Today's revenue</Text>
              <Text style={styles.kValue}>{money(summary?.revenue ?? 0)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.kLabel}>Profit</Text>
              <Text style={[styles.kValue, { color: colors.primary }]}>
                {money(summary?.profit ?? 0)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.kLabel}>Sales</Text>
              <Text style={styles.kValueSm}>{summary?.sales ?? 0}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.kLabel}>Cash drawer</Text>
              <Text style={styles.kValueSm}>{cash != null ? money(cash) : '—'}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          <Tile title="New Sale" subtitle="Ring up items" icon="🛒" onPress={() => router.push('/sale')} />
          <Tile
            title="Scan Add"
            subtitle="Receive stock"
            icon="📷"
            tint={colors.info}
            onPress={() => router.push('/scanner?mode=stock')}
          />
        </View>
        <View style={styles.grid}>
          <Tile
            title="Inventory"
            subtitle={lowCount ? `${lowCount} low` : 'All stocked'}
            icon="📦"
            badge={lowCount ? String(lowCount) : null}
            tint={lowCount ? colors.warn : colors.border}
            onPress={() => router.push('/inventory')}
          />
          <Tile
            title="Today"
            subtitle="Sales report"
            icon="📊"
            tint={colors.accent}
            onPress={() => router.push('/reports/today')}
          />
        </View>
        <View style={styles.grid}>
          <Tile
            title="Utang"
            subtitle={utang ? money(utang) : 'No credit'}
            icon="🧾"
            tint={utang ? colors.warn : colors.border}
            onPress={() => router.push('/customers')}
          />
          <Tile
            title="Loans"
            subtitle={merchantOwed ? money(merchantOwed) : 'Clean'}
            icon="🏦"
            tint={merchantOwed ? colors.danger : colors.border}
            onPress={() => router.push('/merchants')}
          />
        </View>
        <View style={styles.grid}>
          <Tile
            title="Cash Drawer"
            subtitle={session ? 'Open' : 'Closed'}
            icon="💵"
            tint={session ? colors.primary : colors.border}
            onPress={() => router.push('/cash')}
          />
          <Tile
            title="End of Day"
            subtitle="Count cash"
            icon="🌙"
            tint={colors.danger}
            onPress={() => router.push('/cash/close')}
          />
        </View>
        <View style={styles.grid}>
          <Tile
            title="Pick by Photo"
            subtitle="No barcode? Tap photo"
            icon="🖼️"
            tint={colors.accent}
            onPress={() => router.push('/visual-pick')}
          />
          <Tile
            title={updateAvailable ? `Update v${updateAvailable}` : 'App Update'}
            subtitle={updateAvailable ? 'New version ready' : `v${currentVersion()}`}
            icon="⬇️"
            badge={updateAvailable ? '!' : null}
            tint={updateAvailable ? colors.info : colors.border}
            onPress={() => router.push('/update')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  hello: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  date: { color: colors.textDim, fontSize: font.md, marginTop: 2 },
  summary: { marginBottom: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.lg },
  summaryCol: { flex: 1 },
  kLabel: {
    color: colors.textDim,
    fontSize: font.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kValue: { color: colors.text, fontSize: font.xxl, fontWeight: '800', marginTop: 2 },
  kValueSm: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: 2 },
  grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
});
