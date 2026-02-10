import React, { memo, useState } from "react";
import { View, Text, Image, Pressable, Alert, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Sparkles } from "lucide-react-native";
import { CategorySelector } from "../components/CategorySelector";
import { LoadingAnimation } from "../components/LoadingAnimation";
import { useRecentStickers } from "../context/RecentStickersContext";
import {
  generateImageFromPrompt,
  generateStickerFromPhoto,
  hasReplicateToken,
  removeBackground,
} from "../services/replicateApi";
import { prepareImageForReplicate } from "../utils/imagePrep";
import { generateStickerWithGrok, hasGrokApiKey } from "../services/grokApi";
import { saveStickerLocally } from "../utils/saveStickerLocally";
import { resizeToStickerSize } from "../utils/stickerFormatter";
import * as Haptics from "expo-haptics";
import type { RootStackParamList } from "../types/navigation";

type GeneratorNav = NativeStackNavigationProp<RootStackParamList, "Generator">;

function GeneratorScreenInner() {
  const navigation = useNavigation<GeneratorNav>();
  const { addSticker } = useRecentStickers();
  const [prompt, setPrompt] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const useReplicate = hasReplicateToken();
  const useGrok = hasGrokApiKey();
  const canGenerate =
    !!prompt.trim() && (useReplicate || (useGrok && !!photoUri));

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access is needed to take a photo.");
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const ok = await requestPermissions();
    if (!ok) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      Alert.alert("Describe your sticker", "e.g. a cute cat in a hat, anime dragon, funny avocado");
      return;
    }
    if (!canGenerate) {
      Alert.alert(
        "API key needed",
        "Add EXPO_PUBLIC_REPLICATE_API_TOKEN to your .env to generate stickers from prompts. Get a key at replicate.com."
      );
      return;
    }
    if (photoUri) {
      setLoading(true);
      try {
        // One sticker per photo: remove background (crop to subject, no background) then AI + prompt
        let imageForSticker: string;
        if (useReplicate) {
          const prepared = await prepareImageForReplicate(photoUri);
          try {
            imageForSticker = await removeBackground(prepared);
          } catch {
            imageForSticker = prepared;
          }
        } else {
          imageForSticker = await prepareImageForReplicate(photoUri);
        }
        const resultUrl =
          useGrok
            ? await generateStickerWithGrok(imageForSticker, trimmed)
            : await generateStickerFromPhoto(imageForSticker, trimmed);
        const downloaded = await saveStickerLocally(resultUrl);
        const localUri = await resizeToStickerSize(downloaded);
        await addSticker(localUri);
        setLoading(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.replace("Preview", { imageUri: localUri });
      } catch (e) {
        setLoading(false);
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Couldn't create sticker", msg);
      }
      return;
    }
    if (useReplicate) {
      setLoading(true);
      try {
        const resultUrl = await generateImageFromPrompt(trimmed);
        const downloaded = await saveStickerLocally(resultUrl);
        const localUri = await resizeToStickerSize(downloaded);
        await addSticker(localUri);
        setLoading(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.replace("Preview", { imageUri: localUri });
      } catch (e) {
        setLoading(false);
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Couldn't create sticker", msg);
      }
      return;
    }
    Alert.alert(
      "API key needed",
      "Add EXPO_PUBLIC_REPLICATE_API_TOKEN to your .env to generate stickers from prompts."
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingAnimation
          message={
            photoUri
              ? useReplicate
                ? "Removing background, then creating sticker…"
                : useGrok
                  ? "Creating sticker with Grok…"
                  : "Creating your sticker…"
              : "Creating your sticker…"
          }
        />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-xl font-bold text-white mb-1">New Sticker</Text>
        <Text className="text-brand-neon/80 text-sm mb-6">
          Describe your sticker. Add a photo to turn it into that style, or generate from text only.
        </Text>

        <Text className="text-brand-neon/90 font-semibold mb-3">Describe your sticker</Text>
        <TextInput
          value={prompt}
          onChangeText={(text) => {
            setPrompt(text);
            setSelectedCategoryId(null);
          }}
          placeholder="e.g. a cute cat in a wizard hat, anime style dragon, funny avocado with sunglasses"
          placeholderTextColor="#a78bfa80"
          className="bg-brand-purple/50 border-2 border-brand-accent/50 rounded-2xl px-4 py-3 text-white text-base min-h-[52px]"
          multiline
          maxLength={500}
        />
        <Text className="text-brand-neon/60 text-xs mt-2 mb-3">Categories – tap to fill prompt</Text>
        <CategorySelector
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(promptText, categoryId) => {
            setPrompt(promptText);
            setSelectedCategoryId(categoryId);
          }}
        />

        <Text className="text-brand-neon/90 font-semibold mb-3 mt-6">
          Add photo (optional)
        </Text>
        <Text className="text-brand-neon/60 text-xs mb-3">
          We'll remove the background, then turn it into one sticker using your prompt above
        </Text>
        <View className="flex-row gap-4 mb-4">
          <Pressable
            onPress={takePhoto}
            className="flex-1 rounded-2xl border-2 border-brand-accent/50 py-4 items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Camera size={28} color="#c084fc" />
            <Text className="text-brand-neon mt-2 font-medium">Take Photo</Text>
          </Pressable>
          <Pressable
            onPress={pickFromLibrary}
            className="flex-1 rounded-2xl border-2 border-brand-accent/50 py-4 items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <ImagePlus size={28} color="#c084fc" />
            <Text className="text-brand-neon mt-2 font-medium">Library</Text>
          </Pressable>
        </View>
        {photoUri ? (
          <View className="rounded-2xl overflow-hidden border-2 border-brand-neon bg-brand-purple/50 mb-6">
            <Image
              source={{ uri: photoUri }}
              className="w-full rounded-2xl"
              style={{ aspectRatio: 1, maxHeight: 180 }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View
            className="rounded-2xl border-2 border-dashed border-brand-accent/40 py-8 mb-6 items-center"
            style={{ backgroundColor: "rgba(26,10,46,0.5)" }}
          >
            <Text className="text-brand-neon/60">No photo – we'll generate from prompt only</Text>
          </View>
        )}

        <Pressable
          onPress={handleGenerate}
          disabled={!prompt.trim() || !canGenerate}
          className="mt-6 rounded-2xl overflow-hidden"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View
            className="py-4 rounded-2xl flex-row items-center justify-center gap-2"
            style={{
              backgroundColor: prompt.trim() && canGenerate ? "#a855f7" : "#4c1d95",
              opacity: prompt.trim() && canGenerate ? 1 : 0.6,
            }}
          >
            <Sparkles size={22} color="#fff" />
            <Text className="text-lg font-bold text-white">Generate Sticker</Text>
          </View>
        </Pressable>

        {!canGenerate ? (
          <Text className="text-brand-neon/60 text-sm text-center mt-4">
            Add EXPO_PUBLIC_REPLICATE_API_TOKEN to .env to generate from prompts (get key at
            replicate.com)
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
const GeneratorScreen = memo(GeneratorScreenInner);
GeneratorScreen.displayName = "GeneratorScreen";
export { GeneratorScreen };
