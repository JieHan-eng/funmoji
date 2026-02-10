/**
 * Prepare photo for Replicate: auto center-crop to square and resize so data URL stays under 1MB.
 * Replicate recommends data URIs only for files < 1MB.
 */

import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

const TARGET_SIZE = 1024;
const COMPRESS = 0.85;

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

/**
 * Center-crop image to square and resize to TARGET_SIZE, compress for small payload.
 * Returns a new file URI suitable for converting to data URL for Replicate.
 * If getting dimensions fails (e.g. content:// on Android), falls back to resize-only.
 */
export async function prepareImageForReplicate(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageDimensions(uri);
    const size = Math.min(width, height);
    const originX = Math.max(0, (width - size) / 2);
    const originY = Math.max(0, (height - size) / 2);

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        { crop: { originX, originY, width: size, height: size } },
        { resize: { width: TARGET_SIZE, height: TARGET_SIZE } },
      ],
      {
        compress: COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
      { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }
}
