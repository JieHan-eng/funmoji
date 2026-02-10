import React, { memo, useState } from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { MessageCircle, Send } from "lucide-react-native";
import { formatForWhatsApp, formatForTelegram } from "../utils/stickerFormatter";
import type { RootStackParamList } from "../types/navigation";

type PreviewRoute = RouteProp<RootStackParamList, "Preview">;

function PreviewScreenInner() {
  const navigation = useNavigation();
  const route = useRoute<PreviewRoute>();
  const { imageUri } = route.params;
  const [busy, setBusy] = useState(false);

  const shareSticker = async (format: "whatsapp" | "telegram") => {
    if (busy) return;
    setBusy(true);
    try {
      const { uri } =
        format === "whatsapp"
          ? await formatForWhatsApp(imageUri)
          : await formatForTelegram(imageUri);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing not available",
          "Save the sticker from the app and add it manually to WhatsApp or Telegram."
        );
        setBusy(false);
        return;
      }
      await Sharing.shareAsync(uri, {
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

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <View className="flex-1 px-6 pt-4 pb-8">
        <Text className="text-xl font-bold text-white mb-1">Your Sticker</Text>
        <Text className="text-brand-neon/80 text-sm mb-6">
          Share to WhatsApp or Telegram
        </Text>

        <View
          className="rounded-3xl overflow-hidden border-[6px] border-white self-center mb-8"
          style={{
            width: 280,
            height: 280,
            shadowColor: "#c084fc",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Image
            source={{ uri: imageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>

        <View className="gap-4">
          <Pressable
            onPress={() => shareSticker("whatsapp")}
            disabled={busy}
            className="rounded-2xl overflow-hidden"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <View className="py-4 rounded-2xl bg-[#25D366] flex-row items-center justify-center gap-2">
              <MessageCircle size={22} color="#fff" />
              <Text className="text-lg font-bold text-white">
                Add to WhatsApp
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => shareSticker("telegram")}
            disabled={busy}
            className="rounded-2xl overflow-hidden"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <View className="py-4 rounded-2xl bg-[#0088cc] flex-row items-center justify-center gap-2">
              <Send size={22} color="#fff" />
              <Text className="text-lg font-bold text-white">
                Add to Telegram
              </Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate("Home")}
          className="mt-8 py-3 rounded-2xl border-2 border-brand-neon"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-center font-semibold text-brand-neon">
            Back to Home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const PreviewScreen = memo(PreviewScreenInner);
PreviewScreen.displayName = "PreviewScreen";
export { PreviewScreen };
