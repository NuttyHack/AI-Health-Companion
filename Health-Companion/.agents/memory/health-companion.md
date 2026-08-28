---
name: AI Health Companion
description: Expo mobile app — full-stack AI health OS with 10 features, dark premium design
---

## Overview
Expo mobile app ("Jarvis for healthcare") targeting underserved/rural communities. Dark-first, deep navy/teal design system. Gemini 2.0 Flash powers all AI features.

## Tab Structure (5 tabs)
- `index.tsx` → **Chat** — AI health chat with voice (expo-speech TTS), image/camera, research mode, emergency SOS banner
- `timeline.tsx` → **Health** — Health Brain (entry log) + AI Detective (pattern insights via `/api/health-insights`)
- `reminders.tsx` → **Copilot** — Medical Copilot (appointment prep/prescriptions) + Vision Lab (image analysis) + Digital Health Twin
- `nearby.tsx` → **Nearby** — Location-based hospital/clinic/pharmacy finder, ambulance call button
- `profile.tsx` → **Profile** — Personal info, Medications, Family Manager, Emergency SOS

## API Routes (all in artifacts/api-server/src/routes/)
- `health-chat.ts` — existing SSE chat with Gemini
- `health-insights.ts` — POST /health-insights, SSE stream of AI health pattern detection
- `vision-analysis.ts` — POST /vision-analysis, non-streaming image analysis (returns JSON)
- `medical-copilot.ts` — POST /medical-copilot, SSE stream, modes: prep/explain_prescription/explain_diagnosis/translate_medical/health_twin

## Data (HealthContext — AsyncStorage)
Types: HealthEntry, Reminder, UserProfile (with Medication[], FamilyMember[]), VisionAnalysis, ConversationSession
Storage keys: @health_entries, @health_reminders, @health_profile, @vision_history, @conversations

## Key packages
- expo-speech (installed manually — was missing from initial scaffold)
- expo-location, expo-image-picker, expo-haptics, expo-blur, expo-glass-effect
- @react-native-async-storage/async-storage

**Why:** expo-speech must be added manually — it is NOT in the default expo scaffold for this project.

## Auth
Replit OIDC popup-based flow (popup window, not iframe). Handled in lib/auth.tsx. Root _layout.tsx renders login inline (no router navigation).

## AI quota note
Gemini free tier hits 429 under heavy dev usage. The GEMINI_API_KEY needs billing credits for production use.

## Design
Colors defined in constants/colors.ts — deep navy (#0A0F1E) background, teal primary, emerald/amber/red risk indicators. useColors() hook in hooks/useColors.ts.
