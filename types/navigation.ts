export type RootStackParamList = {
  Home: undefined;
  Generator: undefined;
  /** One sticker (imageUri) or multiple (imageUris) for multi-face */
  Preview: { imageUri?: string; imageUris?: string[] };
};
