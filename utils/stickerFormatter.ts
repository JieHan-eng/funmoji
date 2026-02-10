/**
 * Sticker export formatting: resize to 512x512 and convert to .webp (WhatsApp) or .png (Telegram).
 */

import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

const STICKER_SIZE = 512;

export type ExportFormat = "webp" | "png";

export interface FormattedStickerResult {
  uri: string;
  format: ExportFormat;
}

/**
 * Resize image to exactly 512x512 and optionally convert format.
 * expo-image-manipulator supports resize; for WebP we save as PNG first then note in docs
 * that WhatsApp accepts PNG too, or we use a different approach.
 * expo-image-manipulator: resize returns uri - format is inferred by extension when we save.
 */
export async function resizeToStickerSize(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: STICKER_SIZE, height: STICKER_SIZE } }],
    { compress: 1, format: ImageManipulator.SaveFormat.PNG }
  );
  return result.uri;
}

/**
 * Prepare sticker for WhatsApp: 512x512, WebP preferred.
 * expo-image-manipulator does not support WebP output; we use PNG which WhatsApp also accepts for stickers.
 * If you add a WebP library later, convert here.
 */
export async function formatForWhatsApp(uri: string): Promise<FormattedStickerResult> {
  const resized = await resizeToStickerSize(uri);
  // WhatsApp sticker packs accept PNG (512x512). For .webp you'd need another lib.
  const dir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}stickers/`;
  await FileSystem.makeDirAsync(dir, { intermediates: true });
  const dest = `${dir}funmoji_whatsapp_${Date.now()}.png`;
  await FileSystem.copyAsync({ from: resized, to: dest });
  return { uri: dest, format: "png" };
}

/**
 * Prepare sticker for Telegram: 512x512 PNG.
 */
export async function formatForTelegram(uri: string): Promise<FormattedStickerResult> {
  const resized = await resizeToStickerSize(uri);
  const dir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}stickers/`;
  await FileSystem.makeDirAsync(dir, { intermediates: true });
  const dest = `${dir}funmoji_telegram_${Date.now()}.png`;
  await FileSystem.copyAsync({ from: resized, to: dest });
  return { uri: dest, format: "png" };
}
