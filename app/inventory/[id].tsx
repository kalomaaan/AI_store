import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { adjustStock, getById, toggleFavorite, updateProduct } from '@/db/repo/products';
import type { Product } from '@/db/schema';
import { fromCents, money, toCents } from '@/lib/format';
import { colors, font, spacing } from '@/theme/colors';

export default function ProductDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; action?: string }>();
  const id = parseInt(params.id ?? '', 10);
  const [p, setP] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Product>>({});
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const row = await getById(id);
    setP(row ?? null);
    setDraft(row ?? {});
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (p && params.action === 'receive') {
      setAdjustQty('');
      setEditing(false);
    }
  }, [p, params.action]);

  if (!p) return <Screen><Text style={styles.muted}>Loading…</Text></Screen>;

  const onSave = async () => {
    const patch: any = {};
    if (draft.name) patch.name = draft.name;
    if (draft.barcode !== undefined) patch.barcode = draft.barcode;
    if (draft.unit) patch.unit = draft.unit;
    if (draft.category !== undefined) patch.category = draft.category;
    if ((draft as any)._cost !== undefined) patch.cost = toCents((draft as any)._cost);
    if ((draft as any)._price !== undefined) patch.price = toCents((draft as any)._price);
    if ((draft as any)._low !== undefined) patch.lowStock = parseFloat((draft as any)._low) || 0;
    await updateProduct(p.id, patch);
    setEditing(false);
    await load();
  };

  const onAdjust = async (kind: 'receive' | 'adjust' | 'waste') => {
    const q = parseFloat(adjustQty);
    if (!q || q <= 0) return Alert.alert('Enter quantity');
    const delta = kind === 'waste' ? -q : kind === 'adjust' ? q : q;
    await adjustStock(p.id, kind === 'waste' ? -q : q, kind, adjustNote || undefined);
    setAdjustQty('');
    setAdjustNote('');
    await load();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{p.name}</Text>
            <Button
              label={p.favorite ? '★' : '☆'}
              variant="ghost"
              onPress={async () => {
                await toggleFavorite(p.id);
                await load();
              }}
            />
          </View>
          <View style={styles.kvRow}>
            <Kv label="Stock" value={`${p.stock} ${p.unit}`} accent={p.stock <= p.lowStock ? colors.warn : undefined} />
            <Kv label="Price" value={money(p.price)} />
            <Kv label="Cost" value={money(p.cost)} />
          </View>
          {p.barcode ? <Text style={styles.muted}>Barcode: {p.barcode}</Text> : null}
        </Card>

        <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <Text style={styles.section}>Stock movement</Text>
          <Field
            label="Quantity"
            value={adjustQty}
            onChangeText={setAdjustQty}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field label="Note (optional)" value={adjustNote} onChangeText={setAdjustNote} />
          <View style={styles.threeRow}>
            <Button label="+ Receive" onPress={() => onAdjust('receive')} style={{ flex: 1 }} />
            <Button label="Adjust" variant="secondary" onPress={() => onAdjust('adjust')} style={{ flex: 1 }} />
            <Button label="Waste" variant="warn" onPress={() => onAdjust('waste')} style={{ flex: 1 }} />
          </View>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.titleRow}>
            <Text style={styles.section}>Details</Text>
            <Button
              label={editing ? 'Cancel' : 'Edit'}
              variant="ghost"
              onPress={() => {
                setEditing((e) => !e);
                setDraft(p);
              }}
            />
          </View>
          {editing ? (
            <>
              <Field label="Name" value={draft.name ?? ''} onChangeText={(v) => setDraft({ ...draft, name: v })} />
              <Field
                label="Barcode"
                value={draft.barcode ?? ''}
                onChangeText={(v) => setDraft({ ...draft, barcode: v })}
              />
              <View style={styles.threeRow}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Cost"
                    keyboardType="decimal-pad"
                    defaultValue={fromCents(p.cost).toString()}
                    onChangeText={(v) => setDraft({ ...(draft as any), _cost: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Price"
                    keyboardType="decimal-pad"
                    defaultValue={fromCents(p.price).toString()}
                    onChangeText={(v) => setDraft({ ...(draft as any), _price: v })}
                  />
                </View>
              </View>
              <View style={styles.threeRow}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Unit"
                    value={draft.unit ?? ''}
                    onChangeText={(v) => setDraft({ ...draft, unit: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Low stock"
                    keyboardType="decimal-pad"
                    defaultValue={String(p.lowStock)}
                    onChangeText={(v) => setDraft({ ...(draft as any), _low: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Category"
                    value={draft.category ?? ''}
                    onChangeText={(v) => setDraft({ ...draft, category: v })}
                  />
                </View>
              </View>
              <Button label="Save changes" onPress={onSave} />
            </>
          ) : (
            <View style={{ gap: 4 }}>
              <Text style={styles.muted}>Unit: {p.unit}</Text>
              <Text style={styles.muted}>Low stock alert: {p.lowStock}</Text>
              <Text style={styles.muted}>Category: {p.category ?? '—'}</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Kv({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  kvLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  kvValue: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: 2 },
  muted: { color: colors.textDim, fontSize: font.md },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  threeRow: { flexDirection: 'row', gap: spacing.sm },
});
