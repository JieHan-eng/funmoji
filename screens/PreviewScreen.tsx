import React, { memo, useState } from "react";
import { View, Text, Image, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { MessageCircle, Send } from "lucide-react-native";
import { formatForWhatsApp, formatForTelegram } from "../utils/stickerFormatter";
import type { RootStackParamList } from "../types/navigation";

type PreviewRoute = RouteProp<RootStackParamList, "Preview">;

function PreviewScreenInner() {
  const navigation = useNavigation();
  const route = useRoute<PreviewRoute>();
  const { imageUri, imageUris } = route.params;
  const uris = imageUris?.length ? imageUris : imageUri ? [imageUri] : [];
  const [busy, setBusy] = useState(false);

  const shareSticker = async (uri: string, format: "whatsapp" | "telegram") => {
    if (busy) return;
    setBusy(true);
    try {
      const { uri: exportUri } =
        format === "whatsapp"
          ? await formatForWhatsApp(uri)
          : await formatForTelegram(uri);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing not available",
          "Save the sticker from the app and add it manually to WhatsApp or Telegram."
        );
        setBusy(false);
        return;
      }
      await Sharing.shareAsync(exportUri, {
        mimeType: "image/png",
        dialogTitle: format === "whatsapp" ? "Add to WhatsApp" : "Add to Telegram",
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      Alert.alert("Export failed", msg);
    } finally {
      setBusy(false);
    }
  };

  if (uris.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
        <View className="flex-1 px-6 pt-4">
          <Text className="text-white">No sticker to show.</Text>
          <Pressable onPress={() => navigation.navigate("Home")} className="mt-4 py-3">
            <Text className="text-brand-neon">Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xl font-bold text-white mb-1">
          {uris.length > 1 ? "Your Stickers" : "Your Sticker"}
        </Text>
        <Text className="text-brand-neon/80 text-sm mb-6">
          {uris.length > 1
            ? "Share each to WhatsApp or Telegram"
            : "Share to WhatsApp or Telegram"}
        </Text>

        {uris.map((uri, index) => (
          <View
            key={uri}
            className="mb-6 rounded-3xl overflow-hidden border-[6px] border-white"
            style={{
              shadowColor: "#c084fc",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <View style={{ width: "100%", aspectRatio: 1, maxHeight: 280, alignSelf: "center" }}>
              <Image
                source={{ uri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            {uris.length > 1 ? (
              <Text className="text-brand-neon/60 text-center py-2 text-sm">
                Sticker {index + 1} of {uris.length}
              </Text>
            ) : null}
            <View className="flex-row gap-3 px-4 pb-4">
              <Pressable
                onPress={() => shareSticker(uri, "whatsapp")}
                disabled={busy}
                className="flex-1 rounded-2xl overflow-hidden"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <View className="py-3 rounded-2xl bg-[#25D366] flex-row items-center justify-center gap-2">
                  <MessageCircle size={20} color="#fff" />
                  <Text className="font-bold text-white text-sm">WhatsApp</Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => shareSticker(uri, "telegram")}
                disabled={busy}
                className="flex-1 rounded-2xl overflow-hidden"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              >
                <View className="py-3 rounded-2xl bg-[#0088cc] flex-row items-center justify-center gap-2">
                  <Send size={20} color="#fff" />
                  <Text className="font-bold text-white text-sm">Telegram</Text>
                </View>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => navigation.navigate("Home")}
          className="mt-4 py-3 rounded-2xl border-2 border-brand-neon"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-center font-semibold text-brand-neon">
            Back to Home
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const PreviewScreen = memo(PreviewScreenInner);
PreviewScreen.displayName = "PreviewScreen";
export { PreviewScreen };
