import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { createCustomer, listCustomers } from '@/db/repo/people';
import type { Customer } from '@/db/schema';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money } from '@/lib/format';

export default function CustomersList() {
  const router = useRouter();
  const [items, setItems] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const reload = useCallback(async () => setItems(await listCustomers()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const totalUtang = items.reduce((s, c) => s + Math.max(0, c.balance), 0);

  const onAdd = async () => {
    if (!name.trim()) return;
    await createCustomer(name.trim(), phone.trim() || undefined);
    setName('');
    setPhone('');
    await reload();
  };

  return (
    <Screen>
      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>Total utang owed to store</Text>
        <Text style={styles.summaryValue}>{money(totalUtang)}</Text>
      </Card>

      <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Field label="New customer" value={name} onChangeText={setName} placeholder="Name" />
        <Field value={phone} onChangeText={setPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />
        <Button label="Add Customer" onPress={onAdd} disabled={!name.trim()} />
      </Card>

      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/customers/${item.id}`)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
            </View>
            <Text style={[styles.bal, item.balance > 0 && { color: colors.warn }]}>
              {money(item.balance)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No customers yet.</Text>}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginVertical: spacing.md, alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  summaryValue: { color: colors.warn, fontSize: font.huge, fontWeight: '900', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: font.sm, marginTop: 2 },
  bal: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  empty: { color: colors.textDim, textAlign: 'center', padding: spacing.xl },
});
