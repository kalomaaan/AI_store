import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useApp } from '@/stores/app';
import {
  expectedCash,
  openSession,
  recordDeposit,
  recordExpense,
  recordWithdraw,
  sessionMovements,
} from '@/db/repo/cash';
import { colors, font, radius, spacing } from '@/theme/colors';
import { fmtDateTime, money, toCents } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  opening_float: '🏁 Opening float',
  sale: '🛒 Sale',
  credit_payment: '💵 Utang paid',
  merchant_payment: '🏦 Paid merchant',
  merchant_borrow: '🏦 Loan from merchant',
  expense: '🧾 Expense',
  deposit: '⬇️ Deposit',
  withdraw: '⬆️ Withdraw',
  adjust: '✏️ Adjust',
};

export default function CashDrawer() {
  const session = useApp((s) => s.session);
  const refreshSession = useApp((s) => s.refreshSession);
  const [movements, setMovements] = useState<any[]>([]);
  const [expected, setExpected] = useState(0);
  const [floatStr, setFloatStr] = useState('');
  const [expense, setExpense] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [deposit, setDeposit] = useState('');
  const [withdraw, setWithdraw] = useState('');

  const reload = useCallback(async () => {
    await refreshSession();
    const cur = useApp.getState().session;
    if (!cur) return;
    setMovements(await sessionMovements(cur.id));
    setExpected(await expectedCash(cur.id));
  }, [refreshSession]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onOpen = async () => {
    await openSession(toCents(floatStr || '0'));
    setFloatStr('');
    await reload();
  };

  if (!session) {
    return (
      <Screen>
        <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={styles.head}>Open cash session</Text>
          <Field
            label="Opening float"
            value={floatStr}
            onChangeText={setFloatStr}
            keyboardType="decimal-pad"
            placeholder="0.00"
            hint="Cash already in drawer at start of day"
          />
          <Button label="Open Drawer" onPress={onOpen} big />
        </Card>
      </Screen>
    );
  }

  const onExpense = async () => {
    const amt = toCents(expense || '0');
    if (amt <= 0) return;
    await recordExpense(amt, expenseNote || 'Expense', session.id);
    setExpense('');
    setExpenseNote('');
    await reload();
  };
  const onDeposit = async () => {
    const amt = toCents(deposit || '0');
    if (amt <= 0) return;
    await recordDeposit(amt, 'Deposit', session.id);
    setDeposit('');
    await reload();
  };
  const onWithdraw = async () => {
    const amt = toCents(withdraw || '0');
    if (amt <= 0) return;
    await recordWithdraw(amt, 'Withdraw', session.id);
    setWithdraw('');
    await reload();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Expected in drawer</Text>
          <Text style={styles.summaryValue}>{money(expected)}</Text>
          <Text style={styles.muted}>Session opened {fmtDateTime(session.openedAt)}</Text>
        </Card>

        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Text style={styles.section}>Quick actions</Text>
          <Field
            label="Expense"
            value={expense}
            onChangeText={setExpense}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Field value={expenseNote} onChangeText={setExpenseNote} placeholder="Note (e.g. Ice, internet)" />
          <Button label="Record Expense" variant="warn" onPress={onExpense} disabled={!expense} />
        </Card>

        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Deposit (add cash)" value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" placeholder="0.00" />
              <Button label="Deposit" onPress={onDeposit} disabled={!deposit} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Withdraw (take out)" value={withdraw} onChangeText={setWithdraw} keyboardType="decimal-pad" placeholder="0.00" />
              <Button label="Withdraw" variant="secondary" onPress={onWithdraw} disabled={!withdraw} />
            </View>
          </View>
        </Card>

        <Text style={styles.section}>Movements</Text>
        <FlatList
          scrollEnabled={false}
          data={movements}
          keyExtractor={(m) => String(m.id)}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowType}>{TYPE_LABEL[item.type] ?? item.type}</Text>
                <Text style={styles.rowMeta}>{fmtDateTime(item.occurredAt)}</Text>
                {item.note ? <Text style={styles.rowMeta}>{item.note}</Text> : null}
              </View>
              <Text
                style={[
                  styles.rowAmt,
                  { color: item.amount >= 0 ? colors.primary : colors.danger },
                ]}
              >
                {item.amount >= 0 ? '+' : ''}
                {money(item.amount)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No movements yet.</Text>}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  summary: { marginVertical: spacing.md, alignItems: 'center', gap: 4 },
  summaryLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  summaryValue: { color: colors.primary, fontSize: font.huge, fontWeight: '900' },
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
  row2: { flexDirection: 'row', gap: spacing.md },
  rowType: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  rowMeta: { color: colors.textDim, fontSize: font.sm },
  rowAmt: { fontSize: font.lg, fontWeight: '800' },
  muted: { color: colors.textDim, padding: spacing.md, textAlign: 'center' },
});
