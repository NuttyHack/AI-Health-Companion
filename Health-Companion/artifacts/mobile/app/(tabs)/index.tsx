import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { getBaseUrl } from "@/lib/api";
import { useHealth } from "@/context/HealthContext";
import { MarkdownText } from "@/components/MarkdownText";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  timestamp: number;
}

const SUGGESTIONS = [
  "I have a headache and fever",
  "My throat is sore and I feel tired",
  "I have chest tightness",
  "I have a rash on my arm",
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { saveConversation } = useHealth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [researchMode, setResearchMode] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const waveformAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (voiceMode && isStreaming) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveformAnim, { toValue: 0.5, duration: 400, useNativeDriver: true })
        ])
      ).start();
    } else {
      waveformAnim.setValue(0.5);
    }
  }, [voiceMode, isStreaming]);

  useEffect(() => {
    return () => {
      if (messages.length >= 2) {
        saveConversation({
          timestamp: Date.now(),
          messages: messages.map(m => ({ role: m.role, content: m.content, imageUri: m.imageUri })),
        });
      }
    };
  }, [messages]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;

    const newMsgs = [...messages, { id: Date.now().toString(), role: "user" as const, content: trimmed || "Analyzed Image", imageUri: pendingImage?.uri, timestamp: Date.now() }];
    setMessages(newMsgs);
    setInputText("");
    const imgToSend = pendingImage;
    setPendingImage(null);
    setIsStreaming(true);
    setShowEmergency(false);

    try {
      const response = await fetch(`${getBaseUrl()}api/health-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          mode: researchMode ? "research" : undefined,
          ...(imgToSend ? { imageBase64: imgToSend.base64, imageMimeType: imgToSend.mimeType } : {})
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      
      const asstMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: asstMsgId, role: "assistant", content: "", timestamp: Date.now() }]);

      while (true && reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullResponse += parsed.content;
              setMessages(prev => prev.map(m => m.id === asstMsgId ? { ...m, content: fullResponse } : m));
            }
          } catch (e) {}
        }
      }

      if (fullResponse.includes("EMERGENCY")) setShowEmergency(true);
      if (voiceMode) Speech.speak(fullResponse, { language: "en-ZA", rate: 0.9 });
      
      if (newMsgs.length >= 9) { // At 10 messages including response
        saveConversation({ timestamp: Date.now(), messages: [...newMsgs, { role: "assistant", content: fullResponse }] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  };

  const pickCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 || "", mimeType: result.assets[0].mimeType || "image/jpeg" });
    }
  };

  const pickGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 || "", mimeType: result.assets[0].mimeType || "image/jpeg" });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 20 : insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Hello, {user?.firstName || "Friend"}</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>AI Health Companion</Text>
        </View>
        <Pressable 
          onPress={() => setResearchMode(!researchMode)}
          style={[styles.researchChip, { backgroundColor: researchMode ? colors.primary : colors.secondary }]}
        >
          <Ionicons name="flask" size={16} color={researchMode ? colors.primaryForeground : colors.primary} />
          <Text style={[styles.researchText, { color: researchMode ? colors.primaryForeground : colors.primary }]}>Research</Text>
        </Pressable>
      </View>

      {showEmergency && (
        <View style={[styles.emergencyBanner, { backgroundColor: colors.riskEmergency }]}>
          <Ionicons name="warning" size={24} color="#fff" />
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.emergencyTitle}>Seek Immediate Care</Text>
            <Text style={styles.emergencySub}>Your symptoms indicate a possible emergency.</Text>
          </View>
          <Pressable style={styles.emergencyBtn} onPress={() => Linking.openURL("tel:112")}>
            <Text style={styles.emergencyBtnText}>Call 112</Text>
          </Pressable>
        </View>
      )}

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="medical" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>How can I help you today?</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Describe your symptoms, ask a medical question, or upload a photo of a rash or prescription.</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((sug, i) => (
              <Pressable key={i} style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleSend(sug)}>
                <Text style={[styles.suggestionText, { color: colors.foreground }]}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          renderItem={({ item }) => (
            <View style={[styles.bubbleWrap, item.role === "user" ? styles.bubbleUser : styles.bubbleAsst]}>
              <View style={[styles.bubble, { backgroundColor: item.role === "user" ? colors.primary : colors.card, borderRadius: colors.radius, borderColor: item.role === "user" ? colors.primary : colors.border, borderWidth: 1 }]}>
                {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.bubbleImg} />}
                <MarkdownText text={item.content} style={{ color: item.role === "user" ? colors.primaryForeground : colors.foreground }} />
              </View>
            </View>
          )}
        />
      )}

      {pendingImage && (
        <View style={[styles.previewBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewImg} />
          <Text style={[styles.previewText, { color: colors.foreground }]}>Image attached</Text>
          <Pressable onPress={() => setPendingImage(null)}><Ionicons name="close-circle" size={24} color={colors.mutedForeground} /></Pressable>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.card, paddingBottom: Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12), borderTopColor: colors.border }]}>
        <View style={styles.actionsRow}>
          <Pressable onPress={pickCamera} style={styles.iconBtn}>
            <Ionicons name="camera" size={24} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={pickGallery} style={styles.iconBtn}>
            <Ionicons name="image" size={24} color={colors.mutedForeground} />
          </Pressable>
          <Pressable 
            onPress={() => {
              if (voiceMode) { setVoiceMode(false); Speech.stop(); }
              else setVoiceMode(true);
            }} 
            style={[styles.iconBtn, voiceMode && { backgroundColor: colors.riskEmergency + '30', borderRadius: 20 }]}
          >
            {voiceMode ? (
              <Animated.View style={{ transform: [{ scale: waveformAnim }] }}>
                <Ionicons name="mic" size={24} color={colors.riskEmergency} />
              </Animated.View>
            ) : (
              <Ionicons name="mic-outline" size={24} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>
        <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={voiceMode ? "Listening..." : "Type your message..."}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
          />
          <Pressable onPress={() => handleSend(inputText)} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-up" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  researchChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  researchText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emergencyBanner: { flexDirection: "row", padding: 16, alignItems: "center", gap: 12 },
  emergencyTextWrap: { flex: 1 },
  emergencyTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  emergencySub: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },
  emergencyBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  emergencyBtnText: { color: "#DC2626", fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  suggestions: { width: "100%", gap: 8, marginTop: 16 },
  suggestionChip: { padding: 16, borderRadius: 12, borderWidth: 1 },
  suggestionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  chatContent: { padding: 16, gap: 16 },
  bubbleWrap: { width: "100%", flexDirection: "row" },
  bubbleUser: { justifyContent: "flex-end" },
  bubbleAsst: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", padding: 14 },
  bubbleImg: { width: 200, height: 200, borderRadius: 8, marginBottom: 8 },
  previewBar: { flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: 1, gap: 12 },
  previewImg: { width: 40, height: 40, borderRadius: 6 },
  previewText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  inputBar: { padding: 12, borderTopWidth: 1, gap: 8 },
  actionsRow: { flexDirection: "row", gap: 16, paddingHorizontal: 4 },
  iconBtn: { padding: 4 },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", borderWidth: 1, borderRadius: 20, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 2 },
});