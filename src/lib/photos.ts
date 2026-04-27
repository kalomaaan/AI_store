import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FS from 'expo-file-system/legacy';

const PHOTO_BASE = `${FS.documentDirectory}products/`;

async function ensureProductDir(productId: number): Promise<string> {
  const dir = `${PHOTO_BASE}${productId}/`;
  await FS.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

export async function ensureCameraPermission(): Promise<boolean> {
  const cur = await ImagePicker.getCameraPermissionsAsync();
  if (cur.granted) return true;
  const req = await ImagePicker.requestCameraPermissionsAsync();
  return req.granted;
}

export async function ensureLibraryPermission(): Promise<boolean> {
  const cur = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (cur.granted) return true;
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return req.granted;
}

export type CapturedPhoto = {
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
};

async function downscale(srcUri: string, maxDim: number, quality: number): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(
    srcUri,
    [{ resize: { width: maxDim } }],
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

async function persistAsPair(
  productId: number,
  srcUri: string
): Promise<CapturedPhoto> {
  const dir = await ensureProductDir(productId);
  const stamp = Date.now();
  const fullName = `${stamp}.jpg`;
  const thumbName = `${stamp}_thumb.jpg`;

  const full = await downscale(srcUri, 1024, 0.78);
  const thumb = await downscale(full.uri, 240, 0.7);

  const fullPath = `${dir}${fullName}`;
  const thumbPath = `${dir}${thumbName}`;
  await FS.copyAsync({ from: full.uri, to: fullPath });
  await FS.copyAsync({ from: thumb.uri, to: thumbPath });

  return {
    uri: fullPath,
    thumbUri: thumbPath,
    width: full.width,
    height: full.height,
  };
}

export async function takePhoto(productId: number): Promise<CapturedPhoto | null> {
  const ok = await ensureCameraPermission();
  if (!ok) return null;
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
    aspect: [1, 1],
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return persistAsPair(productId, r.assets[0].uri);
}

export async function pickFromLibrary(productId: number): Promise<CapturedPhoto | null> {
  const ok = await ensureLibraryPermission();
  if (!ok) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.9,
    aspect: [1, 1],
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return persistAsPair(productId, r.assets[0].uri);
}

export async function deletePhotoFiles(uri: string, thumbUri?: string | null) {
  try { await FS.deleteAsync(uri, { idempotent: true }); } catch {}
  if (thumbUri) {
    try { await FS.deleteAsync(thumbUri, { idempotent: true }); } catch {}
  }
}
