import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useApp } from '@/stores/app';
import { closeSession, expectedCash } from '@/db/repo/cash';
import { colors, font, spacing } from '@/theme/colors';
import { money, toCents } from '@/lib/format';

export default function CloseSession() {
  const router = useRouter();
  const session = useApp((s) => s.session);
  const refreshSession = useApp((s) => s.refreshSession);
  const [expected, setExpected] = useState(0);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [variance, setVariance] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (session) expectedCash(session.id).then(setExpected);
  }, [session]);

  if (!session) {
    return (
      <Screen>
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.text}>No open session.</Text>
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const cents = toCents(counted || '0');
  const liveVariance = cents - expected;

  const onClose = async () => {
    const result = await closeSession(session.id, cents, note || undefined);
    setVariance(result.variance);
    setDone(true);
    await refreshSession();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={{ marginTop: spacing.md, gap: spacing.md, alignItems: 'center' }}>
          <Text style={styles.label}>Expected in drawer</Text>
          <Text style={styles.expectedValue}>{money(expected)}</Text>
        </Card>

        {!done ? (
          <>
            <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Field
                label="Cash counted"
                value={counted}
                onChangeText={setCounted}
                keyboardType="decimal-pad"
                placeholder="0.00"
                hint="Count all cash in drawer now"
              />
              <Field
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                placeholder="e.g. mistake on change"
              />
              {!!counted && (
                <View style={styles.varRow}>
                  <Text style={styles.varLabel}>Variance</Text>
                  <Text
                    style={[
                      styles.varValue,
                      {
                        color:
                          liveVariance === 0
                            ? colors.primary
                            : liveVariance > 0
                            ? colors.info
                            : colors.danger,
                      },
                    ]}
                  >
                    {liveVariance >= 0 ? '+' : ''}
                    {money(liveVariance)}
                  </Text>
                </View>
              )}
              <Button
                label="Close session"
                variant="danger"
                onPress={() => {
                  Alert.alert('Close drawer?', 'You can open a new session anytime.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Close', style: 'destructive', onPress: onClose },
                  ]);
                }}
                disabled={!counted}
                big
              />
            </Card>
          </>
        ) : (
          <Card style={{ marginTop: spacing.md, gap: spacing.md, alignItems: 'center' }}>
            <Text style={styles.doneTitle}>Session closed</Text>
            <Text style={styles.label}>Variance</Text>
            <Text
              style={[
                styles.expectedValue,
                {
                  color:
                    variance === 0
                      ? colors.primary
                      : (variance ?? 0) > 0
                      ? colors.info
                      : colors.danger,
                },
              ]}
            >
              {(variance ?? 0) >= 0 ? '+' : ''}
              {money(variance ?? 0)}
            </Text>
            <Button label="Done" onPress={() => router.replace('/')} big />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textDim, fontSize: font.sm, fontWeight: '600' },
  text: { color: colors.text, fontSize: font.md, padding: spacing.md },
  expectedValue: { color: colors.primary, fontSize: font.huge, fontWeight: '900' },
  varRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  varLabel: { color: colors.textDim, fontSize: font.md, fontWeight: '600' },
  varValue: { fontSize: font.xxl, fontWeight: '800' },
  doneTitle: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
});
