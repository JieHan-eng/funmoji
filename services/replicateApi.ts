/**
 * Replicate API client: FLUX text-to-image (prompt → sticker) and optional face-to-sticker.
 * Requires REPLICATE_API_TOKEN in environment or .env.
 */

import * as FileSystem from "expo-file-system/legacy";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
/** FLUX.1 [schnell] – fast, cheap (~$0.003/img), great for prompt → sticker */
const FLUX_SCHNELL_VERSION =
  "black-forest-labs/flux-schnell:bf53bdb93d739c9c915091cfa5f49ca662d11273a5eb30e7a2ec1939bcf27a00";
const FACE_TO_STICKER_VERSION =
  "fofr/face-to-sticker:a99a32fdaa9a9650cfc7900d54323d0d247dac69f7abb05eac0e742687a25662";
const DETECT_CROP_FACE_VERSION =
  "ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d";
/** Remove background from image (subject only, transparent or clean). ~$0.0005/run */
const BACKGROUND_REMOVER_VERSION =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

export type StickerStyle = "anime" | "3d-pixar" | "comic" | "pop-art";

const STYLE_PROMPTS: Record<StickerStyle, string> = {
  anime: "anime style sticker, kawaii, clean vector, white background",
  "3d-pixar": "3D Pixar style sticker, cartoon character, soft lighting, white background",
  comic: "comic book style sticker, bold outlines, halftone dots, white background",
  "pop-art": "pop art style sticker, bold colors, Roy Lichtenstein style, white background",
};

export interface GenerateStickerInput {
  imageUri: string;
  style: StickerStyle;
  /** Base64 or data URL of the image for API */
  imageData?: string;
}

export interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed";
  output?: string | string[];
  error?: string;
  urls?: { get: string };
}

/**
 * Get API token from env (Expo: use EXPO_PUBLIC_ or app config).
 */
function getApiToken(): string {
  const token =
    process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN ||
    process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Missing REPLICATE_API_TOKEN. Set EXPO_PUBLIC_REPLICATE_API_TOKEN in .env or app config."
    );
  }
  return token;
}

/** Call before starting generation to show a clear message if token is missing. */
export function hasReplicateToken(): boolean {
  return !!(
    process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN ||
    process.env.REPLICATE_API_TOKEN
  );
}

/**
 * Create a prediction for any model. Returns prediction id.
 * On 429 (rate limit), waits for retry_after and retries once.
 */
async function createPredictionRequest(
  version: string,
  input: Record<string, unknown>,
  isRetry = false
): Promise<string> {
  const token = getApiToken();
  const res = await fetch(REPLICATE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });
  if (res.status === 429 && !isRetry) {
    const errText = await res.text();
    let retryAfter = 12;
    try {
      const body = JSON.parse(errText);
      if (typeof body.retry_after === "number") retryAfter = Math.min(body.retry_after + 2, 30);
    } catch {
      // use default
    }
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return createPredictionRequest(version, input, true);
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as ReplicatePrediction;
  return data.id;
}

/**
 * Detect face in image and return URL of cropped face image (single face).
 * Accepts local file URI or data URL. If no face is found or the model fails, returns null.
 */
export async function detectAndCropFace(imageUriOrDataUrl: string): Promise<string | null> {
  const all = await detectAndCropAllFaces(imageUriOrDataUrl);
  return all.length > 0 ? all[0] : null;
}

/**
 * Detect all faces in image and return URLs of cropped face images (one per face).
 * Use for multi-face sticker generation. Returns [] if no face found or on failure.
 */
export async function detectAndCropAllFaces(
  imageUriOrDataUrl: string
): Promise<string[]> {
  try {
    const imageInput =
      imageUriOrDataUrl.startsWith("http") || imageUriOrDataUrl.startsWith("data:")
        ? imageUriOrDataUrl
        : await localUriToDataUrl(imageUriOrDataUrl);
    const id = await createPredictionRequest(DETECT_CROP_FACE_VERSION, {
      image: imageInput,
      padding: 0.2,
    });
    return await getPredictionResultAll(id);
  } catch {
    return [];
  }
}

/**
 * Remove background from photo; returns URL of image with subject only (no background).
 * Use before sending to sticker AI so the prompt customizes the isolated subject.
 */
