/**
 * xAI Grok Image API – edit an image with a text prompt (e.g. turn face into sticker).
 * Uses grok-imagine-image model. Set EXPO_PUBLIC_XAI_API_KEY in .env.
 */

import * as FileSystem from "expo-file-system/legacy";

const XAI_API_BASE = "https://api.x.ai";
const IMAGE_EDIT_ENDPOINT = "/v1/images/edits";
const MODEL = "grok-imagine-image";

function getApiKey(): string {
  const key =
    process.env.EXPO_PUBLIC_XAI_API_KEY ||
    process.env.XAI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing xAI API key. Set EXPO_PUBLIC_XAI_API_KEY in your .env file."
    );
  }
  return key;
}

async function localUriToDataUrl(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const isPng = uri.toLowerCase().endsWith(".png");
  const mime = isPng ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export interface GrokImageEditResponse {
  url?: string;
  data?: string | Array<{ url?: string; b64_json?: string }>;
  image?: string;
}

/**
 * Edit an image with a text prompt using Grok. Returns the generated image URL.
 * image_uri: local file URI of the cropped face (or any image).
 * prompt: user description, e.g. "Turn this into an anime sticker with big eyes"
 */
export async function generateStickerWithGrok(
  imageUri: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey();
  const imageUrl =
    imageUri.startsWith("http") || imageUri.startsWith("data:")
      ? imageUri
      : await localUriToDataUrl(imageUri);

  const fullPrompt = prompt.trim()
    ? `Turn this face into a sticker. ${prompt.trim()} Keep it as a clean, square sticker suitable for messaging apps.`
    : "Turn this face into a clean, cute sticker suitable for messaging apps. Simple background.";

  // Try Image edit endpoint first; some docs use /v1/images/generations with image_url
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt: fullPrompt,
    image_url: imageUrl,
    aspect_ratio: "1:1",
  };

  let res = await fetch(`${XAI_API_BASE}${IMAGE_EDIT_ENDPOINT}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 404 || errText.includes("not found")) {
      res = await fetch(`${XAI_API_BASE}/v1/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Grok API error: ${res.status} ${await res.text()}`);
      }
    } else {
      throw new Error(`Grok API error: ${res.status} ${errText}`);
    }
  }

  const data = (await res.json()) as GrokImageEditResponse;
  const url =
    data.url ??
    (typeof data.data === "string" ? data.data : null) ??
    (Array.isArray(data.data) && data.data[0]?.url ? data.data[0].url : null) ??
    (typeof data.image === "string" ? data.image : null);
  if (!url) {
    throw new Error("Grok API did not return an image URL");
  }
  return url;
}

export function hasGrokApiKey(): boolean {
  return !!(process.env.EXPO_PUBLIC_XAI_API_KEY || process.env.XAI_API_KEY);
}
