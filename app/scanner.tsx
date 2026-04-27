import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, font, radius, spacing } from '@/theme/colors';
import { getByBarcode } from '@/db/repo/products';
import { useCart } from '@/stores/cart';

type Mode = 'sale' | 'stock' | 'lookup';

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode: Mode = (params.mode as Mode) || 'sale';

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const cooldown = useRef(0);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission needed to scan barcodes.</Text>
        <Button label="Grant access" onPress={() => requestPermission()} />
      </View>
    );
  }

  const onScan = async (r: BarcodeScanningResult) => {
    const now = Date.now();
    if (now - cooldown.current < 1500) return;
    cooldown.current = now;
    const code = r.data;
    if (!code || code === lastCode) return;
    setLastCode(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const product = await getByBarcode(code);

    if (mode === 'sale') {
      if (product) {
        useCart.getState().add({
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.price,
          unitCost: product.cost,
        });
        router.back();
      } else {
        Alert.alert('Unknown barcode', `${code}\nAdd as new product?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => setLastCode(null) },
          {
            text: 'Add product',
            onPress: () => router.replace(`/inventory/new?barcode=${encodeURIComponent(code)}`),
          },
        ]);
      }
    } else if (mode === 'stock') {
      if (product) {
        router.replace(`/inventory/${product.id}?action=receive`);
      } else {
        router.replace(`/inventory/new?barcode=${encodeURIComponent(code)}`);
      }
    } else {
      // lookup
      if (product) router.replace(`/inventory/${product.id}`);
      else router.replace(`/inventory/new?barcode=${encodeURIComponent(code)}`);
    }
  };

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr', 'itf14'],
        }}
        onBarcodeScanned={onScan}
      />

      <View style={styles.frame}>
        <View style={styles.reticle} />
      </View>

      <View style={styles.bottom}>
        <Card style={styles.bottomCard}>
          <Text style={styles.modeLabel}>
            {mode === 'sale' ? 'Add to cart' : mode === 'stock' ? 'Receive stock' : 'Lookup'}
          </Text>
          <Text style={styles.hint}>Point at barcode. Auto-detects.</Text>
          <View style={styles.row}>
            <Button
              label={torch ? 'Torch off' : 'Torch on'}
              variant="secondary"
              onPress={() => setTorch((t) => !t)}
              style={{ flex: 1 }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
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
    width: 260,
    height: 160,
    borderColor: colors.primary,
    borderWidth: 3,
    borderRadius: radius.lg,
    backgroundColor: 'transparent',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg },
  bottomCard: { gap: spacing.md },
  modeLabel: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: font.sm },
  row: { flexDirection: 'row', gap: spacing.md },
});
