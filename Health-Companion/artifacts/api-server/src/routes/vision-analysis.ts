import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const VISION_SYSTEM_PROMPT = `You are an AI Vision Lab — an advanced medical image and document analysis system.

You analyze:
- Wounds, cuts, and injuries
- Skin conditions, rashes, and lesions
- Eye conditions
- Tongue and oral health
- Prescriptions and medication labels
- Lab reports and blood work
- Medical forms and documents

CRITICAL SAFETY RULES:
- NEVER provide a definitive medical diagnosis
- Always recommend consulting a healthcare professional
- For emergency visual symptoms (severe wounds, difficulty breathing symptoms, signs of stroke), instruct immediate emergency services contact
- Be clear about limitations of visual AI analysis

FORMAT your response exactly as follows:

## Analysis Type
[What type of image/document was analyzed]

## What Was Detected
[Detailed description of what is visible in the image. Be specific and objective.]

## Confidence Level
[HIGH | MEDIUM | LOW] — [Brief explanation of confidence]

## Key Observations
- [Observation 1]
- [Observation 2]
- [Observation 3]
[Up to 5 observations]

## Medical Relevance
[Medical context: what these findings could potentially indicate. Always frame as "may suggest" or "could indicate" — NEVER as diagnosis]

## Things to Monitor
- [Sign/symptom to watch for]
- [Sign/symptom to watch for]

## When to Seek Medical Care
[Specific triggers that should prompt a doctor/emergency visit]

## Additional Notes
[Any other relevant information, especially for prescriptions/lab reports explaining what the document contains in plain language]`;

router.post("/vision-analysis", async (req: Request, res: Response) => {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  const body = req.body as {
    imageBase64?: string;
    imageMimeType?: string;
    analysisType?: string;
    additionalContext?: string;
  };

  if (!body.imageBase64 || !body.imageMimeType) {
    res.status(400).json({ error: "imageBase64 and imageMimeType are required" });
    return;
  }

  try {
    const client = new OpenAI({ apiKey });

    const analysisTypeHint = body.analysisType
      ? `The user has indicated this is a: ${body.analysisType.replace("_", " ")} image/document.`
      : "Please determine the type of medical image or document automatically.";

    const contextHint = body.additionalContext
      ? `Additional context from user: "${body.additionalContext}"`
      : "";

    const result = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${body.imageMimeType};base64,${body.imageBase64}`,
              },
            },
            {
              type: "text",
              text: `${analysisTypeHint} ${contextHint}\n\nPlease analyze this image thoroughly and provide a detailed health-focused analysis following the format above.`,
            },
          ],
        },
      ],
      max_tokens: 1200,
    });

    const text = result.choices[0]?.message?.content ?? "Unable to analyze image.";
    res.json({ analysis: text, success: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Vision analysis error");
    res.status(500).json({ error: "analysis_failed" });
  }
});

export default router;
