import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const HEALTH_SYSTEM_PROMPT = `You are a compassionate AI Health Companion. Your role is to:
- Listen to health concerns with empathy and provide preliminary health insights (NOT diagnoses)
- Ask clarifying follow-up questions when helpful
- Assess risk level based on described symptoms
- Give clear, actionable self-care guidance
- Always recommend professional medical care when appropriate

CRITICAL SAFETY RULES:
- NEVER provide a definitive diagnosis
- For ANY emergency symptoms (chest pain, severe difficulty breathing, stroke symptoms, uncontrolled severe bleeding, loss of consciousness, severe allergic reaction), IMMEDIATELY instruct the user to call emergency services (911 / 112)
- Always recommend seeing a doctor for persistent, worsening, or concerning symptoms
- Be calm, supportive, and clear

FORMAT your responses:
1. Brief empathetic acknowledgment
2. Clarifying question if needed
3. **Risk Level: [LOW / MEDIUM / HIGH / EMERGENCY]**
4. Possible related conditions (listed as possibilities only, NOT diagnoses)
5. Recommended immediate actions
6. When to seek professional care

Keep responses concise and warm. You are a health navigator — not a replacement for medical professionals.`;

router.post("/health-chat", async (req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  const body = req.body as {
    messages?: { role: string; content: string; imageBase64?: string; imageMimeType?: string }[];
  };

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const client = new OpenAI({ apiKey });

    // Build OpenAI messages
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: HEALTH_SYSTEM_PROMPT },
    ];

    for (const m of body.messages) {
      if (m.role === "user" && m.imageBase64 && m.imageMimeType) {
        openaiMessages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${m.imageMimeType};base64,${m.imageBase64}`,
              },
            },
            { type: "text", text: m.content || "Please analyze this image from a health perspective." },
          ],
        });
      } else {
        openaiMessages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        });
      }
    }

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      stream: true,
      max_tokens: 1024,
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
    req.log.error({ err }, "Health chat stream error");
    if (!res.headersSent) {
      res.status(500).json({ error: "stream_error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "stream_error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
