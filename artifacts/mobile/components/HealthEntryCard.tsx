import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { HealthEntry } from "@/context/HealthContext";
import { RiskBadge } from "./RiskBadge";

interface Props {
  entry: HealthEntry;
  onDelete: (id: string) => void;
}

export function HealthEntryCard({ entry, onDelete }: Props) {
  const colors = useColors();
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.meta}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            {dateStr} · {timeStr}
          </Text>
          <RiskBadge level={entry.riskLevel} />
        </View>
        <Pressable onPress={() => onDelete(entry.id)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <View style={styles.symptoms}>
        {entry.symptoms.map((s, i) => (
          <View
            key={i}
            style={[styles.chip, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>
              {s}
            </Text>
          </View>
        ))}
      </View>
      {entry.notes ? (
        <Text style={[styles.notes, { color: colors.mutedForeground }]}>
          {entry.notes}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderWidth: 1 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  symptoms: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  notes: { fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: "Inter_400Regular" },
});
