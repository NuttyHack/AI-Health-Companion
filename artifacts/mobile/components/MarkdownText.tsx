import React from "react";
import { StyleSheet, Text, View, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  text: string;
  style?: TextStyle;
}

export function MarkdownText({ text, style }: Props) {
  const colors = useColors();
  
  if (!text) return null;

  const lines = text.split("\n");
  
  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        if (line.startsWith("## ")) {
          return (
            <View key={index} style={[styles.headerContainer, { borderLeftColor: colors.primary }]}>
              <Text style={[styles.header, { color: colors.foreground }, style]}>
                {line.substring(3).replace(/\*\*/g, "")}
              </Text>
            </View>
          );
        }
        
        if (line.startsWith("- ")) {
          const content = line.substring(2);
          return (
            <View key={index} style={styles.bulletContainer}>
              <View style={[styles.bullet, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.text, { color: colors.foreground }, style]}>
                {renderBold(content, colors.foreground, style)}
              </Text>
            </View>
          );
        }
        
        if (line.trim() === "") {
          return <View key={index} style={styles.spacer} />;
        }
        
        return (
          <Text key={index} style={[styles.text, { color: colors.foreground }, style]}>
            {renderBold(line, colors.foreground, style)}
          </Text>
        );
      })}
    </View>
  );
}

function renderBold(text: string, color: string, baseStyle?: TextStyle) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={index} style={[{ fontFamily: "Inter_700Bold", color }, baseStyle]}>
          {part.substring(2, part.length - 2)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  headerContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginVertical: 12,
  },
  header: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  bulletContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 8,
    marginVertical: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 8,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  spacer: {
    height: 8,
  },
});