export async function removeBackground(imageUriOrDataUrl: string): Promise<string> {
  const imageInput =
    imageUriOrDataUrl.startsWith("http") || imageUriOrDataUrl.startsWith("data:")
      ? imageUriOrDataUrl
      : await localUriToDataUrl(imageUriOrDataUrl);
  const id = await createPredictionRequest(BACKGROUND_REMOVER_VERSION, {
    image: imageInput,
  });
  return getPredictionResult(id);
}

/**
 * Create a prediction (start generation). Poll until completed.
 */
export async function createPrediction(
  imageUrl: string,
  style: StickerStyle
): Promise<string> {
  const prompt = STYLE_PROMPTS[style];
  const id = await createPredictionRequest(FACE_TO_STICKER_VERSION, {
    image: imageUrl,
    prompt,
    instant_id_strength: 1,
    ip_adapter_weight: 0.2,
    ip_adapter_noise: 0.5,
    prompt_strength: 7,
    width: 512,
    height: 512,
    steps: 20,
  });
  return getPredictionResult(id);
}

/**
 * Generate a sticker from a photo using the user's prompt (Replicate face-to-sticker).
 * Use when user has added a photo + prompt. ~$0.02/image.
 */
export async function generateStickerFromPhoto(
  imageUri: string,
  prompt: string
): Promise<string> {
  const imageUrl =
    imageUri.startsWith("http") || imageUri.startsWith("data:")
      ? imageUri
      : await localUriToDataUrl(imageUri);
  const id = await createPredictionRequest(FACE_TO_STICKER_VERSION, {
    image: imageUrl,
    prompt: prompt.trim(),
    instant_id_strength: 1,
    ip_adapter_weight: 0.2,
    ip_adapter_noise: 0.5,
    prompt_strength: 7,
    width: 512,
    height: 512,
    steps: 20,
  });
  return getPredictionResult(id);
}

/**
 * Normalize Replicate output to an array of URLs (for multi-face or single).
 */
function outputToUrls(out: unknown): string[] {
  if (Array.isArray(out)) {
    return out
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "url" in item) return (item as { url: string }).url;
        return null;
      })
      .filter((u): u is string => !!u);
  }
  if (typeof out === "string") return [out];
  if (out && typeof out === "object" && "url" in out) return [(out as { url: string }).url];
  return [];
}

/**
 * Poll prediction status and return all output URLs when succeeded (for multi-face).
 */
export async function getPredictionResultAll(
  predictionId: string
): Promise<string[]> {
  const token = getApiToken();
  const getUrl = `${REPLICATE_API_URL}/${predictionId}`;

  for (let i = 0; i < 60; i++) {
    const res = await fetch(getUrl, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) throw new Error(`Replicate get failed: ${res.status}`);
    const data = (await res.json()) as ReplicatePrediction;

    if (data.status === "succeeded") {
      return outputToUrls(data.output);
    }
    if (data.status === "failed") {
      throw new Error(data.error || "Prediction failed");
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("Prediction timed out");
}

/**
 * Poll prediction status and return output URL when succeeded.
 */
export async function getPredictionResult(
  predictionId: string
): Promise<string> {
  const urls = await getPredictionResultAll(predictionId);
  if (urls.length === 0) throw new Error("Unexpected output format from Replicate");
  return urls[0];
}

/**
 * Convert local file URI to a data URL for Replicate (accepts data URLs under 1MB).
 */
async function localUriToDataUrl(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });
  const isPng = uri.toLowerCase().endsWith(".png");
  const mime = isPng ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

/**
 * Generate an image from a text prompt using FLUX.1 [schnell].
 * Best for "fun stickers from prompts" – no photo needed. ~$0.003/image.
 * Returns the generated image URL.
 */
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const id = await createPredictionRequest(FLUX_SCHNELL_VERSION, {
    prompt: prompt.trim(),
    aspect_ratio: "1:1",
    num_outputs: 1,
    output_format: "png",
  });
  return getPredictionResult(id);
}

/**
 * Full flow: create prediction, poll, return result image URL.
 * imageUri: local file URI from expo-image-picker.
 */
export async function generateSticker(
  imageUri: string,
  style: StickerStyle
): Promise<string> {
  const imageUrl = imageUri.startsWith("http")
    ? imageUri
    : await localUriToDataUrl(imageUri);
  const id = await createPrediction(imageUrl, style);
  return getPredictionResult(id);
}

export { STYLE_PROMPTS };
