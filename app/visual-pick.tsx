import { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { listProducts, type ProductWithPhoto } from '@/db/repo/products';
import { useCart } from '@/stores/cart';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money } from '@/lib/format';

const COLS = 3;

export default function VisualPick() {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [items, setItems] = useState<ProductWithPhoto[]>([]);
  const [search, setSearch] = useState('');

  const reload = useCallback(async () => {
    setItems(await listProducts({}));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? '').includes(q) ||
          (p.category ?? '').toLowerCase().includes(q)
      );
    }
    // photos first
    return [...list].sort((a, b) => Number(!!b.thumbUri) - Number(!!a.thumbUri));
  }, [items, search]);

  const onPick = (p: ProductWithPhoto) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    add({
      productId: p.id,
      name: p.name,
      qty: 1,
      unitPrice: p.price,
      unitCost: p.cost,
    });
    router.back();
  };

  const screenW = Dimensions.get('window').width;
  const tileSize = (screenW - spacing.lg * 2 - spacing.sm * (COLS - 1)) / COLS;

  return (
    <Screen>
      <View style={{ paddingTop: spacing.md }}>
        <Field
          placeholder="Search name / barcode / category"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <Text style={styles.helper}>
        Tap any product photo to add to cart. Long-press to view details.
      </Text>
      <FlatList
        data={filtered}
        numColumns={COLS}
        keyExtractor={(p) => String(p.id)}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item)}
            onLongPress={() => router.push(`/inventory/${item.id}`)}
            style={[styles.tile, { width: tileSize }]}
          >
            {item.thumbUri ? (
              <Image source={{ uri: item.thumbUri }} style={[styles.photo, { height: tileSize }]} contentFit="cover" />
            ) : (
              <View style={[styles.photo, styles.placeholder, { height: tileSize }]}>
                <Text style={styles.placeholderIcon}>📦</Text>
              </View>
            )}
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.price}>{money(item.price)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No products. Add some from Inventory.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: colors.textDim,
    fontSize: font.sm,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photo: { width: '100%', backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 36, opacity: 0.5 },
  meta: { padding: spacing.sm },
  name: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  price: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', padding: spacing.xl },
});
