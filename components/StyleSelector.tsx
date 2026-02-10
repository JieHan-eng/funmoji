import React from "react";
import { View, Text, Pressable } from "react-native";
import type { StickerStyle } from "../services/replicateApi";

const STYLES: { id: StickerStyle; label: string; emoji: string }[] = [
  { id: "anime", label: "Anime", emoji: "✨" },
  { id: "3d-pixar", label: "3D Pixar", emoji: "🎬" },
  { id: "comic", label: "Comic", emoji: "💬" },
  { id: "pop-art", label: "Pop Art", emoji: "🎨" },
];

interface StyleSelectorProps {
  selected: StickerStyle | null;
  onSelect: (style: StickerStyle) => void;
}

export function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <View className="flex-row flex-wrap justify-center gap-3">
      {STYLES.map(({ id, label, emoji }) => {
        const isSelected = selected === id;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            className="rounded-2xl overflow-hidden"
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <View
              className="px-5 py-4 rounded-2xl border-2 items-center min-w-[80px]"
              style={{
                backgroundColor: isSelected ? "#a855f7" : "rgba(26,10,46,0.9)",
                borderColor: isSelected ? "#c084fc" : "#4c1d95",
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</Text>
              <Text
                className="mt-1 font-semibold text-sm"
                style={{ color: isSelected ? "#fff" : "#c084fc" }}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
