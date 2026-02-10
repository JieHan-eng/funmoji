import * as FileSystem from "expo-file-system";

/**
 * Download a sticker image from a URL (e.g. Replicate output) and save to local storage.
 * Returns the local file URI for use in recents and preview.
 */
export async function saveStickerLocally(remoteUrl: string): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith("http")) {
    throw new Error("Invalid sticker URL. The AI may not have returned an image.");
  }
  const dir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}stickers/`;
  await FileSystem.makeDirAsync(dir, { intermediates: true });
  const localUri = `${dir}funmoji_${Date.now()}.png`;
  try {
    const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
    return uri;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not save sticker: ${msg}`);
  }
}
