import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder: string;
}

export function TagInput({ tags, onAdd, onRemove, placeholder }: Props) {
  const colors = useColors();
  const [text, setText] = useState("");

  const handleTextChange = (val: string) => {
    if (val.endsWith(",") || val.endsWith(" ")) {
      const newTag = val.slice(0, -1).trim();
      if (newTag && !tags.includes(newTag)) {
        onAdd(newTag);
      }
      setText("");
    } else {
      setText(val);
    }
  };

  const onSubmit = () => {
    const newTag = text.trim();
    if (newTag && !tags.includes(newTag)) {
      onAdd(newTag);
    }
    setText("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.tagsContainer}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
            <Pressable onPress={() => onRemove(tag)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
      </View>
      <TextInput
        style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
        value={text}
        onChangeText={handleTextChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  removeBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});