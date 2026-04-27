import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme/colors';
import { recognizeText, nameCandidates } from '@/lib/ocr';
import { matchProductsFromOcr, type Match } from '@/lib/match';
import { listProducts, getByBarcode } from '@/db/repo/products';
import { useCart } from '@/stores/cart';
import { money } from '@/lib/format';

type Stage = 'idle' | 'scanning' | 'review' | 'no-match';

export default function SmartScan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const targetMode: 'sale' | 'autofill' = params.mode === 'autofill' ? 'autofill' : 'sale';

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const add = useCart((s) => s.add);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission needed.</Text>
        <Button label="Grant access" onPress={() => requestPermission()} />
      </View>
    );
  }

  const onCapture = async () => {
    if (!cameraRef.current) return;
    setStage('scanning');
    Haptics.selectionAsync();
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      if (!pic?.uri) throw new Error('Capture failed');
      setPhotoUri(pic.uri);

      const ocr = await recognizeText(pic.uri);
      const cands = nameCandidates(ocr, 8);
      setCandidates(cands);

      if (targetMode === 'autofill') {
        // Skip matching — just return picks
        setMatches([]);
        setStage('review');
        return;
      }

      // Try barcode-style numeric strings first
      const numeric = cands.find((c) => /^\d{8,14}$/.test(c.replace(/\s/g, '')));
      if (numeric) {
        const p = await getByBarcode(numeric.replace(/\s/g, ''));
        if (p) {
          add({
            productId: p.id,
            name: p.name,
            qty: 1,
            unitPrice: p.price,
            unitCost: p.cost,
          });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
          return;
        }
      }

      const products = await listProducts({});
      const matched = matchProductsFromOcr(cands, products);
      setMatches(matched);
      setStage(matched.length > 0 ? 'review' : 'no-match');
    } catch (e: any) {
      Alert.alert('Recognition failed', e.message ?? String(e));
      setStage('idle');
    }
  };

  const onPick = (m: Match) => {
    add({
      productId: m.product.id,
      name: m.product.name,
      qty: 1,
      unitPrice: m.product.price,
      unitCost: m.product.cost,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const useCandidateForNew = (line: string) => {
    router.replace(`/inventory/new?name=${encodeURIComponent(line)}`);
  };

  if (stage === 'review' || stage === 'no-match') {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          )}

          {targetMode === 'autofill' ? (
            <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={styles.section}>Pick name from label</Text>
              {candidates.length === 0 && (
                <Text style={styles.muted}>No text detected. Try again with clearer angle.</Text>
              )}
              {candidates.map((c) => (
                <Pressable key={c} onPress={() => useCandidateForNew(c)} style={styles.candRow}>
                  <Text style={styles.candText}>{c}</Text>
                  <Text style={styles.candHint}>Use →</Text>
                </Pressable>
              ))}
            </Card>
          ) : matches.length > 0 ? (
            <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={styles.section}>Best matches</Text>
              {matches.map((m) => (
                <Pressable key={m.product.id} onPress={() => onPick(m)} style={styles.matchRow}>
                  {m.product.thumbUri ? (
                    <Image source={{ uri: m.product.thumbUri }} style={styles.matchThumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.matchThumb, styles.thumbPh]}>
                      <Text style={{ fontSize: 22, opacity: 0.5 }}>📦</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchName}>{m.product.name}</Text>
                    <Text style={styles.matchMeta}>
                      {money(m.product.price)} · "{m.matchedLine}" · {Math.round(m.score * 100)}%
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Text style={styles.muted}>None correct? See raw text below.</Text>
            </Card>
          ) : (
            <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={[styles.section, { color: colors.warn }]}>No product matched</Text>
              {candidates.length === 0 ? (
                <Text style={styles.muted}>No text detected. Try clearer photo.</Text>
              ) : (
                <Text style={styles.muted}>
                  Detected text didn't match any product. Add as new?
                </Text>
              )}
            </Card>
          )}

          {candidates.length > 0 && targetMode === 'sale' && (
            <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Text style={styles.section}>Detected text</Text>
              {candidates.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => useCandidateForNew(c)}
                  style={styles.candRow}
                >
                  <Text style={styles.candText}>{c}</Text>
                  <Text style={styles.candHint}>+ New product</Text>
                </Pressable>
              ))}
            </Card>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              label="Try again"
              variant="secondary"
              onPress={() => {
                setStage('idle');
                setPhotoUri(null);
                setMatches([]);
                setCandidates([]);
              }}
              style={{ flex: 1 }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />

      <View style={styles.frame}>
        <View style={styles.reticle} />
      </View>

      {stage === 'scanning' && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.busyText}>Reading label…</Text>
        </View>
      )}

      <View style={styles.bottom}>
        <Card style={styles.bottomCard}>
          <Text style={styles.modeLabel}>
            {targetMode === 'autofill' ? 'Scan label for new product' : 'Smart scan'}
          </Text>
          <Text style={styles.hint}>
            Point at packaging text. We'll match it to your inventory.
          </Text>
          <View style={styles.row}>
            <Button
              label={torch ? 'Torch off' : 'Torch on'}
              variant="secondary"
              onPress={() => setTorch((t) => !t)}
              style={{ flex: 1 }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
          <Button label="Capture & recognize" onPress={onCapture} disabled={stage === 'scanning'} big />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  permText: { color: colors.text, fontSize: font.lg, textAlign: 'center', marginBottom: spacing.lg },
  frame: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  reticle: {
    width: 300,
    height: 200,
    borderColor: colors.accent,
    borderWidth: 3,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  busyText: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: spacing.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg },
  bottomCard: { gap: spacing.md },
  modeLabel: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: font.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  preview: { width: '100%', height: 220, borderRadius: radius.md, marginTop: spacing.md, backgroundColor: colors.surfaceAlt },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  muted: { color: colors.textDim, fontSize: font.sm },
  candRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  candText: { color: colors.text, fontSize: font.md, fontWeight: '600', flex: 1 },
  candHint: { color: colors.primary, fontSize: font.sm, fontWeight: '700' },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  matchThumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surface },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  matchName: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  matchMeta: { color: colors.textDim, fontSize: font.sm, marginTop: 2 },
});
