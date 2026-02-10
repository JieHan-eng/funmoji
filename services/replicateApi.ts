/**
 * Replicate API client: FLUX text-to-image (prompt → sticker) and optional face-to-sticker.
 * Requires REPLICATE_API_TOKEN in environment or .env.
 *
 * Mock mode (no API calls, no credits): set EXPO_PUBLIC_REPLICATE_MOCK=true in .env
 * to test the full flow using local sticker generation instead of Replicate.
 */

import * as FileSystem from "expo-file-system/legacy";
import { createStickerLocally } from "../utils/createStickerLocally";

/** When true, all Replicate calls are faked locally – no API usage, no credits. */
const REPLICATE_MOCK =
  process.env.EXPO_PUBLIC_REPLICATE_MOCK === "true" ||
  process.env.EXPO_PUBLIC_REPLICATE_MOCK === "1";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
/** Placeholder image for mock text-to-image (no download cost). */
const MOCK_PLACEHOLDER_IMAGE =
  "https://placehold.co/512x512/7c3aed/white?text=Mock";
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
  if (REPLICATE_MOCK) return true;
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
  if (REPLICATE_MOCK) {
    if (imageUriOrDataUrl.startsWith("file://")) {
      try {
        const uri = await createStickerLocally(imageUriOrDataUrl);
        return [uri];
      } catch {
        return [];
      }
    }
    return [imageUriOrDataUrl];
  }
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
  if (REPLICATE_MOCK) return imageUriOrDataUrl;
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
  _style: StickerStyle
): Promise<string> {
  if (REPLICATE_MOCK) {
    if (imageUrl.startsWith("file://")) {
      return createStickerLocally(imageUrl);
    }
    return MOCK_PLACEHOLDER_IMAGE;
  }
  const prompt = STYLE_PROMPTS[_style];
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
  _prompt: string
): Promise<string> {
  if (REPLICATE_MOCK) {
    if (!imageUri.startsWith("file://")) {
      throw new Error("Mock mode: use a photo from your device (camera or gallery).");
    }
    return createStickerLocally(imageUri);
  }
  const imageUrl =
    imageUri.startsWith("http") || imageUri.startsWith("data:")
      ? imageUri
      : await localUriToDataUrl(imageUri);
  const id = await createPredictionRequest(FACE_TO_STICKER_VERSION, {
    image: imageUrl,
    prompt: _prompt.trim(),
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

const HTTP_URL = /^https?:\/\//i;
const DATA_URI = /^data:/i;
const REPLICATE_DELIVERY = /^(https?:\/\/)?(replicate\.delivery\/)/i;

/** Normalize Replicate output URL (e.g. "replicate.delivery/pb/..." -> "https://replicate.delivery/..."). */
function normalizeOutputUrl(s: string): string {
  const t = s.trim();
  if (REPLICATE_DELIVERY.test(t) && !HTTP_URL.test(t)) return `https://${t.replace(/^https?:\/\//i, "")}`;
  return t;
}

function isUrl(s: string): boolean {
  const t = typeof s === "string" ? s.trim() : "";
  if (t.length < 10) return false;
  if (HTTP_URL.test(t) || DATA_URI.test(t)) return true;
  if (REPLICATE_DELIVERY.test(t)) return true;
  return false;
}

function extractUrlsFrom(value: unknown): string[] {
  const urls: string[] = [];
  if (typeof value === "string") {
    const t = value.trim();
    if (isUrl(t)) urls.push(normalizeOutputUrl(t));
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      urls.push(...extractUrlsFrom(item));
    }
    return urls;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["url", "uri", "href", "image", "output", "result", "file"]) {
      if (key in obj && typeof obj[key] === "string" && isUrl(obj[key] as string)) {
        urls.push(normalizeOutputUrl((obj[key] as string).trim()));
      }
    }
    for (const v of Object.values(obj)) {
      urls.push(...extractUrlsFrom(v));
    }
  }
  return urls;
}

/**
 * Normalize Replicate output to an array of URLs (for multi-face or single).
 * Handles nested objects, arrays, and various key names (url, uri, href, image, output, result, file).
 */
function outputToUrls(out: unknown): string[] {
  const list = extractUrlsFrom(out).filter((u): u is string => typeof u === "string" && isUrl(u));
  return [...new Set(list)];
}

function describeOutput(out: unknown): string {
  if (out == null) return "Output was empty.";
  if (typeof out === "string") {
    const t = out.trim();
    if (t.length > 80) return `Output was a long string (${t.length} chars), not a URL.`;
    return `Output was: "${t.slice(0, 60)}${t.length > 60 ? "…" : ""}".`;
  }
  if (Array.isArray(out)) return `Output was an array of ${out.length} item(s).`;
  if (typeof out === "object") {
    const keys = Object.keys(out as object).slice(0, 8);
    return `Output was an object with keys: ${keys.join(", ") || "none"}.`;
  }
  return `Output type: ${typeof out}.`;
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
      const raw = data.output ?? (data as Record<string, unknown>).outputs ?? (data as Record<string, unknown>).result;
      if (raw == null) {
        throw new Error(
          "Replicate returned no image URL (output was empty). Try again with a new photo or use a clearer face shot."
        );
      }
      const urls = outputToUrls(raw);
      if (urls.length > 0) return urls;
      const hint = describeOutput(raw);
      throw new Error(
        `Replicate returned no image URL. ${hint} Try another photo or check the model at replicate.com/fofr/face-to-sticker.`
      );
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
  if (urls.length === 0) {
    throw new Error(
      "Replicate returned no image URL. Try another photo or check replicate.com/fofr/face-to-sticker for the model output format."
    );
  }
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
 * Download image from Replicate output URL (replicate.delivery) with auth.
 * Use when saveStickerLocally would fail due to missing Authorization header.
 * Returns local file URI.
 */
export async function downloadReplicateOutput(remoteUrl: string): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith("http")) {
    throw new Error("Invalid Replicate output URL.");
  }
  const token = getApiToken();
  const res = await fetch(remoteUrl, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!res.ok) throw new Error(`Could not download sticker: ${res.status}`);
  const blob = await res.blob();
  const dir = FileSystem.cacheDirectory ?? `${FileSystem.documentDirectory}stickers/`;
  await FileSystem.makeDirAsync(dir, { intermediates: true });
  const localUri = `${dir}funmoji_${Date.now()}.png`;
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const b64 = result.split(",")[1] ?? result;
        resolve(b64);
      } else reject(new Error("Could not read blob"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  await FileSystem.writeAsStringAsync(localUri, base64, {
    encoding: "base64",
  });
  return localUri;
}

/**
 * Generate an image from a text prompt using FLUX.1 [schnell].
 * Best for "fun stickers from prompts" – no photo needed. ~$0.003/image.
 * Returns the generated image URL.
 */
export async function generateImageFromPrompt(prompt: string): Promise<string> {
  if (REPLICATE_MOCK) return MOCK_PLACEHOLDER_IMAGE;
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
  _style: StickerStyle
): Promise<string> {
  if (REPLICATE_MOCK) {
    if (!imageUri.startsWith("file://")) {
      throw new Error("Mock mode: use a photo from your device (camera or gallery).");
    }
    return createStickerLocally(imageUri);
  }
  const imageUrl = imageUri.startsWith("http")
    ? imageUri
    : await localUriToDataUrl(imageUri);
  const id = await createPrediction(imageUrl, _style);
  return getPredictionResult(id);
}

export { STYLE_PROMPTS };
