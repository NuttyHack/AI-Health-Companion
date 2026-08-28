import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

type CopilotMode = "prep" | "explain_prescription" | "explain_diagnosis" | "translate_medical" | "health_twin";

const SYSTEM_PROMPTS: Record<CopilotMode, string> = {
  prep: `You are an AI Medical Copilot helping users prepare for doctor appointments.

Given the user's symptoms, health history, and concerns, generate:

## Appointment Prep Report

### Your Symptom Summary
[Clear, clinical summary of symptoms to share with the doctor]

### Questions to Ask Your Doctor
1. [Specific question based on their symptoms]
2. [Question about diagnosis possibilities]
3. [Question about tests that might be needed]
4. [Question about treatment options]
5. [Question about lifestyle changes]

### Your Health Timeline
[Chronological summary of relevant health events]

### Medications & Allergies to Mention
[List medications and allergies the doctor must know]

### Red Flags to Discuss
[Urgent symptoms that need immediate attention in the appointment]

### What to Bring
- [Item 1 - e.g. previous test results]
- [Item 2 - e.g. medication list]`,

  explain_prescription: `You are an AI Medical Copilot explaining prescriptions in plain language.

## Prescription Explained

### Medication Name
[Generic name | Brand name]

### What It's For
[Plain language explanation of what this medication treats]

### How to Take It
[Dosage, timing, with/without food]

### Common Side Effects
- [Side effect 1]
- [Side effect 2]
- [Side effect 3]

### Important Warnings
[Critical warnings — drug interactions, pregnancy, driving, etc.]

### What to Avoid
- [Interaction 1 - foods, drinks, other medications]

### When to Call Your Doctor
[Specific symptoms that indicate problems with this medication]

### Tips for Taking This Medication
[Practical advice for compliance and effectiveness]`,

  explain_diagnosis: `You are an AI Medical Copilot helping users understand their diagnosis.

## Diagnosis Explained

### What It Means
[Plain language explanation of the condition]

### How It Affects You
[What the patient may experience day-to-day]

### Common Treatments
[Overview of typical treatment approaches]

### The Recovery/Management Journey
[What to typically expect — timeline, milestones]

### Lifestyle Adjustments
- [Adjustment 1]
- [Adjustment 2]
- [Adjustment 3]

### Questions to Ask Your Doctor
1. [Question 1]
2. [Question 2]
3. [Question 3]`,

  translate_medical: `You are an AI Medical Copilot that translates complex medical terminology into plain language.

## Medical Term Translator

### Original Term
[The medical term/phrase]

### Plain Language Meaning
[Simple explanation a non-medical person can understand]

### Why It Matters
[Why this term/result is relevant to their health]

### Normal Range (if applicable)
[What is considered normal vs. abnormal]

### What to Do With This Information
[Practical next steps based on this finding]`,

  health_twin: `You are an AI Digital Health Twin — a personalized health simulation system.

## Your Digital Health Twin Report

### Current Health Status
[Overall assessment — Excellent | Good | Fair | Needs Attention | Critical]

### Health Score: [0-100] / 100
[Breakdown by: Physical Health, Lifestyle, Risk Factors, Medication Adherence]

### Your Health Trajectory
[Where your health is heading if current patterns continue]

### Risk Factor Analysis
[Key risk factors, their current level, and trend]

### Simulation
[Based on the user's specific question or general projections]

### Personalized Recommendations
1. **Activity**: [Specific recommendation]
2. **Nutrition**: [Specific recommendation]
3. **Medications**: [Adherence recommendation]
4. **Sleep**: [Recommendation]
5. **Stress**: [Recommendation]

### Your 30-Day Health Goals
- [Achievable goal 1]
- [Achievable goal 2]
- [Achievable goal 3]`,
};

interface HealthEntry {
  timestamp: number;
  symptoms: string[];
  riskLevel: string;
  summary: string;
}

interface UserProfile {
  name?: string;
  age?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
}

router.post("/medical-copilot", async (req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  const body = req.body as {
    mode?: CopilotMode;
    content?: string;
    profile?: UserProfile;
    entries?: HealthEntry[];
    question?: string;
  };

  const mode: CopilotMode = body.mode ?? "prep";

  if (!SYSTEM_PROMPTS[mode]) {
    res.status(400).json({ error: "Invalid mode" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const profileInfo = body.profile ? [
      body.profile.name ? `Name: ${body.profile.name}` : null,
      body.profile.age ? `Age: ${body.profile.age}` : null,
      body.profile.bloodType ? `Blood Type: ${body.profile.bloodType}` : null,
      body.profile.conditions?.length ? `Conditions: ${body.profile.conditions.join(", ")}` : null,
      body.profile.allergies?.length ? `Allergies: ${body.profile.allergies.join(", ")}` : null,
      body.profile.medications?.length ? `Medications: ${body.profile.medications.join(", ")}` : null,
    ].filter(Boolean).join("\n") : "Profile not provided";

    const recentEntries = body.entries?.slice(0, 10).map((e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      return `- ${date}: ${e.symptoms.join(", ")} [${e.riskLevel}] — ${e.summary}`;
    }).join("\n") ?? "No health history provided";

    let userMessage = "";
    switch (mode) {
      case "prep":
        userMessage = `USER PROFILE:\n${profileInfo}\n\nRECENT HEALTH ENTRIES:\n${recentEntries}\n\nAdditional context: ${body.content ?? "No additional context"}\n\nGenerate a comprehensive appointment prep report.`;
        break;
      case "explain_prescription":
        userMessage = `PRESCRIPTION/MEDICATION:\n${body.content ?? "No prescription provided"}\n\nUSER PROFILE (for interactions):\n${profileInfo}\n\nExplain this prescription in plain language.`;
        break;
      case "explain_diagnosis":
        userMessage = `DIAGNOSIS: ${body.content ?? "No diagnosis provided"}\n\nUSER PROFILE:\n${profileInfo}\n\nExplain this diagnosis in plain language.`;
        break;
      case "translate_medical":
        userMessage = `MEDICAL TERMS TO TRANSLATE:\n${body.content ?? "No content provided"}\n\nTranslate into plain language.`;
        break;
      case "health_twin":
        userMessage = `USER PROFILE:\n${profileInfo}\n\nHEALTH HISTORY:\n${recentEntries}\n\nUSER QUESTION: ${body.question ?? "Give me a full health twin report"}\n\nGenerate a Digital Health Twin report.`;
        break;
    }

    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[mode] },
        { role: "user", content: userMessage },
      ],
      stream: true,
      max_tokens: 1200,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Medical copilot stream error");
    if (!res.headersSent) {
      res.status(500).json({ error: "stream_error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
