import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { RiskLevel } from "@/context/HealthContext";

interface Props {
  level: RiskLevel | "critical";
}

export function RiskBadge({ level }: Props) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (level === "emergency" || level === "critical") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [level, pulseAnim]);

  const colorMap: Record<string, string> = {
    low: colors.riskLow,
    medium: colors.riskMedium,
    high: colors.riskHigh,
    emergency: colors.riskEmergency,
    critical: colors.riskEmergency,
  };

  const color = colorMap[level];

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: color + "20", borderColor: color, opacity: pulseAnim },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{level.toUpperCase()}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    alignSelf: "flex-start",
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});