import React, { memo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Smile } from "lucide-react-native";
import { StickerCard } from "../components/StickerCard";
import { useRecentStickers } from "../context/RecentStickersContext";
import type { RootStackParamList } from "../types/navigation";

type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

function HomeScreenInner() {
  const navigation = useNavigation<HomeNav>();
  const { recentStickers } = useRecentStickers();

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={["top"]}>
      <View className="flex-1 px-6 pt-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Smile size={28} color="#c084fc" />
          <Text className="text-3xl font-bold text-white">FunMoji</Text>
        </View>
        <Text className="text-brand-neon/80 text-sm mb-8">
          Turn your selfie into AI stickers
        </Text>

        <Pressable
          onPress={() => navigation.navigate("Generator")}
          className="rounded-3xl overflow-hidden mb-10"
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        >
          <View
            className="py-5 rounded-3xl border-2 border-brand-neon flex-row items-center justify-center gap-3"
            style={{
              backgroundColor: "rgba(168,85,247,0.2)",
              shadowColor: "#c084fc",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Plus size={26} color="#c084fc" strokeWidth={2.5} />
            <Text className="text-xl font-bold text-brand-neon">
              Create New Sticker
            </Text>
          </View>
        </Pressable>

        <Text className="text-brand-neon/90 font-semibold text-base mb-3">
          My Recent Stickers
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {recentStickers.length === 0 ? (
            <View className="rounded-2xl border-2 border-brand-accent/40 border-dashed px-8 py-6 items-center justify-center mr-4" style={{ width: 120, height: 120 }}>
              <Text className="text-brand-neon/60 text-xs text-center">
                No stickers yet
              </Text>
            </View>
          ) : (
            recentStickers.map((s) => (
              <StickerCard
                key={s.id}
                uri={s.uri}
                onPress={() => navigation.navigate("Preview", { imageUri: s.uri })}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const HomeScreen = memo(HomeScreenInner);
HomeScreen.displayName = "HomeScreen";
export { HomeScreen };
