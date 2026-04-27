import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useCart } from '@/stores/cart';
import { Image } from 'expo-image';
import { listProducts, type ProductWithPhoto } from '@/db/repo/products';
import { colors, font, radius, spacing } from '@/theme/colors';
import { money } from '@/lib/format';

export default function NewSale() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = useCart((s) => s.subtotal());
  const total = useCart((s) => s.total());
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const add = useCart((s) => s.add);
  const clear = useCart((s) => s.clear);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ProductWithPhoto[]>([]);
  const [favorites, setFavorites] = useState<ProductWithPhoto[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const reload = useCallback(async () => {
    const [favs] = await Promise.all([listProducts({ favoritesOnly: true })]);
    setFavorites(favs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) return setResults([]);
    setResults((await listProducts({ search: q })).slice(0, 8));
  };

  const addProduct = (p: ProductWithPhoto) => {
    add({
      productId: p.id,
      name: p.name,
      qty: 1,
      unitPrice: p.price,
      unitCost: p.cost,
    });
    setSearch('');
    setResults([]);
  };

  const submitCustom = () => {
    const cents = Math.round(parseFloat(customPrice || '0') * 100);
    if (!customName.trim() || !cents) return;
    add({
      productId: null,
      name: customName.trim(),
      qty: 1,
      unitPrice: cents,
      unitCost: 0,
    });
    setCustomName('');
    setCustomPrice('');
    setShowCustom(false);
  };

  return (
    <Screen>
      <View style={styles.searchRow}>
        <Field
          placeholder="Search to add..."
          value={search}
          onChangeText={onSearch}
          style={{ flex: 1 }}
        />
        <Button label="📷" onPress={() => router.push('/scanner?mode=sale')} />
        <Button label="🖼️" variant="secondary" onPress={() => router.push('/visual-pick')} />
      </View>

      {results.length > 0 && (
        <Card style={styles.results}>
          {results.map((p) => (
            <Pressable key={p.id} onPress={() => addProduct(p)} style={styles.resultRow}>
              {p.thumbUri ? (
                <Image source={{ uri: p.thumbUri }} style={styles.resThumb} contentFit="cover" />
              ) : (
                <View style={[styles.resThumb, styles.resThumbPlaceholder]}>
                  <Text style={{ fontSize: 18, opacity: 0.6 }}>📦</Text>
                </View>
              )}
              <Text style={styles.resName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.resPrice}>{money(p.price)}</Text>
            </Pressable>
          ))}
        </Card>
      )}

      {showCustom && (
        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Field label="Custom item name" value={customName} onChangeText={setCustomName} />
          <Field
            label="Price"
            value={customPrice}
            onChangeText={setCustomPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Cancel" variant="ghost" onPress={() => setShowCustom(false)} style={{ flex: 1 }} />
            <Button label="Add to cart" onPress={submitCustom} disabled={!customName || !customPrice} style={{ flex: 2 }} />
          </View>
        </Card>
      )}

      {favorites.length > 0 && search === '' && !showCustom && (
        <View style={styles.favWrap}>
          <Text style={styles.section}>Favorites</Text>
          <View style={styles.favGrid}>
            {favorites.slice(0, 8).map((p) => (
              <Pressable key={p.id} onPress={() => addProduct(p)} style={styles.favTile}>
                {p.thumbUri ? (
                  <Image source={{ uri: p.thumbUri }} style={styles.favPhoto} contentFit="cover" />
                ) : null}
                <Text style={styles.favName} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.favPrice}>{money(p.price)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.section}>Cart ({lines.length})</Text>
      <FlatList
        data={lines}
        keyExtractor={(_, i) => String(i)}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        renderItem={({ item, index }) => (
          <CartRow
            line={item}
            onQty={(q) => setQty(index, q)}
            onRemove={() => remove(index)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>Empty. Scan, search, or pick a favorite.</Text>}
        contentContainerStyle={{ paddingBottom: 12 }}
        style={{ flex: 1 }}
      />

      <Card style={styles.footer}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{money(subtotal)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, styles.totalBig]}>{money(total)}</Text>
        </View>
        <View style={styles.actions}>
          <Button label="Clear" variant="ghost" onPress={clear} style={{ flex: 1 }} />
          <Button label="+Custom" variant="secondary" onPress={() => setShowCustom((v) => !v)} style={{ flex: 1 }} />
          <Button
            label="Checkout"
            onPress={() => router.push('/sale/checkout')}
            disabled={lines.length === 0}
            style={{ flex: 2 }}
            big
          />
        </View>
      </Card>
    </Screen>
  );
}

function CartRow({
  line,
  onQty,
  onRemove,
}: {
  line: { name: string; qty: number; unitPrice: number };
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.cartRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cartName} numberOfLines={1}>{line.name}</Text>
        <Text style={styles.cartMeta}>
          {money(line.unitPrice)} ea · {money(Math.round(line.qty * line.unitPrice))}
        </Text>
      </View>
      <View style={styles.qtyBox}>
        <Pressable style={styles.qtyBtn} onPress={() => onQty(line.qty - 1)}>
          <Text style={styles.qtyBtnText}>−</Text>
        </Pressable>
        <TextInput
          style={styles.qtyInput}
          value={String(line.qty)}
          onChangeText={(v) => onQty(parseFloat(v) || 0)}
          keyboardType="decimal-pad"
        />
        <Pressable style={styles.qtyBtn} onPress={() => onQty(line.qty + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingTop: spacing.md },
  results: { padding: 0, marginBottom: spacing.md, overflow: 'hidden' },
  resultRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  resThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  resName: { flex: 1, color: colors.text, fontSize: font.md, fontWeight: '600' },
  resPrice: { color: colors.primary, fontSize: font.md, fontWeight: '700' },
  favPhoto: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: colors.surfaceAlt,
  },
  favWrap: { marginBottom: spacing.md },
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  favTile: {
    width: '23.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 70,
    justifyContent: 'space-between',
  },
  favName: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  favPrice: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  section: {
    color: colors.textDim,
    fontSize: font.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  empty: { color: colors.textDim, textAlign: 'center', padding: spacing.xl },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cartName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  cartMeta: { color: colors.textDim, fontSize: font.sm },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  qtyInput: {
    width: 44,
    color: colors.text,
    fontSize: font.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  removeBtn: { padding: 6 },
  removeText: { color: colors.danger, fontSize: 26, fontWeight: '900' },
  footer: { gap: spacing.sm, marginBottom: spacing.md },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: colors.textDim, fontSize: font.md, fontWeight: '600' },
  totalValue: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  totalBig: { fontSize: font.xxl, color: colors.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
