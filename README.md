# FunMoji

Turn selfies into AI stickers for WhatsApp and Telegram. Built with React Native (Expo), NativeWind, and Replicate's **fofr/face-to-sticker** model (InstantID).

## Stack

- **Framework:** React Native + Expo (Managed, SDK 54)
- **UI:** NativeWind (Tailwind) + Lucide React Native
- **AI:** Replicate API (`fofr/face-to-sticker`)
- **Images:** expo-image-picker, expo-sharing, expo-image-manipulator, expo-haptics

## Setup

1. **Install dependencies** (already done if you cloned):

   ```bash
   cd funmoji && npm install
   ```

2. **Replicate API token**

   - Get a token at [Replicate Account → API tokens](https://replicate.com/account/api-tokens).
   - Create a `.env` in the project root (see `.env.example`):

   ```
   EXPO_PUBLIC_REPLICATE_API_TOKEN=your_token_here
   ```

   Expo will expose `EXPO_PUBLIC_*` to the app at runtime.

3. **Run the app**

   ```bash
   npx expo start
   ```

   Then open in iOS Simulator, Android emulator, or Expo Go.

## Project structure

- **`/screens`** – Home, Generator (camera/picker + style grid), Preview
- **`/components`** – StickerCard, StyleSelector, LoadingAnimation
- **`/services`** – `replicateApi.ts` (Replicate predictions + InstantID params)
- **`/utils`** – `stickerFormatter.ts` (512×512 resize, PNG/export for WhatsApp & Telegram)
- **`/types`** – Navigation param types

## App flow

1. **Home** – Dark dashboard with “Create New Sticker” and horizontal “My Recent Stickers”.
2. **Generator** – Take photo or choose from library → pick style (Anime, 3D Pixar, Comic, Pop Art) → Generate (calls Replicate).
3. **Preview** – Result with thick white border; “Add to WhatsApp” and “Add to Telegram” (resize to 512×512, then share). Haptic feedback on success.

## Sticker logic

- Before export: resize to **512×512** and save as PNG (expo-image-manipulator). WhatsApp and Telegram both accept PNG for stickers.
- Identity: Replicate input uses **InstantID** params (`instant_id_strength: 1`, `ip_adapter_weight: 0.2`) so the sticker resembles the user.

## Theme

Dark “vibey” aesthetic: deep purples (`#0f0618`, `#1a0a2e`), accent `#a855f7`, neon `#c084fc`.
