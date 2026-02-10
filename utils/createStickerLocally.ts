/**
 * Create a sticker entirely on-device: center-crop to face area and resize to 512×512.
 * No API calls, no cost. Works offline.
 */

import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

const STICKER_SIZE = 512;

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Center-crop photo to square and resize to 512×512. Saves as PNG and returns local URI.
 */
export async function createStickerLocally(photoUri: string): Promise<string> {
  const dir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}stickers/`;
  await FileSystem.makeDirAsync(dir, { intermediates: true });
  const outputUri = `${dir}funmoji_sticker_${Date.now()}.png`;

  try {
    const { width, height } = await getImageDimensions(photoUri);
    const size = Math.min(width, height);
    const originX = Math.max(0, (width - size) / 2);
    const originY = Math.max(0, (height - size) / 2);

    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [
        { crop: { originX, originY, width: size, height: size } },
        { resize: { width: STICKER_SIZE, height: STICKER_SIZE } },
      ],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    await FileSystem.copyAsync({ from: result.uri, to: outputUri });
    return outputUri;
  } catch {
    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: STICKER_SIZE, height: STICKER_SIZE } }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    await FileSystem.copyAsync({ from: result.uri, to: outputUri });
    return outputUri;
  }
}
