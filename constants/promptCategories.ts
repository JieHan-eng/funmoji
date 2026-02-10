/**
 * Prompt categories tuned for Replicate:
 * - Styles (with photo): face-to-sticker works best with art-style prompts
 * - Ideas (text only): FLUX can generate from these without a photo
 */

export interface PromptCategory {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

/** Best with a photo – turns your face into this style (Replicate face-to-sticker) */
export const STYLES_FOR_PHOTO: PromptCategory[] = [
  { id: "anime", label: "Anime", emoji: "✨", prompt: "anime style sticker, kawaii, clean vector, white background" },
  { id: "3d-pixar", label: "3D Pixar", emoji: "🎬", prompt: "3D Pixar style sticker, cartoon character, soft lighting, white background" },
  { id: "comic", label: "Comic", emoji: "💬", prompt: "comic book style sticker, bold outlines, halftone dots, white background" },
  { id: "pop-art", label: "Pop Art", emoji: "🎨", prompt: "pop art style sticker, bold colors, Roy Lichtenstein style, white background" },
  { id: "watercolor", label: "Watercolor", emoji: "🖌️", prompt: "watercolor style sticker, soft edges, painterly, white background" },
  { id: "sketch", label: "Pencil Sketch", emoji: "✏️", prompt: "pencil sketch style sticker, detailed shading, hand-drawn look, white background" },
  { id: "vintage", label: "Vintage", emoji: "📷", prompt: "vintage style sticker, retro aesthetic, soft tones, white background" },
];

/** Text-only – describe what to generate (Replicate FLUX) */
export const IDEAS_FOR_TEXT: PromptCategory[] = [
  { id: "cute-char", label: "Cute character", emoji: "🥰", prompt: "cute kawaii character sticker, simple background, sticker style" },
  { id: "funny-animal", label: "Funny animal", emoji: "🐶", prompt: "funny cartoon animal sticker, expressive, cute, simple background" },
  { id: "fantasy", label: "Fantasy creature", emoji: "🐉", prompt: "fantasy creature sticker, magical, detailed, sticker style" },
  { id: "food-mascot", label: "Food mascot", emoji: "🥑", prompt: "cute food character sticker, mascot style, simple background" },
  { id: "anime-scene", label: "Anime style", emoji: "🌸", prompt: "anime style sticker, kawaii, clean vector, simple background" },
  { id: "meme", label: "Meme style", emoji: "😂", prompt: "meme style sticker, bold, funny, simple background" },
  { id: "minimal", label: "Minimal cute", emoji: "💜", prompt: "minimal cute sticker, simple shapes, pastel colors, clean background" },
];
