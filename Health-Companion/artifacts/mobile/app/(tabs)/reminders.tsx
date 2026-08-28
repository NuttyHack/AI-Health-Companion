import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, TextInput, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/context/HealthContext";
import { getBaseUrl } from "@/lib/api";
import { StreamingResponse } from "@/components/StreamingResponse";

type TabSection = "copilot" | "vision" | "twin";

const COPILOT_MODES = [
  { value: "prep", label: "Appointment Prep", icon: "calendar" },
  { value: "explain_prescription", label: "Explain Prescription", icon: "medical" },
  { value: "explain_diagnosis", label: "Explain Diagnosis", icon: "document-text" },
  { value: "translate_medical", label: "Medical Terms", icon: "language" },
] as const;

const VISION_TYPES = ["General", "Wound", "Skin Condition", "Eye", "Prescription", "Lab Report", "Document"];

export default function CopilotTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, profile, addVisionAnalysis, visionHistory } = useHealth();
  const [activeTab, setActiveTab] = useState<TabSection>("copilot");

  // Copilot State
  const [copilotMode, setCopilotMode] = useState<string>("prep");
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotResult, setCopilotResult] = useState("");
  const [isCopilotStreaming, setIsCopilotStreaming] = useState(false);

  // Vision State
  const [visionType, setVisionType] = useState("General");
  const [visionImage, setVisionImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [visionContext, setVisionContext] = useState("");
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState("");

  // Twin State
  const [twinQuestion, setTwinQuestion] = useState("");
  const [twinResult, setTwinResult] = useState("");
  const [isTwinStreaming, setIsTwinStreaming] = useState(false);
  const healthScore = Math.max(0, 100 - (entries.filter(e => e.riskLevel === 'high' || e.riskLevel === 'emergency').length * 10));

  const generateCopilotReport = async () => {
    if (!copilotInput.trim()) return;
    setCopilotResult("");
    setIsCopilotStreaming(true);
    try {
      const response = await fetch(`${getBaseUrl()}api/medical-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ mode: copilotMode, content: copilotInput, profile, entries })
      });
      streamResponse(response, setCopilotResult, setIsCopilotStreaming);
    } catch (e) {
      setIsCopilotStreaming(false);
    }
  };

  const askTwin = async () => {
    if (!twinQuestion.trim()) return;
    setTwinResult("");
    setIsTwinStreaming(true);
    try {
      const response = await fetch(`${getBaseUrl()}api/medical-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ mode: "health_twin", question: twinQuestion, profile, entries })
      });
      streamResponse(response, setTwinResult, setIsTwinStreaming);
    } catch (e) {
      setIsTwinStreaming(false);
    }
  };

  const streamResponse = async (response: Response, setter: (val: string) => void, loadingSetter: (val: boolean) => void) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
            fullText += parsed.content;
            setter(fullText);
          }
        } catch (e) {}
      }
    }
    loadingSetter(false);
  };

  const analyzeImage = async () => {
    if (!visionImage) return;
    setIsVisionLoading(true);
    try {
      const response = await fetch(`${getBaseUrl()}api/vision-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: visionImage.base64, 
          imageMimeType: visionImage.mimeType, 
          analysisType: visionType, 
          additionalContext: visionContext 
        })
      });
      const data = await response.json();
      if (data.analysis) {
        setVisionResult(data.analysis);
        await addVisionAnalysis({
          timestamp: Date.now(),
          imageUri: visionImage.uri,
          analysisType: visionType,
          result: data.analysis,
          confidence: data.confidence || "High"
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVisionLoading(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    const options = { base64: true, quality: 0.7 };
    const result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      setVisionImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 || "", mimeType: result.assets[0].mimeType || "image/jpeg" });
      setVisionResult("");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 20 : insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.segmentControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Pressable style={[styles.segment, activeTab === "copilot" && { backgroundColor: colors.secondary }]} onPress={() => setActiveTab("copilot")}>
            <Text style={[styles.segmentText, { color: activeTab === "copilot" ? colors.foreground : colors.mutedForeground }]}>Copilot</Text>
          </Pressable>
          <Pressable style={[styles.segment, activeTab === "vision" && { backgroundColor: colors.secondary }]} onPress={() => setActiveTab("vision")}>
            <Text style={[styles.segmentText, { color: activeTab === "vision" ? colors.foreground : colors.mutedForeground }]}>Vision Lab</Text>
          </Pressable>
          <Pressable style={[styles.segment, activeTab === "twin" && { backgroundColor: colors.secondary }]} onPress={() => setActiveTab("twin")}>
            <Text style={[styles.segmentText, { color: activeTab === "twin" ? colors.foreground : colors.mutedForeground }]}>Health Twin</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
        {activeTab === "copilot" && (
          <View style={styles.sectionGap}>
            <View style={styles.modesRow}>
              {COPILOT_MODES.map(mode => (
                <Pressable 
                  key={mode.value} 
                  style={[styles.modeCard, { backgroundColor: copilotMode === mode.value ? colors.primary + '20' : colors.card, borderColor: copilotMode === mode.value ? colors.primary : colors.border }]} 
                  onPress={() => setCopilotMode(mode.value)}
                >
                  <Ionicons name={mode.icon as any} size={24} color={copilotMode === mode.value ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.modeText, { color: copilotMode === mode.value ? colors.primary : colors.foreground }]} numberOfLines={2}>{mode.label}</Text>
                </Pressable>
              ))}
            </View>
            
            <View style={[styles.inputBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.inputArea, { color: colors.foreground }]}
                multiline 
                placeholder="Enter context, symptoms, or text to analyze..."
                placeholderTextColor={colors.mutedForeground}
                value={copilotInput}
                onChangeText={setCopilotInput}
              />
            </View>
            
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: !copilotInput.trim() ? 0.5 : 1 }]} onPress={generateCopilotReport}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Generate Report</Text>
            </Pressable>

            {(copilotResult || isCopilotStreaming) && (
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <StreamingResponse content={copilotResult} isStreaming={isCopilotStreaming} />
              </View>
            )}
          </View>
        )}

        {activeTab === "vision" && (
          <View style={styles.sectionGap}>
            <View style={styles.typeSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {VISION_TYPES.map(type => (
                  <Pressable key={type} style={[styles.typeChip, { backgroundColor: visionType === type ? colors.primary : colors.card, borderColor: visionType === type ? colors.primary : colors.border }]} onPress={() => setVisionType(type)}>
                    <Text style={{ color: visionType === type ? colors.primaryForeground : colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }}>{type}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {!visionImage ? (
              <View style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.input }]}>
                <Ionicons name="scan-outline" size={48} color={colors.primary} />
                <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Scan or Upload Image</Text>
                <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>Analyze wounds, skin conditions, or medical documents</Text>
                <View style={styles.uploadActions}>
                  <Pressable style={[styles.uploadBtn, { backgroundColor: colors.secondary }]} onPress={() => pickImage(true)}>
                    <Ionicons name="camera" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Camera</Text>
                  </Pressable>
                  <Pressable style={[styles.uploadBtn, { backgroundColor: colors.secondary }]} onPress={() => pickImage(false)}>
                    <Ionicons name="image" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Gallery</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.previewContainer}>
                <Image source={{ uri: visionImage.uri }} style={styles.previewFull} />
                <Pressable style={[styles.removeImgBtn, { backgroundColor: colors.riskEmergency }]} onPress={() => { setVisionImage(null); setVisionResult(""); }}>
                  <Ionicons name="trash" size={20} color="#fff" />
                </Pressable>
                
                <TextInput 
                  style={[styles.contextInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Add additional context (optional)..."
                  placeholderTextColor={colors.mutedForeground}
                  value={visionContext}
                  onChangeText={setVisionContext}
                />

                <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isVisionLoading ? 0.5 : 1 }]} onPress={analyzeImage}>
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>{isVisionLoading ? "Analyzing..." : "Analyze Image"}</Text>
                </Pressable>
              </View>
            )}

            {visionResult ? (
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.confidenceBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.riskLow} />
                  <Text style={{ color: colors.riskLow, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>High Confidence</Text>
                </View>
                <StreamingResponse content={visionResult} isStreaming={false} />
              </View>
            ) : null}
          </View>
        )}

        {activeTab === "twin" && (
          <View style={styles.sectionGap}>
            <View style={[styles.twinAvatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatarRing, { borderColor: healthScore > 70 ? colors.riskLow : healthScore > 40 ? colors.riskMedium : colors.riskHigh }]}>
                <View style={[styles.avatarInner, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="person" size={48} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.twinScore, { color: colors.foreground }]}>{healthScore}/100</Text>
              <Text style={[styles.twinLabel, { color: colors.mutedForeground }]}>Health Score</Text>
            </View>

            <View style={[styles.inputBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.inputArea, { color: colors.foreground }]}
                multiline 
                placeholder="Ask your Health Twin: 'What happens if I skip my medication today?' or 'How will this diet affect my condition?'"
                placeholderTextColor={colors.mutedForeground}
                value={twinQuestion}
                onChangeText={setTwinQuestion}
              />
            </View>
            
            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: !twinQuestion.trim() ? 0.5 : 1 }]} onPress={askTwin}>
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Ask My Health Twin</Text>
            </Pressable>

            {(twinResult || isTwinStreaming) && (
              <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <StreamingResponse content={twinResult} isStreaming={isTwinStreaming} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  segmentControl: { flexDirection: "row", borderWidth: 1, borderRadius: 12, overflow: "hidden", padding: 4 },
  segment: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tabContent: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionGap: { gap: 16 },
  modesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeCard: { width: "48%", padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  modeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  inputBox: { borderWidth: 1, borderRadius: 16, minHeight: 120 },
  inputArea: { padding: 16, fontSize: 16, fontFamily: "Inter_400Regular", minHeight: 120, textAlignVertical: "top" },
  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, minHeight: 200, marginTop: 8 },
  typeSelector: { paddingVertical: 4 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  uploadArea: { borderWidth: 2, borderStyle: "dashed", borderRadius: 16, padding: 32, alignItems: "center", gap: 12 },
  uploadTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8 },
  uploadSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
  uploadActions: { flexDirection: "row", gap: 12 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  previewContainer: { gap: 12 },
  previewFull: { width: "100%", height: 300, borderRadius: 16, resizeMode: "cover" },
  removeImgBtn: { position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  contextInput: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 15, fontFamily: "Inter_400Regular" },
  confidenceBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, backgroundColor: "#10B98115", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  twinAvatarCard: { alignItems: "center", padding: 32, borderRadius: 16, borderWidth: 1, gap: 8 },
  avatarRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, justifyContent: "center", alignItems: "center" },
  avatarInner: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  twinScore: { fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 8 },
  twinLabel: { fontSize: 14, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 },
});