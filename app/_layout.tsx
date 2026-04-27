import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '@/stores/app';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);

  useEffect(() => {
    init().catch((e) => console.error('init failed', e));
  }, [init]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTitleStyle: { color: colors.text, fontWeight: '700' },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sale/index" options={{ title: 'New Sale' }} />
          <Stack.Screen name="sale/checkout" options={{ title: 'Checkout', presentation: 'modal' }} />
          <Stack.Screen name="scanner" options={{ title: 'Scan', presentation: 'modal' }} />
          <Stack.Screen name="inventory/index" options={{ title: 'Inventory' }} />
          <Stack.Screen name="inventory/[id]" options={{ title: 'Product' }} />
          <Stack.Screen name="inventory/new" options={{ title: 'New Product', presentation: 'modal' }} />
          <Stack.Screen name="customers/index" options={{ title: 'Utang (Customer Credit)' }} />
          <Stack.Screen name="customers/[id]" options={{ title: 'Customer' }} />
          <Stack.Screen name="merchants/index" options={{ title: 'Merchant Loans' }} />
          <Stack.Screen name="merchants/[id]" options={{ title: 'Merchant' }} />
          <Stack.Screen name="cash/index" options={{ title: 'Cash Drawer' }} />
          <Stack.Screen name="cash/close" options={{ title: 'End of Day', presentation: 'modal' }} />
          <Stack.Screen name="reports/today" options={{ title: 'Today' }} />
          <Stack.Screen name="update" options={{ title: 'App Update' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
});
