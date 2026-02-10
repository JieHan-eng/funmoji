/**
 * Replicate API client for fofr/face-to-sticker (InstantID-based).
 * Requires REPLICATE_API_TOKEN in environment or .env.
 */

import * as FileSystem from "expo-file-system";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const FACE_TO_STICKER_VERSION =
  "fofr/face-to-sticker:a99a32fdaa9a9650cfc7900d54323d0d247dac69f7abb05eac0e742687a25662";
const DETECT_CROP_FACE_VERSION =
  "ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d";

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
 */
async function createPredictionRequest(
  version: string,
  input: Record<string, unknown>
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate API error: ${res.status} ${err}`);
  }
  const data = (await res.json()) as ReplicatePrediction;
  return data.id;
}

/**
 * Detect face in image and return URL of cropped face image (WhatsApp-style auto-cut).
 * Accepts local file URI or data URL. If no face is found or the model fails, returns null.
 */
export async function detectAndCropFace(imageUriOrDataUrl: string): Promise<string | null> {
  try {
    const imageInput =
      imageUriOrDataUrl.startsWith("http") || imageUriOrDataUrl.startsWith("data:")
        ? imageUriOrDataUrl
        : await localUriToDataUrl(imageUriOrDataUrl);
    const id = await createPredictionRequest(DETECT_CROP_FACE_VERSION, {
      image: imageInput,
      padding: 0.2,
    });
    const output = await getPredictionResult(id);
    return output && typeof output === "string" ? output : null;
  } catch {
    return null;
  }
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
 * Poll prediction status and return output URL when succeeded.
 */
export async function getPredictionResult(
  predictionId: string
): Promise<string> {
  const token = getApiToken();
  const getUrl = `${REPLICATE_API_URL}/${predictionId}`;

  for (let i = 0; i < 60; i++) {
    const res = await fetch(getUrl, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!res.ok) throw new Error(`Replicate get failed: ${res.status}`);
    const data = (await res.json()) as ReplicatePrediction;

    if (data.status === "succeeded") {
      const out = data.output;
      if (Array.isArray(out) && out[0]) {
        const first = out[0];
        if (typeof first === "string") return first;
        if (first && typeof first === "object" && "url" in first) return (first as { url: string }).url;
      }
      if (typeof out === "string") return out;
      if (out && typeof out === "object" && "url" in out) return (out as { url: string }).url;
      throw new Error("Unexpected output format from Replicate");
    }
    if (data.status === "failed") {
      throw new Error(data.error || "Prediction failed");
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("Prediction timed out");
}

/**
 * Convert local file URI to a data URL for Replicate (accepts data URLs under 1MB).
 */
async function localUriToDataUrl(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const isPng = uri.toLowerCase().endsWith(".png");
  const mime = isPng ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
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
