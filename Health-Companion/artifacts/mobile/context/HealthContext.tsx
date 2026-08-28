import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type RiskLevel = "low" | "medium" | "high" | "emergency";

export interface HealthEntry {
  id: string;
  timestamp: number;
  symptoms: string[];
  riskLevel: RiskLevel;
  summary: string;
  notes?: string;
}

export interface Reminder {
  id: string;
  type: "medication" | "appointment" | "hydration" | "custom" | "exercise" | "checkup";
  title: string;
  description?: string;
  time: string;
  active: boolean;
  frequency: "daily" | "weekly" | "once";
  dosage?: string; // for medication reminders
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}

export interface MedicalAid {
  provider: string;
  memberNumber: string;
  planType: string;
  contactNumber: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedFor?: string;
  startDate?: string;
  endDate?: string;
  sideEffects?: string[];
  notes?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: string;
  bloodType?: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyContact?: string;
  profileColor?: string; // for avatar
}

export interface VisionAnalysis {
  id: string;
  timestamp: number;
  imageUri: string;
  analysisType: string;
  result: string;
  confidence?: string;
}

export interface ConversationSession {
  id: string;
  timestamp: number;
  messages: Array<{ role: "user" | "assistant"; content: string; imageUri?: string }>;
  summary?: string;
  riskLevel?: RiskLevel;
}

export interface UserProfile {
  name: string;
  age: string;
  bloodType: string;
  gender?: string;
  weight?: string;
  height?: string;
  conditions: string[];
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  medicalAid: MedicalAid;
  medications: Medication[];
  familyMembers: FamilyMember[];
  language?: "en" | "zu" | "af" | "st" | "xh" | "tn";
  smokingStatus?: "never" | "former" | "current";
  alcoholUse?: "none" | "occasional" | "moderate" | "heavy";
  exerciseFrequency?: "none" | "light" | "moderate" | "active";
  lastUpdated?: number;
}

interface HealthContextType {
  entries: HealthEntry[];
  reminders: Reminder[];
  profile: UserProfile;
  visionHistory: VisionAnalysis[];
  conversations: ConversationSession[];
  addEntry: (entry: Omit<HealthEntry, "id">) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, "id">) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  addMedication: (medication: Omit<Medication, "id">) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  addFamilyMember: (member: Omit<FamilyMember, "id">) => Promise<void>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  addVisionAnalysis: (analysis: Omit<VisionAnalysis, "id">) => Promise<void>;
  saveConversation: (session: Omit<ConversationSession, "id">) => Promise<void>;
  clearConversations: () => Promise<void>;
}

const STORAGE_KEYS = {
  entries: "@health_entries",
  reminders: "@health_reminders",
  profile: "@health_profile",
  visionHistory: "@vision_history",
  conversations: "@conversations",
};

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  age: "",
  bloodType: "",
  gender: undefined,
  weight: "",
  height: "",
  conditions: [],
  allergies: [],
  emergencyContacts: [],
  medicalAid: {
    provider: "",
    memberNumber: "",
    planType: "",
    contactNumber: "",
  },
  medications: [],
  familyMembers: [],
  language: "en",
};

const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: "r-default-1",
    type: "hydration",
    title: "Drink Water",
    description: "Stay hydrated throughout the day",
    time: "08:00",
    active: true,
    frequency: "daily",
  },
  {
    id: "r-default-2",
    type: "custom",
    title: "Morning Check-in",
    description: "Log how you feel today",
    time: "09:00",
    active: true,
    frequency: "daily",
  },
];

