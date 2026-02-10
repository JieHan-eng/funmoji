import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Loader2 } from "lucide-react-native";

export function LoadingAnimation({ message = "Creating your sticker…" }: { message?: string }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1
    );
    scale.value = withRepeat(
      withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedIcon = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View style={animatedIcon}>
        <Loader2 size={56} color="#c084fc" strokeWidth={2} />
      </Animated.View>
      <Text className="mt-6 text-brand-neon text-lg font-medium text-center">
        {message}
      </Text>
      <Text className="mt-2 text-brand-neon/70 text-sm text-center">
        This usually takes ~20 seconds
      </Text>
    </View>
  );
}
