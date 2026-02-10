import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import type { PromptCategory } from "../constants/promptCategories";
import { STYLES_FOR_PHOTO, IDEAS_FOR_TEXT } from "../constants/promptCategories";

function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: PromptCategory[];
  selectedId: string | null;
  onSelect: (prompt: string, id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {categories.map(({ id, label, emoji, prompt }) => {
        const isSelected = selectedId === id;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(prompt, id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <View
              className="px-4 py-3 rounded-2xl border-2 items-center"
              style={{
                backgroundColor: isSelected ? "#a855f7" : "rgba(26,10,46,0.9)",
                borderColor: isSelected ? "#c084fc" : "#4c1d95",
              }}
            >
              <Text style={{ fontSize: 20, marginBottom: 2 }}>{emoji}</Text>
              <Text
                className="font-semibold text-xs"
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

interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onSelectCategory: (prompt: string, categoryId: string) => void;
}

export function CategorySelector({
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectorProps) {
  return (
    <View className="gap-4">
      <View>
        <Text className="text-brand-neon/90 font-semibold text-sm mb-2">
          With photo – turn your face into…
        </Text>
        <CategoryChips
          categories={STYLES_FOR_PHOTO}
          selectedId={selectedCategoryId}
          onSelect={onSelectCategory}
        />
      </View>
      <View>
        <Text className="text-brand-neon/90 font-semibold text-sm mb-2">
          From text only – generate…
        </Text>
        <CategoryChips
          categories={IDEAS_FOR_TEXT}
          selectedId={selectedCategoryId}
          onSelect={onSelectCategory}
        />
      </View>
    </View>
  );
}
