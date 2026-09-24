import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { RiskLevel } from "@/context/HealthContext";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  timestamp: number;
}

interface Props {
  message: Message;
}

function extractRiskLevel(content: string): RiskLevel | null {
  const match = content.match(/Risk Level:\s*(LOW|MEDIUM|HIGH|EMERGENCY)/i);
  if (!match) return null;
  return match[1].toLowerCase() as RiskLevel;
}

export function ChatBubble({ message }: Props) {
  const colors = useColors();
  const isUser = message.role === "user";
  const riskLevel = isUser ? null : extractRiskLevel(message.content);

  const riskColorMap: Record<RiskLevel, string> = {
    low: colors.riskLow,
    medium: colors.riskMedium,
    high: colors.riskHigh,
    emergency: colors.riskEmergency,
  };
  const riskColor = riskLevel ? riskColorMap[riskLevel] : null;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          { borderRadius: colors.radius },
          isUser
            ? { backgroundColor: colors.primary }
            : {
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              },
        ]}
      >
        {message.imageUri ? (
          <Image source={{ uri: message.imageUri }} style={styles.image} />
        ) : null}
        {message.content ? (
          <Text
            style={[
              styles.text,
              {
                color: isUser ? colors.primaryForeground : colors.foreground,
                marginTop: message.imageUri ? 8 : 0,
              },
            ]}
          >
            {message.content}
          </Text>
        ) : null}
        {riskColor && riskLevel && (
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: riskColor + "20" },
            ]}
          >
            <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
            <Text style={[styles.riskText, { color: riskColor }]}>
              {riskLevel.toUpperCase()} RISK
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  userContainer: { alignItems: "flex-end" },
  assistantContainer: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    resizeMode: "cover",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 4,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
