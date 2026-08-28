import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Platform, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/context/HealthContext";
import { getBaseUrl } from "@/lib/api";
import { BottomSheet } from "@/components/BottomSheet";
import { TagInput } from "@/components/TagInput";
import { RiskBadge } from "@/components/RiskBadge";
import { StreamingResponse } from "@/components/StreamingResponse";

type TabSection = "memory" | "detective";
type RiskLevel = "low" | "medium" | "high" | "emergency";

export default function HealthTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, addEntry, profile } = useHealth();
  const [activeTab, setActiveTab] = useState<TabSection>("memory");
  
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [risk, setRisk] = useState<RiskLevel>("low");
  const [notes, setNotes] = useState("");
  
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [insights, setInsights] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("@last_analyzed").then(setLastAnalyzed);
  }, []);

  const handleAddEntry = async () => {
    if (symptoms.length === 0) return;
    await addEntry({
      timestamp: Date.now(),
      symptoms,
      riskLevel: risk,
      summary: symptoms.join(", "),
      notes: notes || undefined
    });
    setShowAdd(false);
    setSymptoms([]);
    setRisk("low");
    setNotes("");
  };

  const generateInsights = async () => {
    setInsights("");
    setIsStreaming(true);
    try {
      const response = await fetch(`${getBaseUrl()}api/health-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ entries, profile, period })
      });
      
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
              setInsights(fullText);
            }
          } catch (e) {}
        }
      }
      const now = new Date().toLocaleDateString();
      setLastAnalyzed(now);
      AsyncStorage.setItem("@last_analyzed", now);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    !search || e.symptoms.some(s => s.toLowerCase().includes(search.toLowerCase())) || e.summary.toLowerCase().includes(search.toLowerCase())
  );

  const mostCommonSymptom = entries.flatMap(e => e.symptoms).reduce((acc, curr, _, arr) => {
    if (arr.filter(v => v === curr).length > arr.filter(v => v === acc).length) return curr;
    return acc;
  }, "") || "None";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 20 : insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.segmentControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Pressable style={[styles.segment, activeTab === "memory" && { backgroundColor: colors.secondary }]} onPress={() => setActiveTab("memory")}>
            <Text style={[styles.segmentText, { color: activeTab === "memory" ? colors.foreground : colors.mutedForeground }]}>Memory</Text>
          </Pressable>
          <Pressable style={[styles.segment, activeTab === "detective" && { backgroundColor: colors.secondary }]} onPress={() => setActiveTab("detective")}>
            <Text style={[styles.segmentText, { color: activeTab === "detective" ? colors.foreground : colors.mutedForeground }]}>Detective</Text>
          </Pressable>
        </View>
      </View>

      {activeTab === "memory" ? (
        <View style={styles.tabContent}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{entries.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Logs</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{mostCommonSymptom}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Top Symptom</Text>
            </View>
          </View>

          <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.mutedForeground} />
            <TextInput 
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search symptoms..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            data={filteredEntries}
            keyExtractor={e => e.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: item.riskLevel === 'low' ? colors.riskLow : item.riskLevel === 'medium' ? colors.riskMedium : item.riskLevel === 'high' ? colors.riskHigh : colors.riskEmergency, borderLeftWidth: 4 }]}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, { color: colors.mutedForeground }]}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                  <RiskBadge level={item.riskLevel} />
                </View>
                <View style={styles.symptomsRow}>
                  {item.symptoms.map((s, i) => (
                    <View key={i} style={[styles.symptomChip, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.symptomText, { color: colors.foreground }]}>{s}</Text>
                    </View>
                  ))}
                </View>
                {item.notes && <Text style={[styles.entryNotes, { color: colors.mutedForeground }]}>{item.notes}</Text>}
              </View>
            )}
          />

          <Pressable style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 24 : Math.max(insets.bottom, 24) }]} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={32} color={colors.primaryForeground} />
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.detectiveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detectiveHeader}>
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.detectiveTitle, { color: colors.foreground }]}>Intelligence Report</Text>
            </View>
            <View style={styles.periodSelector}>
              {(['week', 'month', 'all'] as const).map(p => (
                <Pressable key={p} style={[styles.periodBtn, period === p && { backgroundColor: colors.secondary }]} onPress={() => setPeriod(p)}>
                  <Text style={[styles.periodText, { color: period === p ? colors.primary : colors.mutedForeground }]}>{p.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={generateInsights}>
              <Text style={[styles.generateBtnText, { color: colors.primaryForeground }]}>Generate Insights</Text>
            </Pressable>
            {lastAnalyzed && <Text style={[styles.lastAnalyzed, { color: colors.mutedForeground }]}>Last analyzed: {lastAnalyzed}</Text>}
          </View>

          {(insights || isStreaming) && (
            <View style={[styles.insightResult, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <StreamingResponse content={insights} isStreaming={isStreaming} />
            </View>
          )}
        </ScrollView>
      )}

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)} title="Log Health Entry">
        <View style={styles.formGap}>
          <Text style={[styles.label, { color: colors.foreground }]}>Symptoms</Text>
          <TagInput tags={symptoms} onAdd={t => setSymptoms([...symptoms, t])} onRemove={t => setSymptoms(symptoms.filter(x => x !== t))} placeholder="e.g. Fever, Headache" />
          
          <Text style={[styles.label, { color: colors.foreground, marginTop: 12 }]}>Risk Level</Text>
          <View style={styles.riskRow}>
            {(['low', 'medium', 'high', 'emergency'] as const).map(r => (
              <Pressable key={r} style={[styles.riskBtn, { borderColor: risk === r ? colors.primary : colors.border, backgroundColor: risk === r ? colors.primary + '20' : 'transparent' }]} onPress={() => setRisk(r)}>
                <Text style={[styles.riskText, { color: risk === r ? colors.primary : colors.foreground }]}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground, marginTop: 12 }]}>Notes</Text>
          <View style={[styles.notesInput, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput style={[styles.input, { color: colors.foreground }]} multiline numberOfLines={3} value={notes} onChangeText={setNotes} placeholder="Additional details..." placeholderTextColor={colors.mutedForeground} />
          </View>

          <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: symptoms.length === 0 ? 0.5 : 1 }]} onPress={handleAddEntry}>
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Save Entry</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
  scrollContent: { padding: 16, gap: 16 },
  listContent: { padding: 16, gap: 12, paddingBottom: 100 },
  statsCard: { flexDirection: "row", margin: 16, marginBottom: 0, padding: 16, borderRadius: 16, borderWidth: 1 },
  statBox: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: "100%" },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, height: 44, fontFamily: "Inter_400Regular", fontSize: 15 },
  entryCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryDate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  symptomsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  symptomChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  symptomText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryNotes: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  fab: { position: "absolute", right: 24, width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  detectiveCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  detectiveHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  detectiveTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  periodSelector: { flexDirection: "row", gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  periodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  generateBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  lastAnalyzed: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  insightResult: { padding: 20, borderRadius: 16, borderWidth: 1, minHeight: 200 },
  formGap: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  riskRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  riskBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  riskText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notesInput: { borderWidth: 1, borderRadius: 12, minHeight: 80 },
  input: { padding: 12, fontSize: 16, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 16 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});