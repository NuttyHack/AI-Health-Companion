import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const INSIGHTS_SYSTEM_PROMPT = `You are an AI Health Detective — an advanced pattern recognition system analyzing a user's personal health data.

Your role is to:
- Detect recurring symptom patterns (e.g. "headaches occurring every Monday")
- Identify health trends (improving, worsening, stable)
- Calculate a health risk score (0-100, where 100 = critical concern)
- Provide a weekly or monthly summary
- Predict potential health risks based on patterns
- Highlight medication adherence issues if visible

CRITICAL SAFETY RULES:
- NEVER provide a diagnosis
- Always recommend professional care for concerning patterns
- Be empathetic and constructive, never alarmist

FORMAT your response as follows:
## Health Pattern Summary
[2-3 sentence overview of overall health status this period]

## Risk Score: [0-100] / 100
[Risk Level: LOW | MEDIUM | HIGH | CRITICAL]
[1-2 sentence explanation]

## Detected Patterns
- [Pattern 1 with frequency]
- [Pattern 2 with frequency]
[up to 5 patterns]

## Health Trends
[What is improving, what is worsening, what is stable]

## Key Insights
[2-3 actionable insights the user should know]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## When to See a Doctor
[Specific triggers based on their data that should prompt a doctor visit]`;

interface HealthEntry {
  timestamp: number;
  symptoms: string[];
  riskLevel: string;
  summary: string;
  notes?: string;
}

interface UserProfile {
  name?: string;
  age?: string;
  bloodType?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
}

router.post("/health-insights", async (req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  const body = req.body as {
    entries?: HealthEntry[];
    profile?: UserProfile;
    period?: "week" | "month" | "all";
  };

  if (!body.entries || body.entries.length === 0) {
    res.status(400).json({ error: "entries array is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const period = body.period ?? "week";
    const now = Date.now();
    const periodMs = period === "week" ? 7 * 24 * 60 * 60 * 1000 : period === "month" ? 30 * 24 * 60 * 60 * 1000 : Infinity;
    const filtered = body.entries.filter((e) => now - e.timestamp <= periodMs);

    const entrySummary = filtered.map((e) => {
      const date = new Date(e.timestamp).toLocaleDateString();
      return `- ${date}: ${e.symptoms.join(", ")} [Risk: ${e.riskLevel}] — ${e.summary}`;
    }).join("\n");

    const profileInfo = body.profile ? [
      body.profile.age ? `Age: ${body.profile.age}` : null,
      body.profile.conditions?.length ? `Conditions: ${body.profile.conditions.join(", ")}` : null,
      body.profile.allergies?.length ? `Allergies: ${body.profile.allergies.join(", ")}` : null,
      body.profile.medications?.length ? `Medications: ${body.profile.medications.join(", ")}` : null,
    ].filter(Boolean).join(", ") : "No profile data";

    const userMessage = `Analyze the following health data for the past ${period} and generate a comprehensive health intelligence report.

USER PROFILE: ${profileInfo}

HEALTH ENTRIES (${filtered.length} entries over the past ${period}):
${entrySummary || "No entries in this period"}

Total entries in database: ${body.entries.length}

Please generate a detailed AI Health Detective report following the format specified.`;

    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
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
    req.log.error({ err }, "Health insights stream error");
    if (!res.headersSent) {
      res.status(500).json({ error: "stream_error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
