# FunMoji

Create fun stickers from **your own prompts** and share them to WhatsApp and Telegram. Describe what you want (e.g. “a cute cat in a wizard hat”, “anime dragon”) and the app generates a sticker with AI.

## Stack

- **Framework:** React Native + Expo (Managed, SDK 54)
- **UI:** NativeWind (Tailwind) + Lucide React Native
- **AI:** Replicate (FLUX.1 [schnell]) – text-to-image, ~$0.003 per sticker
- **Optional:** xAI Grok – turn your photo + prompt into a sticker
- **Images:** expo-image-picker, expo-sharing, expo-image-manipulator, expo-haptics

## Setup

1. **Install dependencies**

   ```bash
   cd funmoji && npm install
   ```

2. **API key for prompt-based generation**

   Copy `.env.example` to `.env` and set **`EXPO_PUBLIC_REPLICATE_API_TOKEN`** (get a token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)). The app uses **FLUX.1 [schnell]** on Replicate to generate images from your text prompt (~$0.003 per image).

   **Optional:** Set **`EXPO_PUBLIC_XAI_API_KEY`** (from [console.x.ai](https://console.x.ai)) to enable “Add photo” in the Generator – we’ll turn your face + prompt into a sticker with Grok.

3. **Start the dev server**

   ```bash
   npx expo start
   ```

   - **Recommended:** Use **Expo Go** on your phone and scan the QR code.
   - **Web:** Press `w` in the terminal (camera/photo may differ in browser).

## App flow

1. **Home** – “Create New Sticker” and “My Recent Stickers”.
2. **Generator** – **Describe your sticker** in the text box (e.g. “cute cat in a hat”, “anime style dragon”). Use the style presets to fill the prompt, or type your own. If you have a Replicate token, tap **Generate Sticker** – we generate with FLUX and show the result. If you also set a Grok key, you can optionally add a photo to turn your face into that sticker style.
3. **Preview** – View the sticker, then **Add to WhatsApp** or **Add to Telegram** (resize to 512×512 and share). Haptic feedback on success.

## Sticker logic

- **From prompt only (Replicate):** Your description is sent to FLUX.1 [schnell]; the image is downloaded, resized to 512×512, and shown. Export to WhatsApp/Telegram as PNG.
- **From photo + prompt (Grok, optional):** Photo is cropped and sent to xAI with your prompt; result is saved and resized to 512×512.
- All stickers are resized to **512×512** PNG for WhatsApp and Telegram.

## Project structure

- **`/screens`** – Home, Generator (prompt + optional photo), Preview
- **`/components`** – StickerCard, CategorySelector (prompt categories), LoadingAnimation
- **`/constants`** – promptCategories (styles for photo, ideas for text-only)
- **`/services`** – `replicateApi.ts` (FLUX text-to-image + face-to-sticker), `grokApi.ts` (xAI image edit)
- **`/utils`** – stickerFormatter, imagePrep, saveStickerLocally

## Theme

Dark purple aesthetic: deep purples (`#0f0618`, `#1a0a2e`), accent `#a855f7`, neon `#c084fc`.
