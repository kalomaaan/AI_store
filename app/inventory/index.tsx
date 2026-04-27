import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { listProducts, type ProductWithPhoto } from '@/db/repo/products';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money } from '@/lib/format';

export default function InventoryList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ProductWithPhoto[]>([]);

  const reload = useCallback(async () => {
    setItems(await listProducts({ search: search || undefined }));
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <Screen>
      <View style={styles.bar}>
        <Field
          placeholder="Search name / barcode / sku"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={reload}
          returnKeyType="search"
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="Scan"
          variant="secondary"
          onPress={() => router.push('/scanner?mode=lookup')}
          style={{ flex: 1 }}
        />
        <Button label="+ New" onPress={() => router.push('/inventory/new')} style={{ flex: 1 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <Row item={item} onPress={() => router.push(`/inventory/${item.id}`)} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No products yet. Tap Scan or + New to add one.</Text>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </Screen>
  );
}

function Row({ item, onPress }: { item: ProductWithPhoto; onPress: () => void }) {
  const low = item.stock <= item.lowStock;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      {item.thumbUri ? (
        <Image source={{ uri: item.thumbUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderIcon}>📦</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.barcode ? `${item.barcode} · ` : ''}
          {money(item.price)}
        </Text>
      </View>
      <View style={styles.stockBox}>
        <Text style={[styles.stock, low && { color: colors.warn }]}>{item.stock}</Text>
        <Text style={styles.unit}>{item.unit}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderIcon: { fontSize: 28, opacity: 0.5 },
  name: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: font.sm, marginTop: 2 },
  stockBox: { alignItems: 'flex-end', minWidth: 60 },
  stock: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  unit: { color: colors.textDim, fontSize: font.sm },
  empty: { color: colors.textDim, textAlign: 'center', padding: spacing.xl, fontSize: font.md },
});