const HealthContext = createContext<HealthContextType | null>(null);

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [visionHistory, setVisionHistory] = useState<VisionAnalysis[]>([]);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const [entriesData, remindersData, profileData, visionData, convoData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.entries),
        AsyncStorage.getItem(STORAGE_KEYS.reminders),
        AsyncStorage.getItem(STORAGE_KEYS.profile),
        AsyncStorage.getItem(STORAGE_KEYS.visionHistory),
        AsyncStorage.getItem(STORAGE_KEYS.conversations),
      ]);
      if (entriesData) setEntries(JSON.parse(entriesData) as HealthEntry[]);
      if (remindersData) setReminders(JSON.parse(remindersData) as Reminder[]);
      if (profileData) {
        const saved = JSON.parse(profileData) as Partial<UserProfile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...saved,
          medicalAid: { ...DEFAULT_PROFILE.medicalAid, ...(saved.medicalAid ?? {}) },
          medications: saved.medications ?? [],
          familyMembers: saved.familyMembers ?? [],
        });
      }
      if (visionData) setVisionHistory(JSON.parse(visionData) as VisionAnalysis[]);
      if (convoData) setConversations(JSON.parse(convoData) as ConversationSession[]);
    } catch {
      // silently fail
    }
  }

  const addEntry = useCallback(
    async (entry: Omit<HealthEntry, "id">) => {
      const newEntry: HealthEntry = { ...entry, id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(updated));
    },
    [entries],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(updated));
    },
    [entries],
  );

  const addReminder = useCallback(
    async (reminder: Omit<Reminder, "id">) => {
      const newReminder: Reminder = { ...reminder, id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updated = [...reminders, newReminder];
      setReminders(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated));
    },
    [reminders],
  );

  const updateReminder = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      const updated = reminders.map((r) => r.id === id ? { ...r, ...updates } : r);
      setReminders(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated));
    },
    [reminders],
  );

  const removeReminder = useCallback(
    async (id: string) => {
      const updated = reminders.filter((r) => r.id !== id);
      setReminders(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated));
    },
    [reminders],
  );

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates, lastUpdated: Date.now() };
      setProfile(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updated));
    },
    [profile],
  );

  const addMedication = useCallback(
    async (medication: Omit<Medication, "id">) => {
      const newMed: Medication = { ...medication, id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updatedProfile = { ...profile, medications: [...(profile.medications ?? []), newMed], lastUpdated: Date.now() };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    },
    [profile],
  );

  const removeMedication = useCallback(
    async (id: string) => {
      const updatedProfile = { ...profile, medications: (profile.medications ?? []).filter((m) => m.id !== id), lastUpdated: Date.now() };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    },
    [profile],
  );

  const addFamilyMember = useCallback(
    async (member: Omit<FamilyMember, "id">) => {
      const newMember: FamilyMember = { ...member, id: `fam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updatedProfile = { ...profile, familyMembers: [...(profile.familyMembers ?? []), newMember], lastUpdated: Date.now() };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    },
    [profile],
  );

  const updateFamilyMember = useCallback(
    async (id: string, updates: Partial<FamilyMember>) => {
      const updatedProfile = {
        ...profile,
        familyMembers: (profile.familyMembers ?? []).map((m) => m.id === id ? { ...m, ...updates } : m),
        lastUpdated: Date.now(),
      };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    },
    [profile],
  );

  const removeFamilyMember = useCallback(
    async (id: string) => {
      const updatedProfile = { ...profile, familyMembers: (profile.familyMembers ?? []).filter((m) => m.id !== id), lastUpdated: Date.now() };
      setProfile(updatedProfile);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(updatedProfile));
    },
    [profile],
  );

  const addVisionAnalysis = useCallback(
    async (analysis: Omit<VisionAnalysis, "id">) => {
      const newAnalysis: VisionAnalysis = { ...analysis, id: `vis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updated = [newAnalysis, ...visionHistory].slice(0, 50); // keep last 50
      setVisionHistory(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.visionHistory, JSON.stringify(updated));
    },
    [visionHistory],
  );

  const saveConversation = useCallback(
    async (session: Omit<ConversationSession, "id">) => {
      const newSession: ConversationSession = { ...session, id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
      const updated = [newSession, ...conversations].slice(0, 100); // keep last 100
      setConversations(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(updated));
    },
    [conversations],
  );

  const clearConversations = useCallback(async () => {
    setConversations([]);
    await AsyncStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify([]));
  }, []);

  return (
    <HealthContext.Provider
      value={{
        entries,
        reminders,
        profile,
        visionHistory,
        conversations,
        addEntry,
        removeEntry,
        addReminder,
        updateReminder,
        removeReminder,
        updateProfile,
        addMedication,
        removeMedication,
        addFamilyMember,
        updateFamilyMember,
        removeFamilyMember,
        addVisionAnalysis,
        saveConversation,
        clearConversations,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error("useHealth must be used within HealthProvider");
  return ctx;
}
