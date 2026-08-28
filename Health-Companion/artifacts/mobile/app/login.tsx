import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Animated.View style={[styles.logoContainer, { backgroundColor: colors.primary + "20", transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="pulse" size={64} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.title, { color: colors.foreground }]}>Health Companion</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your AI-powered health partner</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "chatbubble-ellipses", title: "AI Health Chat", desc: "Expert medical guidance anytime" },
          { icon: "analytics", title: "Health Insights", desc: "Track symptoms and discover patterns" },
          { icon: "medkit", title: "Medical Copilot", desc: "Understand diagnoses and prescriptions" },
          { icon: "warning", title: "Emergency SOS", desc: "Instant access to critical care info" }
        ].map((feat, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name={feat.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feat.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{feat.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable 
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
          onPress={() => login("signup")}
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create Account</Text>
        </Pressable>
        <Pressable 
          style={[styles.secondaryBtn, { borderColor: colors.primary }]} 
          onPress={() => login("login")}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 40, marginTop: 40 },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: "center", alignItems: "center",
    marginBottom: 24
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 8 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 16 },
  features: { gap: 12, marginBottom: 40 },
  featureCard: {
    flexDirection: "row", alignItems: "center",
    padding: 16, borderRadius: 16, borderWidth: 1, gap: 16
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center"
  },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  featureDesc: { fontFamily: "Inter_400Regular", fontSize: 14 },
  actions: { gap: 16 },
  primaryBtn: {
    padding: 16, borderRadius: 24, alignItems: "center", justifyContent: "center"
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  secondaryBtn: {
    padding: 16, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center"
  },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16 }
});