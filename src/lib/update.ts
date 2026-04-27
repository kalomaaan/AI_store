import * as Application from 'expo-application';
import * as FS from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

const REPO_OWNER = 'kalomaaan';
const REPO_NAME = 'AI_store';
const RELEASES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

export type ReleaseInfo = {
  tag: string;            // e.g. "v0.2.0"
  version: string;        // "0.2.0"
  name: string;
  notes: string;
  apkUrl: string | null;
  apkSize: number | null;
  htmlUrl: string;
  publishedAt: string;
};

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'up_to_date'; current: string; latest: ReleaseInfo }
  | { state: 'available'; current: string; latest: ReleaseInfo }
  | { state: 'downloading'; progress: number; latest: ReleaseInfo }
  | { state: 'ready_to_install'; localUri: string; latest: ReleaseInfo }
  | { state: 'error'; message: string };

export function currentVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0';
}

export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

export async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const r = await fetch(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (r.status === 404) {
    throw new Error('No releases found yet for this repo.');
  }
  if (!r.ok) {
    throw new Error(`GitHub API error: ${r.status}`);
  }
  const data: any = await r.json();
  const apkAsset = (data.assets ?? []).find(
    (a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
  );
  return {
    tag: data.tag_name ?? '',
    version: (data.tag_name ?? '').replace(/^v/i, ''),
    name: data.name ?? data.tag_name ?? '',
    notes: data.body ?? '',
    apkUrl: apkAsset?.browser_download_url ?? null,
    apkSize: apkAsset?.size ?? null,
    htmlUrl: data.html_url ?? '',
    publishedAt: data.published_at ?? '',
  };
}

export async function downloadApk(
  release: ReleaseInfo,
  onProgress: (frac: number) => void
): Promise<string> {
  if (!release.apkUrl) throw new Error('Release has no APK asset.');
  const dest = `${FS.cacheDirectory}aistore-${release.version}.apk`;

  // remove stale partial
  try {
    await FS.deleteAsync(dest, { idempotent: true });
  } catch {}

  const dl = FS.createDownloadResumable(release.apkUrl, dest, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) {
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });
  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('Download failed.');
  return result.uri;
}

export async function installApk(localUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Install is only supported on Android.');
  }
  const contentUri = await FS.getContentUriAsync(localUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}

export const REPO = { owner: REPO_OWNER, name: REPO_NAME };
