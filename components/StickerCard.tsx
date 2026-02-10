import React from "react";
import { View, Image, Pressable } from "react-native";

interface StickerCardProps {
  uri: string;
  onPress?: () => void;
  size?: number;
}

export function StickerCard({ uri, onPress, size = 120 }: StickerCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        className="rounded-2xl bg-white border-4 border-brand-neon overflow-hidden"
        style={{
          width: size,
          height: size,
          shadowColor: "#c084fc",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Image
          source={{ uri }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
    </Pressable>
  );
}
