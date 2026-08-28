# 🏥 AI Health Companion (AIC) — Intelligent Health Operations OS

> **"Jarvis for Healthcare"** — An enterprise-grade, privacy-first AI Health Assistant and Wearable Bio-Signal Fusion Engine. Built specifically for underserved communities, chronic illness tracking, and proactive triage navigation.

---

## 🏛️ Executive Summary & Core Mandate

**AI Health Companion (AIC)** is an intelligent health operations system engineered to bridge the gap between patient bio-signals, daily symptom tracking, and professional healthcare infrastructure. It is strictly designed as a **triage, navigation, and administrative translation engine**—not a diagnostic tool.

### 🛡️ Critical Safety & Legal Guardrails
* **Non-Diagnostic Policy:** System prompts enforce zero definitive disease diagnoses (e.g., re-framing user symptoms into differential possibility clusters).
* **Prescription Safety:** Zero dosage or prescription generation capabilities.
* **Emergency Auto-Escalation:** Red-flag triage logic (chest pain, stroke symptoms, acute dyspnea) instantly locks conversation UI to present **Emergency Protocols (911/112/EMS)** and auto-dispatches GPS metrics to trusted emergency contacts.

---

## 📐 System Architecture

```text
+-----------------------------------------------------------------+
|               Mobile / Web Client App (React Native / Next.js)  |
+--------------------------------+--------------------------------+
                                 |
                        REST / WebSocket API
                                 |
+--------------------------------v--------------------------------+
|                 API Gateway & Supabase Auth                     |
+--------------------------------+--------------------------------+
                                 |
     +---------------------------+---------------------------+
     |                                                       |
+----v--------------------+                             +----v--------------------+
| Wearable Fusion Engine  |                             | Multi-Agent Orchestration|
| (Apple / Google Health) |                             | (Gemini / LangChain)    |
+----+--------------------+                             +----+--------------------+
     |                                                       |
     +---------------------------+---------------------------+
                                 |
                    +------------v------------+
                    |  PostgreSQL + pgvector  |
                    |  (Persistent Memory)    |
                    +-------------------------+
