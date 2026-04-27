import { useCallback, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  borrowFromMerchant,
  getMerchant,
  merchantHistory,
  payMerchant,
} from '@/db/repo/people';
import { useApp } from '@/stores/app';
import { colors, font, radius, spacing } from '@/theme/colors';
import { fmtDateTime, money, toCents } from '@/lib/format';

export default function MerchantDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(params.id ?? '', 10);
  const ensureSession = useApp((s) => s.ensureSession);

  const [m, setM] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [borrow, setBorrow] = useState('');
  const [borrowNote, setBorrowNote] = useState('');
  const [pay, setPay] = useState('');

  const reload = useCallback(async () => {
    if (!id) return;
    setM(await getMerchant(id));
    setHistory(await merchantHistory(id));
  }, [id]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onBorrow = async () => {
    const amt = toCents(borrow || '0');
    if (amt <= 0) return;
    const session = await ensureSession();
    await borrowFromMerchant(id, amt, session.id, borrowNote || undefined);
    setBorrow('');
    setBorrowNote('');
    await reload();
  };

  const onPay = async () => {
    const amt = toCents(pay || '0');
    if (amt <= 0) return;
    if (!m) return;
    if (amt > m.balance + 1) return Alert.alert('Too much', `You only owe ${money(m.balance)}.`);
    const session = await ensureSession();
    await payMerchant(id, amt, session.id);
    setPay('');
    await reload();
  };

  if (!m) return <Screen><Text style={styles.muted}>Loading…</Text></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={styles.head}>
          <Text style={styles.name}>{m.name}</Text>
          {m.contact ? <Text style={styles.meta}>{m.contact}</Text> : null}
          <Text style={styles.balLabel}>You owe</Text>
          <Text style={styles.balValue}>{money(m.balance)}</Text>
        </Card>

        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Text style={styles.section}>Borrow / restock on credit</Text>
          <Field
            label="Amount"
            value={borrow}
            onChangeText={setBorrow}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Field label="Note" value={borrowNote} onChangeText={setBorrowNote} placeholder="e.g. Pasalubong stock Apr 27" />
          <Button label="Record loan" onPress={onBorrow} disabled={!borrow} />
        </Card>

        {m.balance > 0 && (
          <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <Text style={styles.section}>Pay merchant</Text>
            <Field
              value={pay}
              onChangeText={setPay}
              keyboardType="decimal-pad"
              placeholder={(m.balance / 100).toFixed(2)}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label="Full"
                variant="secondary"
                onPress={() => setPay((m.balance / 100).toFixed(2))}
                style={{ flex: 1 }}
              />
              <Button label="Pay" onPress={onPay} style={{ flex: 2 }} />
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
                  {item.type === 'borrow' ? '🏦 Borrow' : item.type === 'payment' ? '💵 Payment' : '✏️ Adjust'}
                </Text>
                <Text style={styles.rowMeta}>{fmtDateTime(item.occurredAt)}</Text>
                {item.note ? <Text style={styles.rowMeta}>{item.note}</Text> : null}
              </View>
              <Text
                style={[
                  styles.rowAmt,
                  { color: item.amount >= 0 ? colors.danger : colors.primary },
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
  balValue: { color: colors.danger, fontSize: font.huge, fontWeight: '900' },
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
