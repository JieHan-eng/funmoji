import React, { memo, useState } from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Sparkles } from "lucide-react-native";
import { StyleSelector } from "../components/StyleSelector";
import { LoadingAnimation } from "../components/LoadingAnimation";
import { useRecentStickers } from "../context/RecentStickersContext";
import { generateSticker, detectAndCropFace, hasReplicateToken } from "../services/replicateApi";
import type { StickerStyle } from "../services/replicateApi";
import { saveStickerLocally } from "../utils/saveStickerLocally";
import { prepareImageForReplicate } from "../utils/imagePrep";
import type { RootStackParamList } from "../types/navigation";

type GeneratorNav = NativeStackNavigationProp<RootStackParamList, "Generator">;

function GeneratorScreenInner() {
  const navigation = useNavigation<GeneratorNav>();
  const { addSticker } = useRecentStickers();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [style, setStyle] = useState<StickerStyle | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera access is needed to take a selfie.");
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
    if (!photoUri || !style) {
      Alert.alert("Pick a photo and a style first.");
      return;
    }
    if (!hasReplicateToken()) {
      Alert.alert(
        "API key missing",
        "Add EXPO_PUBLIC_REPLICATE_API_TOKEN to the .env file in the funmoji folder, then fully restart the dev server (stop and run npx expo start again)."
      );
      return;
    }
    setLoading(true);
    try {
      const preparedUri = await prepareImageForReplicate(photoUri);
      const faceImageUrl = await detectAndCropFace(preparedUri);
      const imageForSticker = faceImageUrl ?? preparedUri;
      const resultUrl = await generateSticker(imageForSticker, style);
      const localUri = await saveStickerLocally(resultUrl);
      await addSticker(localUri);
      setLoading(false);
      navigation.replace("Preview", { imageUri: localUri });
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : String(e);
      const friendly =
        msg.includes("REPLICATE_API_TOKEN") || msg.includes("Missing")
          ? "Replicate API key not set. Add EXPO_PUBLIC_REPLICATE_API_TOKEN to your .env and restart the dev server."
          : msg.includes("fetch") || msg.includes("Network") || msg.includes("Failed to fetch")
            ? "Network error. Check your connection and try again."
            : msg.includes("401") || msg.includes("403")
              ? "Invalid Replicate API key. Check your token at replicate.com/account/api-tokens"
              : msg;
      Alert.alert("Couldn’t create sticker", friendly);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-dark">
        <LoadingAnimation message="Creating your sticker…" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <View className="flex-1 px-6 pt-4 pb-8">
        <Text className="text-xl font-bold text-white mb-1">New Sticker</Text>
        <Text className="text-brand-neon/80 text-sm mb-6">
          Add a selfie and choose a style
        </Text>

        <View className="flex-row gap-4 mb-6">
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
          <View className="rounded-2xl overflow-hidden border-2 border-brand-neon mb-6 bg-brand-purple/50">
            <Image
              source={{ uri: photoUri }}
              className="w-full rounded-2xl"
              style={{ aspectRatio: 1, maxHeight: 220 }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View
            className="rounded-2xl border-2 border-dashed border-brand-accent/40 py-12 mb-6 items-center"
            style={{ backgroundColor: "rgba(26,10,46,0.5)" }}
          >
            <ImagePlus size={48} color="#6b21a8" />
            <Text className="text-brand-neon/60 mt-2">No photo selected</Text>
          </View>
        )}

        <Text className="text-brand-neon/90 font-semibold mb-3">Style</Text>
        <StyleSelector selected={style} onSelect={setStyle} />

        <Pressable
          onPress={handleGenerate}
          disabled={!photoUri || !style}
          className="mt-8 rounded-2xl overflow-hidden"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View
            className="py-4 rounded-2xl flex-row items-center justify-center gap-2"
            style={{
              backgroundColor: photoUri && style ? "#a855f7" : "#4c1d95",
              opacity: photoUri && style ? 1 : 0.6,
            }}
          >
            <Sparkles size={22} color="#fff" />
            <Text className="text-lg font-bold text-white">Generate</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const GeneratorScreen = memo(GeneratorScreenInner);
GeneratorScreen.displayName = "GeneratorScreen";
export { GeneratorScreen };
