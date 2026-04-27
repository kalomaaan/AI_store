import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useCart } from '@/stores/cart';
import { useApp } from '@/stores/app';
import { checkout } from '@/db/repo/sales';
import { createCustomer, listCustomers } from '@/db/repo/people';
import type { Customer } from '@/db/schema';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money, toCents } from '@/lib/format';

type Method = 'cash' | 'credit' | 'mixed';

export default function Checkout() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotal());
  const discountState = useCart((s) => s.discount);
  const setDiscount = useCart((s) => s.setDiscount);
  const customerId = useCart((s) => s.customerId);
  const setCustomer = useCart((s) => s.setCustomer);
  const clear = useCart((s) => s.clear);

  const ensureSession = useApp((s) => s.ensureSession);

  const [method, setMethod] = useState<Method>('cash');
  const [paidStr, setPaidStr] = useState('');
  const [discountStr, setDiscountStr] = useState(discountState ? (discountState / 100).toFixed(2) : '');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  const total = useMemo(() => Math.max(0, subtotal - (toCents(discountStr || '0'))), [subtotal, discountStr]);
  const paid = useMemo(() => {
    if (method === 'cash') return total;
    if (method === 'credit') return 0;
    return Math.max(0, Math.min(total, toCents(paidStr || '0')));
  }, [method, total, paidStr]);
  const owed = total - paid;
  const change = method === 'cash' ? Math.max(0, toCents(paidStr || '0') - total) : 0;

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const onCheckout = async () => {
    if (lines.length === 0) return;
    if (method !== 'cash' && !customerId) {
      return Alert.alert('Pick a customer', 'Credit/mixed sales need a customer.');
    }
    setSaving(true);
    try {
      const session = await ensureSession();
      setDiscount(toCents(discountStr || '0'));
      await checkout({
        lines,
        discount: toCents(discountStr || '0'),
        paid,
        method,
        customerId: customerId ?? null,
        sessionId: session.id,
      });
      clear();
      Alert.alert(
        'Sale done',
        `${money(total)}${owed ? `\nUtang: ${money(owed)}` : ''}${change ? `\nChange: ${money(change)}` : ''}`,
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const onCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    const c = await createCustomer(newCustName.trim());
    setCustomers([c, ...customers]);
    setCustomer(c.id);
    setNewCustName('');
    setShowPicker(false);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={styles.summary}>
          <Row label="Items" value={String(lines.reduce((s, l) => s + l.qty, 0))} />
          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Discount" value={`-${money(toCents(discountStr || '0'))}`} />
          <Row label="Total" value={money(total)} big />
        </Card>

        <Field
          label="Discount (₱)"
          value={discountStr}
          onChangeText={setDiscountStr}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text style={styles.section}>Payment method</Text>
        <View style={styles.methodRow}>
          {(['cash', 'credit', 'mixed'] as Method[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={[styles.methodTile, method === m && styles.methodTileActive]}
            >
              <Text style={[styles.methodLabel, method === m && styles.methodLabelActive]}>
                {m === 'cash' ? '💵 Cash' : m === 'credit' ? '🧾 Utang' : '½ Mixed'}
              </Text>
            </Pressable>
          ))}
        </View>

        {method === 'cash' && (
          <Field
            label="Cash received"
            value={paidStr}
            onChangeText={setPaidStr}
            keyboardType="decimal-pad"
            placeholder={(total / 100).toFixed(2)}
            hint={change > 0 ? `Change: ${money(change)}` : undefined}
          />
        )}

        {method === 'mixed' && (
          <Field
            label="Cash paid (rest is utang)"
            value={paidStr}
            onChangeText={setPaidStr}
            keyboardType="decimal-pad"
            placeholder="0.00"
            hint={`Utang: ${money(Math.max(0, total - toCents(paidStr || '0')))}`}
          />
        )}

        {method !== 'cash' && (
          <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <Text style={styles.section}>Customer</Text>
            {selectedCustomer ? (
              <View style={styles.customerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.custName}>{selectedCustomer.name}</Text>
                  <Text style={styles.custBal}>Current utang: {money(selectedCustomer.balance)}</Text>
                </View>
                <Button label="Change" variant="ghost" onPress={() => setShowPicker(true)} />
              </View>
            ) : (
              <Button label="Pick customer" variant="secondary" onPress={() => setShowPicker(true)} />
            )}
            {showPicker && (
              <View style={{ gap: spacing.sm }}>
                {customers.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCustomer(c.id);
                      setShowPicker(false);
                    }}
                    style={styles.pickRow}
                  >
                    <Text style={styles.pickName}>{c.name}</Text>
                    <Text style={styles.pickBal}>{money(c.balance)}</Text>
                  </Pressable>
                ))}
                <View style={styles.newCustRow}>
                  <Field
                    placeholder="+ New customer name"
                    value={newCustName}
                    onChangeText={setNewCustName}
                    style={{ flex: 1 } as any}
                  />
                  <Button label="Add" onPress={onCreateCustomer} />
                </View>
              </View>
            )}
          </Card>
        )}

        <Button
          label={saving ? 'Saving…' : `Confirm — ${money(total)}`}
          onPress={onCheckout}
          disabled={saving || lines.length === 0}
          big
        />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, big && { fontSize: font.lg }]}>{label}</Text>
      <Text style={[styles.rowValue, big && { fontSize: font.xxl, color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: colors.textDim, fontSize: font.md, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginBottom: spacing.sm },
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  methodTile: {
    flex: 1,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  methodTileActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim + '40' },
  methodLabel: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  methodLabelActive: { color: colors.primary },
  customerRow: { flexDirection: 'row', alignItems: 'center' },
  custName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  custBal: { color: colors.warn, fontSize: font.sm },
  pickRow: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickName: { color: colors.text, fontWeight: '600' },
  pickBal: { color: colors.warn, fontWeight: '700' },
  newCustRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
