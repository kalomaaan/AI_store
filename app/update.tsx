import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors, font, spacing } from '@/theme/colors';
import {
  compareVersions,
  currentVersion,
  downloadApk,
  fetchLatestRelease,
  installApk,
  REPO,
  type ReleaseInfo,
  type UpdateStatus,
} from '@/lib/update';

export default function UpdateScreen() {
  const router = useRouter();
  const cur = currentVersion();
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' });

  const check = useCallback(async () => {
    setStatus({ state: 'checking' });
    try {
      const latest = await fetchLatestRelease();
      const cmp = compareVersions(latest.version, cur);
      if (cmp <= 0) setStatus({ state: 'up_to_date', current: cur, latest });
      else setStatus({ state: 'available', current: cur, latest });
    } catch (e: any) {
      setStatus({ state: 'error', message: e.message ?? String(e) });
    }
  }, [cur]);

  useEffect(() => {
    check();
  }, [check]);

  const startDownload = async (latest: ReleaseInfo) => {
    if (!latest.apkUrl) {
      Alert.alert('No APK', 'This release does not have an APK file attached.');
      return;
    }
    setStatus({ state: 'downloading', progress: 0, latest });
    try {
      const uri = await downloadApk(latest, (p) => {
        setStatus({ state: 'downloading', progress: p, latest });
      });
      setStatus({ state: 'ready_to_install', localUri: uri, latest });
    } catch (e: any) {
      setStatus({ state: 'error', message: e.message ?? String(e) });
    }
  };

  const install = async (uri: string) => {
    try {
      await installApk(uri);
    } catch (e: any) {
      Alert.alert(
        'Install failed',
        `${e.message}\n\nTip: Allow "Install unknown apps" for this app in Android settings, then retry.`
      );
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Card style={styles.head}>
          <Text style={styles.muted}>Installed version</Text>
          <Text style={styles.version}>v{cur}</Text>
        </Card>

        {status.state === 'checking' && (
          <Card style={styles.card}>
            <Text style={styles.text}>Checking for updates…</Text>
          </Card>
        )}

        {status.state === 'up_to_date' && (
          <Card style={styles.card}>
            <Text style={styles.title}>You're up to date</Text>
            <Text style={styles.muted}>Latest release: v{status.latest.version}</Text>
            <View style={{ height: spacing.md }} />
            <Button label="Check again" variant="ghost" onPress={check} />
          </Card>
        )}

        {status.state === 'available' && (
          <Card style={styles.card}>
            <Text style={styles.titleAccent}>Update available</Text>
            <Text style={styles.versionBig}>v{status.latest.version}</Text>
            {status.latest.notes ? (
              <View style={styles.notes}>
                <Text style={styles.notesLabel}>Release notes</Text>
                <Text style={styles.notesBody}>{status.latest.notes}</Text>
              </View>
            ) : null}
            <View style={{ height: spacing.md }} />
            <Button
              label={status.latest.apkUrl ? 'Download & Install' : 'No APK in release'}
              onPress={() => startDownload(status.latest)}
              disabled={!status.latest.apkUrl}
              big
            />
            <Button
              label="Open release page"
              variant="ghost"
              onPress={() => Linking.openURL(status.latest.htmlUrl)}
            />
          </Card>
        )}

        {status.state === 'downloading' && (
          <Card style={styles.card}>
            <Text style={styles.title}>Downloading v{status.latest.version}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%` }]} />
            </View>
            <Text style={styles.muted}>{Math.round(status.progress * 100)}%</Text>
          </Card>
        )}

        {status.state === 'ready_to_install' && (
          <Card style={styles.card}>
            <Text style={styles.titleAccent}>Ready to install</Text>
            <Text style={styles.muted}>Tap install. Android may ask permission to install unknown apps.</Text>
            <View style={{ height: spacing.md }} />
            <Button label="Install update" onPress={() => install(status.localUri)} big />
          </Card>
        )}

        {status.state === 'error' && (
          <Card style={styles.card}>
            <Text style={[styles.title, { color: colors.danger }]}>Something went wrong</Text>
            <Text style={styles.muted}>{status.message}</Text>
            <View style={{ height: spacing.md }} />
            <Button label="Retry" onPress={check} />
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.muted}>
            Source: github.com/{REPO.owner}/{REPO.name}/releases
          </Text>
          <Button
            label="Open releases"
            variant="ghost"
            onPress={() => Linking.openURL(`https://github.com/${REPO.owner}/${REPO.name}/releases`)}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginVertical: spacing.md, alignItems: 'center' },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  text: { color: colors.text, fontSize: font.md },
  muted: { color: colors.textDim, fontSize: font.sm },
  version: { color: colors.text, fontSize: font.xxl, fontWeight: '900', marginTop: 4 },
  versionBig: { color: colors.primary, fontSize: font.huge, fontWeight: '900' },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  titleAccent: { color: colors.primary, fontSize: font.lg, fontWeight: '800' },
  notes: { backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: 12, marginTop: spacing.sm },
  notesLabel: { color: colors.textDim, fontSize: font.sm, fontWeight: '700', marginBottom: 4 },
  notesBody: { color: colors.text, fontSize: font.md, lineHeight: 22 },
  progressBar: {
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
});
