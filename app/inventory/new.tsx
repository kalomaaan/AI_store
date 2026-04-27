import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { createProduct } from '@/db/repo/products';
import { useApp } from '@/stores/app';
import { toCents, money } from '@/lib/format';
import { colors, font, spacing } from '@/theme/colors';

export default function NewProduct() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string; name?: string; price?: string }>();
  const lowStockDefault = useApp((s) => s.lowStockDefault);

  const [name, setName] = useState(params.name ?? '');
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('pc');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState(params.price ?? '');
  const [stock, setStock] = useState('0');
  const [low, setLow] = useState(String(lowStockDefault));
  const [saving, setSaving] = useState(false);

  const margin = (() => {
    const c = parseFloat(cost);
    const p = parseFloat(price);
    if (!c || !p || c <= 0) return null;
    return (((p - c) / p) * 100).toFixed(1);
  })();

  const suggestPrice = () => {
    const c = parseFloat(cost);
    if (!c) return;
    setPrice((c * 1.3).toFixed(2));
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        name: name.trim(),
        barcode: barcode.trim() || null,
        category: category.trim() || null,
        unit: unit.trim() || 'pc',
        cost: toCents(cost || '0'),
        price: toCents(price || '0'),
        lowStock: parseFloat(low) || 0,
        initialStock: parseFloat(stock) || 0,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Coke 1.5L" />
        <Field
          label="Barcode"
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Scan or type"
          keyboardType="numeric"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Cost" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
          </View>
        </View>
        <Card style={styles.priceHint}>
          <Text style={styles.hintTitle}>
            {margin ? `Margin: ${margin}%` : 'Set cost + price for margin'}
          </Text>
          <Button label="Suggest +30%" variant="ghost" onPress={suggestPrice} />
          {!!cost && !!price && (
            <Text style={styles.hintSub}>
              Buy {money(toCents(cost))} → Sell {money(toCents(price))}
            </Text>
          )}
        </Card>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Initial stock"
              value={stock}
              onChangeText={setStock}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="pc, kg, pack" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Low stock alert" value={low} onChangeText={setLow} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Category" value={category} onChangeText={setCategory} placeholder="Drinks, Snacks…" />
          </View>
        </View>

        <Button label={saving ? 'Saving…' : 'Save Product'} onPress={onSave} disabled={saving} big />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  priceHint: { marginBottom: spacing.md, gap: spacing.sm },
  hintTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  hintSub: { color: colors.textDim, fontSize: font.sm },
});
