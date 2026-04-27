import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { createMerchant, listMerchants } from '@/db/repo/people';
import type { Merchant } from '@/db/schema';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money } from '@/lib/format';

export default function MerchantsList() {
  const router = useRouter();
  const [items, setItems] = useState<Merchant[]>([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const reload = useCallback(async () => setItems(await listMerchants()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const totalOwed = items.reduce((s, m) => s + Math.max(0, m.balance), 0);

  const onAdd = async () => {
    if (!name.trim()) return;
    await createMerchant(name.trim(), contact.trim() || undefined);
    setName('');
    setContact('');
    await reload();
  };

  return (
    <Screen>
      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>You owe merchants</Text>
        <Text style={styles.summaryValue}>{money(totalOwed)}</Text>
      </Card>

      <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Field label="New merchant" value={name} onChangeText={setName} placeholder="Name" />
        <Field value={contact} onChangeText={setContact} placeholder="Contact (optional)" />
        <Button label="Add Merchant" onPress={onAdd} disabled={!name.trim()} />
      </Card>

      <FlatList
        data={items}
        keyExtractor={(m) => String(m.id)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/merchants/${item.id}`)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.contact ? <Text style={styles.meta}>{item.contact}</Text> : null}
            </View>
            <Text style={[styles.bal, item.balance > 0 && { color: colors.danger }]}>
              {money(item.balance)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No merchants yet.</Text>}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginVertical: spacing.md, alignItems: 'center' },
  summaryLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  summaryValue: { color: colors.danger, fontSize: font.huge, fontWeight: '900', marginTop: 4 },
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
