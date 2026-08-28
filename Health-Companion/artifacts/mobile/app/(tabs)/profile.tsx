import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, TextInput, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useHealth } from "@/context/HealthContext";
import { BottomSheet } from "@/components/BottomSheet";
import { TagInput } from "@/components/TagInput";
import { useAuth } from "@/lib/auth";

type TabSection = "profile" | "meds" | "family" | "emergency";

export default function ProfileTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { profile, updateProfile, medications, addMedication, removeMedication, familyMembers, addFamilyMember, reminders, addReminder } = useHealth();
  const [activeTab, setActiveTab] = useState<TabSection>("profile");

  // Profile Edit State
  const handleProfileUpdate = (key: string, value: string) => {
    updateProfile({ [key]: value });
  };

  const handleAllergiesUpdate = (allergies: string[]) => updateProfile({ allergies });
  const handleConditionsUpdate = (conditions: string[]) => updateProfile({ conditions });

  // Medication Modal State
  const [showAddMed, setShowAddMed] = useState(false);
  const [medForm, setMedForm] = useState({ name: "", dosage: "", frequency: "", prescribedFor: "", notes: "" });

  const saveMedication = async () => {
    if (!medForm.name) return;
    await addMedication({ ...medForm });
    setShowAddMed(false);
    setMedForm({ name: "", dosage: "", frequency: "", prescribedFor: "", notes: "" });
  };

  // SOS state
  const [showSOS, setShowSOS] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 20 : insets.top, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Health Profile</Text>
          <Pressable onPress={logout} style={[styles.logoutBtn, { backgroundColor: colors.secondary }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { id: "profile", label: "Profile", icon: "person" },
            { id: "meds", label: "Medications", icon: "medical" },
            { id: "family", label: "Family", icon: "people" },
            { id: "emergency", label: "Emergency", icon: "warning" },
          ].map(tab => (
            <Pressable key={tab.id} style={[styles.tabBtn, activeTab === tab.id && { backgroundColor: colors.primary }]} onPress={() => setActiveTab(tab.id as TabSection)}>
              <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primaryForeground : colors.mutedForeground }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {activeTab === "profile" && (
          <View style={styles.section}>
            <View style={styles.avatarSection}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitials}>{(user?.firstName?.[0] || "")}{(user?.lastName?.[0] || "")}</Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Information</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Age</Text>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={profile.age} onChangeText={v => handleProfileUpdate("age", v)} placeholder="e.g. 35" placeholderTextColor={colors.mutedForeground} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Blood Type</Text>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={profile.bloodType} onChangeText={v => handleProfileUpdate("bloodType", v)} placeholder="e.g. O+" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Weight (kg)</Text>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={profile.weight} onChangeText={v => handleProfileUpdate("weight", v)} placeholder="e.g. 70" placeholderTextColor={colors.mutedForeground} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Height (cm)</Text>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={profile.height} onChangeText={v => handleProfileUpdate("height", v)} placeholder="e.g. 175" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Medical Conditions</Text>
              <TagInput tags={profile.conditions} onAdd={t => handleConditionsUpdate([...profile.conditions, t])} onRemove={t => handleConditionsUpdate(profile.conditions.filter(x => x !== t))} placeholder="Add condition..." />
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Allergies</Text>
              <TagInput tags={profile.allergies} onAdd={t => handleAllergiesUpdate([...profile.allergies, t])} onRemove={t => handleAllergiesUpdate(profile.allergies.filter(x => x !== t))} placeholder="Add allergy..." />
            </View>
          </View>
        )}

        {activeTab === "meds" && (
          <View style={styles.section}>
            {medications?.map(med => (
              <View key={med.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.medHeader}>
                  <Ionicons name="medical" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, { color: colors.foreground }]}>{med.name}</Text>
                    <Text style={[styles.medDosage, { color: colors.mutedForeground }]}>{med.dosage} • {med.frequency}</Text>
                  </View>
                  <Pressable onPress={() => removeMedication(med.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.riskEmergency} />
                  </Pressable>
                </View>
                {med.prescribedFor && <Text style={[styles.medFor, { color: colors.mutedForeground }]}>For: {med.prescribedFor}</Text>}
              </View>
            ))}
            
            <Pressable style={[styles.addBtn, { backgroundColor: colors.secondary }]} onPress={() => setShowAddMed(true)}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Medication</Text>
            </Pressable>
          </View>
        )}

        {activeTab === "family" && (
          <View style={styles.section}>
            {familyMembers?.map(member => (
              <View key={member.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.memberHeader}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primary + '30' }]}>
                    <Text style={[styles.memberAvatarText, { color: colors.primary }]}>{member.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, { color: colors.foreground }]}>{member.name}</Text>
                    <Text style={[styles.medDosage, { color: colors.mutedForeground }]}>{member.relationship} • {member.age} yrs</Text>
                  </View>
                </View>
              </View>
            ))}
            <Pressable style={[styles.addBtn, { backgroundColor: colors.secondary }]}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Family Member</Text>
            </Pressable>
          </View>
        )}

        {activeTab === "emergency" && (
          <View style={styles.section}>
            <Pressable style={[styles.sosCard, { backgroundColor: colors.riskEmergency }]} onPress={() => setShowSOS(true)}>
              <Ionicons name="warning" size={40} color="#fff" />
              <Text style={styles.sosTitle}>SOS Emergency</Text>
              <Text style={styles.sosSub}>Tap to view critical info & call help</Text>
            </Pressable>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Emergency Contacts</Text>
              <Pressable style={[styles.addBtn, { backgroundColor: colors.secondary }]}>
                <Ionicons name="add" size={20} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Contact</Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Reminders</Text>
              {reminders.filter(r => r.active).map(r => (
                <View key={r.id} style={styles.reminderRow}>
                  <Ionicons name="alarm" size={20} color={colors.primary} />
                  <Text style={[styles.reminderText, { color: colors.foreground }]}>{r.title} ({r.time})</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={showAddMed} onClose={() => setShowAddMed(false)} title="Add Medication">
        <View style={styles.formGap}>
          <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
          <TextInput style={[styles.inputFull, { borderColor: colors.border, color: colors.foreground }]} value={medForm.name} onChangeText={v => setMedForm({...medForm, name: v})} placeholder="e.g. Amoxicillin" placeholderTextColor={colors.mutedForeground} />
          
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Dosage</Text>
              <TextInput style={[styles.inputFull, { borderColor: colors.border, color: colors.foreground }]} value={medForm.dosage} onChangeText={v => setMedForm({...medForm, dosage: v})} placeholder="e.g. 500mg" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Frequency</Text>
              <TextInput style={[styles.inputFull, { borderColor: colors.border, color: colors.foreground }]} value={medForm.frequency} onChangeText={v => setMedForm({...medForm, frequency: v})} placeholder="e.g. Twice daily" placeholderTextColor={colors.mutedForeground} />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>For (Condition)</Text>
          <TextInput style={[styles.inputFull, { borderColor: colors.border, color: colors.foreground }]} value={medForm.prescribedFor} onChangeText={v => setMedForm({...medForm, prescribedFor: v})} placeholder="e.g. Infection" placeholderTextColor={colors.mutedForeground} />
          
          <Pressable style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={saveMedication}>
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Save Medication</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet visible={showSOS} onClose={() => setShowSOS(false)} title="Emergency Info">
        <View style={styles.sosModal}>
          <Text style={[styles.sosModalName, { color: colors.foreground }]}>{user?.firstName} {user?.lastName}</Text>
          <View style={styles.sosDataRow}>
            <Text style={[styles.sosDataLabel, { color: colors.mutedForeground }]}>Blood Type:</Text>
            <Text style={[styles.sosDataValue, { color: colors.riskEmergency }]}>{profile.bloodType || "Unknown"}</Text>
          </View>
          <View style={styles.sosDataRow}>
            <Text style={[styles.sosDataLabel, { color: colors.mutedForeground }]}>Allergies:</Text>
            <Text style={[styles.sosDataValue, { color: colors.foreground }]}>{profile.allergies.join(", ") || "None"}</Text>
          </View>
          <View style={styles.sosDataRow}>
            <Text style={[styles.sosDataLabel, { color: colors.mutedForeground }]}>Conditions:</Text>
            <Text style={[styles.sosDataValue, { color: colors.foreground }]}>{profile.conditions.join(", ") || "None"}</Text>
          </View>
          <Pressable style={[styles.callBtn, { backgroundColor: colors.riskEmergency }]} onPress={() => Linking.openURL("tel:112")}>
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.callBtnText}>Call 112 Emergency</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  tabsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "transparent" },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { gap: 16 },
  avatarSection: { alignItems: "center", marginVertical: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputRow: { flexDirection: "row", gap: 12 },
  inputGroup: { flex: 1, gap: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  medHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  medName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  medDosage: { fontSize: 14, fontFamily: "Inter_400Regular" },
  medFor: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  addBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  memberAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sosCard: { alignItems: "center", padding: 32, borderRadius: 16, gap: 8 },
  sosTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  sosSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reminderText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  formGap: { gap: 12 },
  inputFull: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sosModal: { gap: 16 },
  sosModalName: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 8 },
  sosDataRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#334155" },
  sosDataLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  sosDataValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 12, marginTop: 16 },
  callBtnText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
});