import { useCallback, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { customerHistory, getCustomer, settleCustomer } from '@/db/repo/people';
import { useApp } from '@/stores/app';
import { colors, font, radius, spacing } from '@/theme/colors';
import { fmtDateTime, money, toCents } from '@/lib/format';

export default function CustomerDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '', 10);
  const ensureSession = useApp((s) => s.ensureSession);

  const [c, setC] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [pay, setPay] = useState('');

  const reload = useCallback(async () => {
    if (!id) return;
    setC(await getCustomer(id));
    setHistory(await customerHistory(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onSettle = async () => {
    const amt = toCents(pay || '0');
    if (amt <= 0) return;
    if (!c) return;
    if (amt > c.balance + 1) {
      return Alert.alert('Too much', `Customer only owes ${money(c.balance)}.`);
    }
    const session = await ensureSession();
    await settleCustomer(c.id, amt, session.id);
    setPay('');
    await reload();
  };

  if (!c) return <Screen><Text style={styles.muted}>Loading…</Text></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={styles.head}>
          <Text style={styles.name}>{c.name}</Text>
          {c.phone ? <Text style={styles.meta}>{c.phone}</Text> : null}
          <Text style={styles.balLabel}>Owes</Text>
          <Text style={styles.balValue}>{money(c.balance)}</Text>
        </Card>

        {c.balance > 0 && (
          <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <Text style={styles.section}>Receive payment</Text>
            <Field
              value={pay}
              onChangeText={setPay}
              keyboardType="decimal-pad"
              placeholder={(c.balance / 100).toFixed(2)}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Full"
                variant="secondary"
                onPress={() => setPay((c.balance / 100).toFixed(2))}
                style={{ flex: 1 }}
              />
              <Button label="Settle" onPress={onSettle} style={{ flex: 2 }} />
            </View>
          </Card>
        )}

        <Text style={styles.section}>History</Text>
        <FlatList
          scrollEnabled={false}
          data={history}
          keyExtractor={(h) => String(h.id)}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowType}>
                  {item.type === 'charge' ? '🛒 Charge' : item.type === 'payment' ? '💵 Payment' : '✏️ Adjust'}
                </Text>
                <Text style={styles.rowMeta}>{fmtDateTime(item.occurredAt)}</Text>
                {item.note ? <Text style={styles.rowMeta}>{item.note}</Text> : null}
              </View>
              <Text
                style={[
                  styles.rowAmt,
                  { color: item.amount >= 0 ? colors.warn : colors.primary },
                ]}
              >
                {item.amount >= 0 ? '+' : ''}
                {money(item.amount)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No transactions yet.</Text>}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginVertical: spacing.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  meta: { color: colors.textDim, fontSize: font.sm },
  balLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600', marginTop: spacing.md },
  balValue: { color: colors.warn, fontSize: font.huge, fontWeight: '900' },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowType: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  rowMeta: { color: colors.textDim, fontSize: font.sm },
  rowAmt: { fontSize: font.lg, fontWeight: '800' },
  muted: { color: colors.textDim, padding: spacing.lg, textAlign: 'center' },
});
