import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Reminder } from "@/context/HealthContext";

interface Props {
  reminder: Reminder;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

const TYPE_ICONS: Record<Reminder["type"], keyof typeof Ionicons.glyphMap> = {
  medication: "medical",
  appointment: "calendar",
  hydration: "water",
  custom: "alarm",
};

export function ReminderCard({ reminder, onToggle, onDelete }: Props) {
  const colors = useColors();
  const icon = TYPE_ICONS[reminder.type];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: reminder.active ? 1 : 0.55,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: colors.primary + "15" },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {reminder.title}
        </Text>
        <View style={styles.meta}>
          {reminder.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>
              {reminder.description}
            </Text>
          ) : null}
          <View style={styles.timeRow}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {reminder.time}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <Switch
          value={reminder.active}
          onValueChange={(val) => onToggle(reminder.id, val)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
        <Pressable onPress={() => onDelete(reminder.id)} hitSlop={8}>
          <Ionicons
            name="trash-outline"
            size={16}
            color={colors.mutedForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  time: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
});
