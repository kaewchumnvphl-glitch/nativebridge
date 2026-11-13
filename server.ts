import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("API_KEY_INVALID")
  ) {
    return {
      status: 403,
      message:
        "API key is invalid or not configured. Please check Settings > Secrets.",
    };
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "Rate limit reached. Please wait a moment and try again.",
    };
  }
  return {
    status: 500,
    message: msg || "Unexpected server error",
  };
}

const RANK_PEDAGOGY_GUIDE: Record<string, string> = {
  A1: "CEFR A1 (Beginner). Use very short, clear everyday sentences (5-10 words max per line), basic present/past tense, high-frequency survival vocabulary, gentle clear speech, and very simple 2-3 sentence writing prompts.",
  A2: "CEFR A2 (Elementary). Use natural everyday sentences (8-14 words), simple past and future ('going to'), practical phrasal verbs, clear conversational flow, and 3-4 sentence writing prompts.",
  B1: "CEFR B1 (Intermediate). Use authentic connected speech reductions ('gonna', 'kinda', 'for a bit'), everyday idioms, storytelling flow, relatable work/travel scenarios, and 3-5 sentence writing prompts.",
  B2: "CEFR B2 (Upper-Intermediate). Use professional workplace nuance, polite disagreement, problem-solving under pressure, natural collocations, and 4-6 sentence structured writing tasks.",
  C1: "CEFR C1 (Advanced). Use rich discourse markers ('That being said', 'To be fair'), idiomatic nuance, dry humor, implied meaning, persuasive rhetoric, and 4-6 sentence analytical writing.",
  C2: "CEFR C2 (Native Mastery). Use executive/literary precision, subtle subtext, complex argumentation, cultural idioms across US/UK/AU, and sophisticated editorial writing.",
};

const TUTOR_META: Record<
  string,
  { name: string; city: string; voice: string; partnerName: string; partnerVoice: string }
> = {
  maya: {
    name: "Maya",
    city: "Seattle, USA",
    voice: "Kore",
    partnerName: "Sam",
    partnerVoice: "Fenrir",
  },
  liam: {
    name: "Liam",
    city: "Melbourne, Australia",
    voice: "Puck",
    partnerName: "Claire",
    partnerVoice: "Zephyr",
  },
  oliver: {
    name: "Oliver",
    city: "London, UK",
    voice: "Charon",
    partnerName: "Hannah",
    partnerVoice: "Kore",
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, hasKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // 1. Native Text-to-Speech (Single speaker or Dual-speaker dialogue)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName = "Kore", style, multiSpeaker } = req.body as {
        text?: string;
        voiceName?: string;
        style?: string;
        multiSpeaker?: Array<{
          speaker: string;
          text: string;
          style?: string;
          voiceName: string;
        }>;
      };

      const ai = getAiClient();

      if (Array.isArray(multiSpeaker) && multiSpeaker.length === 2) {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-tts",
          contents: [
            {
              role: "user",
              parts: multiSpeaker.map((line) => ({
                text: `${line.speaker}: ${line.text}`,
                speechMetadata: {
                  speaker: line.speaker,
                  style:
                    line.style ||
                    "Natural, warm native speaker in everyday conversation",
                },
              })),
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: multiSpeaker.map((line) => ({
                  speaker: line.speaker,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: line.voiceName || "Kore" },
                  },
                })),
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          res.status(502).json({ error: "No audio returned from TTS model." });
          return;
        }
        res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
        return;
      }

      if (!text || !text.trim()) {
        res.status(400).json({ error: "Text is required for speech generation." });
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style:
                    style ||
                    "Natural, clear native English speaker, friendly and articulate",
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: "No audio returned from TTS model." });
        return;
      }

      res.json({ audioBase64: base64Audio, mimeType: "audio/wav" });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Transcribe Audio Only
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };

      if (!audioBase64) {
        res.status(400).json({ error: "Audio payload is required." });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe the spoken English accurately. Return only the spoken words without extra commentary.",
            },
          ],
        },
      });

      res.json({ transcript: (response.text ?? "").trim() });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Transcribe + Pronunciation & Fluency Coaching
  app.post("/api/transcribe-coach", async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = "audio/webm",
        targetPhrase,
        contextThai,
      } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        targetPhrase?: string;
        contextThai?: string;
      };

      if (!audioBase64 || !targetPhrase) {
        res.status(400).json({ error: "Audio and targetPhrase are required." });
        return;
      }

      const ai = getAiClient();

      const transcribeResponse = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe the learner's English speech verbatim. Return only the transcribed text.",
            },
          ],
        },
      });

      const spokenText = (transcribeResponse.text ?? "").trim();

      const coachResponse = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Target native phrase: "${targetPhrase}"
Context (Thai): ${contextThai || "Everyday conversation"}
What the Thai learner actually said (transcribed): "${spokenText || "(silence / unclear)"}"

Evaluate the learner's spoken attempt kindly and concretely like a real native tutor coaching a Thai speaker.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are a warm, observant native English pronunciation coach teaching a Thai learner. Compare the transcribed speech with the target phrase. Give practical advice in Thai about word stress, linking/connected speech, final consonants (-s, -ed, -t, -d), or rhythm. Be encouraging and concise.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              accuracyScore: { type: Type.INTEGER },
              heardText: { type: Type.STRING },
              feedbackThai: { type: Type.STRING },
              focusTipThai: { type: Type.STRING },
              passed: { type: Type.BOOLEAN },
            },
          },
        },
      });

      const parsed = JSON.parse((coachResponse.text ?? "{}").trim());
      res.json({
        accuracyScore: parsed.accuracyScore ?? 0,
        heardText: spokenText || parsed.heardText || "",
        feedbackThai:
          parsed.feedbackThai ?? "ลองพูดใหม่อีกครั้งให้ชัดเจนขึ้นนะครับ",
        focusTipThai:
          parsed.focusTipThai ?? "เน้นเสียงพยัญชนะท้ายคำและจังหวะการเชื่อมคำ",
        passed: Boolean(parsed.passed),
      });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Live Conversation Roleplay with Native Tutor
  app.post("/api/roleplay", async (req, res) => {
    try {
      const {
        tutorName,
        tutorCity,
        tutorStyle,
        scenarioTitle,
        scenarioPrompt,
        history = [],
        userMessage,
      } = req.body as {
        tutorName: string;
        tutorCity: string;
        tutorStyle: string;
        scenarioTitle: string;
        scenarioPrompt: string;
        history?: Array<{ role: "tutor" | "user"; text: string }>;
        userMessage: string;
      };

      if (!userMessage || !userMessage.trim()) {
        res.status(400).json({ error: "userMessage is required." });
        return;
      }

      const ai = getAiClient();
      const conversationLog = history
        .slice(-10)
        .map(
          (turn) =>
            `${turn.role === "tutor" ? tutorName : "Learner"}: ${turn.text}`
        )
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Tutor Persona: ${tutorName} from ${tutorCity}. Speaking style: ${tutorStyle}.
Roleplay Scenario: ${scenarioTitle} — ${scenarioPrompt}

Conversation so far:
${conversationLog || "(Start of conversation)"}
Learner just said: "${userMessage.trim()}"

Respond in character as ${tutorName}. Keep the reply natural, engaging, and 1–3 sentences long. Also give a gentle Native Upgrade on what the learner just said.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            "You are a friendly native English speaker having a real-life conversation with a Thai learner. Speak like a real local, never like a robotic textbook. Also coach them subtly by showing how a native speaker might phrase their sentence even more naturally.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tutorReply: { type: Type.STRING },
              tutorReplyThai: { type: Type.STRING },
              nativeUpgrade: {
                type: Type.OBJECT,
                properties: {
                  isAlreadyNatural: { type: Type.BOOLEAN },
                  naturalVersion: { type: Type.STRING },
                  whyThai: { type: Type.STRING },
                },
              },
              suggestedReplies: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 5. Evaluate English Writing
  app.post("/api/evaluate-writing", async (req, res) => {
    try {
      const {
        promptTitle,
        promptInstruction,
        userText,
        targetExpressions = [],
      } = req.body as {
        promptTitle: string;
        promptInstruction: string;
        userText: string;
        targetExpressions?: string[];
      };

      if (!userText || !userText.trim()) {
        res.status(400).json({ error: "Writing text is required." });
        return;
      }

      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Writing Task: ${promptTitle}
Task Instructions: ${promptInstruction}
Recommended Native Expressions: ${targetExpressions.join(", ") || "Natural everyday phrasing"}

Learner's Draft:
"""
${userText.trim()}
"""

Review this English draft as a supportive native English editor coaching a Thai learner.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction:
            "You are a native English writing coach for Thai learners. Preserve the learner's intended meaning while elevating their phrasing from translated-from-Thai English to truly natural native English. Explain nuances clearly in Thai.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              naturalnessScore: { type: Type.INTEGER },
              strengthsThai: { type: Type.STRING },
              casualNativeRewrite: { type: Type.STRING },
              polishedNativeRewrite: { type: Type.STRING },
              keyUpgrades: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    improved: { type: Type.STRING },
                    explanationThai: { type: Type.STRING },
                  },
                },
              },
              grammarAndToneTipThai: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      res.json(parsed);
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const stripMarkdown = (s: unknown) =>
    typeof s === "string"
      ? s.replace(/\*\*/g, "").replace(/`/g, "").trim()
      : "";

  // 6. Infinite Endless Lesson Generator (calibrated by Rank A1 -> C2)
  app.post("/api/generate-lesson", async (req, res) => {
    try {
      const {
        rankId = "A1",
        sequenceNumber = 3,
        topicCategory = "ชีวิตประจำวัน",
        scenarioTitle = "การสื่อสารในชีวิตจริง",
        twist = "สถานการณ์ทั่วไป",
        tutorId = "maya",
        avoidTitles = [],
      } = req.body as {
        rankId: string;
        sequenceNumber: number;
        topicCategory: string;
        scenarioTitle: string;
        twist: string;
        tutorId: string;
        avoidTitles?: string[];
      };

      const ai = getAiClient();
      const t = TUTOR_META[tutorId] || TUTOR_META.maya;
      const pedagogy =
        RANK_PEDAGOGY_GUIDE[rankId] || RANK_PEDAGOGY_GUIDE.A1;

      const sharedBrief = `Target Level: ${rankId} — ${pedagogy}
Lesson Sequence #: ${sequenceNumber}
Topic Category: ${topicCategory}
Specific Scenario: ${scenarioTitle}
Situational Twist: ${twist}
Main Tutor: ${t.name} (${t.city})
Dialogue Partner: ${t.partnerName}
Avoid duplicating these previous lesson titles: ${avoidTitles.slice(-15).join(" | ") || "None"}`;

      const [partOneRes, partTwoRes] = await Promise.all([
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `${sharedBrief}

Create Part 1 of this lesson (Lesson Metadata + Listening + Speaking), matching the EXACT quality of our curated lessons:
1. titleEn, titleThai (concise natural Thai, no numbering), summaryThai (1-2 Thai sentences), culturalInsightThai (1-2 Thai sentences), durationMinutes (12-18).
2. listening.sceneTitleThai ("บรรยากาศ: ..."), listening.contextThai (1-2 Thai sentences), listening.dialogue: MUST contain EXACTLY 4 alternating turns (${t.name}, ${t.partnerName}, ${t.name}, ${t.partnerName}). Include connectedPhrase (exact substring from english), connectedSoundsLike (Thai phonetic guide like "แค-นาย-แฮฟ"), and connectedExplanationThai on turns 1 and 3.
3. listening.questions: MUST contain EXACTLY 2 multiple-choice comprehension questions in Thai, each with 3 distinct options in Thai and correctIndex (0, 1, or 2) + explanationThai.
4. speaking.shadowingPhrases: MUST contain EXACTLY 3 practical phrases for this scenario. stressGuide uses UPPERCASE for stressed words (no asterisks), valid /IPA/, thaiMeaning, and nativeTipThai.
5. speaking.roleplayTitle, roleplayContextThai, roleplayScenarioPrompt, openingLineEn, openingLineThai.`,
          config: {
            systemInstruction:
              "You are an expert English curriculum designer for Thai learners. Always populate EVERY requested array with the exact item count requested (4 dialogue lines, 2 listening questions, 3 shadowing phrases). Never return empty arrays. Never use markdown asterisks (**).",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "titleEn",
                "titleThai",
                "summaryThai",
                "culturalInsightThai",
                "durationMinutes",
                "listening",
                "speaking",
              ],
              properties: {
                titleEn: { type: Type.STRING },
                titleThai: { type: Type.STRING },
                summaryThai: { type: Type.STRING },
                culturalInsightThai: { type: Type.STRING },
                durationMinutes: { type: Type.INTEGER },
                listening: {
                  type: Type.OBJECT,
                  required: [
                    "sceneTitleThai",
                    "contextThai",
                    "dialogue",
                    "questions",
                  ],
                  properties: {
                    sceneTitleThai: { type: Type.STRING },
                    contextThai: { type: Type.STRING },
                    dialogue: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: ["speaker", "english", "thai", "style"],
                        properties: {
                          speaker: { type: Type.STRING },
                          english: { type: Type.STRING },
                          thai: { type: Type.STRING },
                          style: { type: Type.STRING },
                          connectedPhrase: { type: Type.STRING },
                          connectedSoundsLike: { type: Type.STRING },
                          connectedExplanationThai: { type: Type.STRING },
                        },
                      },
                    },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: [
                          "questionThai",
                          "options",
                          "correctIndex",
                          "explanationThai",
                        ],
                        properties: {
                          questionThai: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          correctIndex: { type: Type.INTEGER },
                          explanationThai: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
                speaking: {
                  type: Type.OBJECT,
                  required: [
                    "shadowingPhrases",
                    "roleplayTitle",
                    "roleplayContextThai",
                    "roleplayScenarioPrompt",
                    "openingLineEn",
                    "openingLineThai",
                  ],
                  properties: {
                    shadowingPhrases: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: [
                          "english",
                          "stressGuide",
                          "ipa",
                          "thaiMeaning",
                          "nativeTipThai",
                        ],
                        properties: {
                          english: { type: Type.STRING },
                          stressGuide: { type: Type.STRING },
                          ipa: { type: Type.STRING },
                          thaiMeaning: { type: Type.STRING },
                          nativeTipThai: { type: Type.STRING },
                        },
                      },
                    },
                    roleplayTitle: { type: Type.STRING },
                    roleplayContextThai: { type: Type.STRING },
                    roleplayScenarioPrompt: { type: Type.STRING },
                    openingLineEn: { type: Type.STRING },
                    openingLineThai: { type: Type.STRING },
                  },
                },
              },
            },
          },
        }),
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `${sharedBrief}

Create Part 2 of this lesson (Reading + Writing), matching the EXACT quality of our curated lessons:
1. reading.formatLabel (e.g. "Neighborhood Note", "Chat Thread", "Travel Sign"), reading.headline, reading.authorMeta ("${t.name} · ${t.city} · 2 min read").
2. reading.paragraphs: MUST contain EXACTLY 3 short, natural paragraphs in English strictly matching ${rankId}.
3. reading.expressions: MUST contain EXACTLY 4 useful phrases/expressions taken VERBATIM (exact spelling!) from those 3 paragraphs. Include valid /IPA/, register ("Casual" | "Neutral" | "Workplace" | "Idiomatic"), meaningThai, and example sentence.
4. reading.questions: MUST contain EXACTLY 2 comprehension questions in Thai, each with 3 options, correctIndex (0, 1, or 2), and explanationThai.
5. writing: promptTitle (short English title), promptInstructionThai, promptInstructionEn, targetExpressions (EXACTLY 4 English phrases), minWords (${rankId === "A1" ? 12 : rankId === "A2" ? 18 : 25}), sampleStarter.`,
          config: {
            systemInstruction:
              "You are an expert English curriculum designer for Thai learners. Always populate EVERY requested array with the exact item count requested (3 paragraphs, 4 expressions appearing verbatim in the paragraphs, 2 reading questions, 4 targetExpressions). Never return empty arrays. Never use markdown asterisks (**).",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["reading", "writing"],
              properties: {
                reading: {
                  type: Type.OBJECT,
                  required: [
                    "formatLabel",
                    "headline",
                    "authorMeta",
                    "paragraphs",
                    "expressions",
                    "questions",
                  ],
                  properties: {
                    formatLabel: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    authorMeta: { type: Type.STRING },
                    paragraphs: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    expressions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: [
                          "phrase",
                          "ipa",
                          "register",
                          "meaningThai",
                          "example",
                        ],
                        properties: {
                          phrase: { type: Type.STRING },
                          ipa: { type: Type.STRING },
                          register: { type: Type.STRING },
                          meaningThai: { type: Type.STRING },
                          example: { type: Type.STRING },
                        },
                      },
                    },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        required: [
                          "questionThai",
                          "options",
                          "correctIndex",
                          "explanationThai",
                        ],
                        properties: {
                          questionThai: { type: Type.STRING },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          correctIndex: { type: Type.INTEGER },
                          explanationThai: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
                writing: {
                  type: Type.OBJECT,
                  required: [
                    "promptTitle",
                    "promptInstructionThai",
                    "promptInstructionEn",
                    "targetExpressions",
                    "minWords",
                    "sampleStarter",
                  ],
                  properties: {
                    promptTitle: { type: Type.STRING },
                    promptInstructionThai: { type: Type.STRING },
                    promptInstructionEn: { type: Type.STRING },
                    targetExpressions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    minWords: { type: Type.INTEGER },
                    sampleStarter: { type: Type.STRING },
                  },
                },
              },
            },
          },
        }),
      ]);

      const rawPart1 = JSON.parse((partOneRes.text ?? "{}").trim());
      const rawPart2 = JSON.parse((partTwoRes.text ?? "{}").trim());
      const raw = { ...rawPart1, ...rawPart2 };
      const lessonId = `${rankId}-${sequenceNumber}-${Date.now()}`;
      const paddedNumber = String(sequenceNumber).padStart(2, "0");

      const cleanParagraphs: string[] = (
        Array.isArray(raw.reading?.paragraphs) ? raw.reading.paragraphs : []
      )
        .flatMap((p: unknown) =>
          typeof p === "string"
            ? p
                .split(/\n{2,}/)
                .map((sub) => stripMarkdown(sub))
                .filter(Boolean)
            : []
        )
        .slice(0, 4);

      const joinedReadingText = cleanParagraphs.join(" ").toLowerCase();

      const cleanExpressions = (
        Array.isArray(raw.reading?.expressions) ? raw.reading.expressions : []
      )
        .map(
          (
            e: {
              phrase?: string;
              ipa?: string;
              register?: string;
              meaningThai?: string;
              example?: string;
            },
            i: number
          ) => ({
            id: `${lessonId}-e${i}`,
            phrase: stripMarkdown(e.phrase),
            ipa: stripMarkdown(e.ipa),
            register:
              e.register === "Casual" ||
              e.register === "Workplace" ||
              e.register === "Idiomatic"
                ? e.register
                : "Neutral",
            meaningThai: stripMarkdown(e.meaningThai),
            example: stripMarkdown(e.example),
          })
        )
        .filter(
          (e: { phrase: string; meaningThai: string }) =>
            e.phrase.length > 0 &&
            e.meaningThai.length > 0 &&
            (joinedReadingText.length === 0 ||
              joinedReadingText.includes(e.phrase.toLowerCase()))
        );

      const hydratedLesson = {
        id: lessonId,
        rankId,
        sequenceNumber,
        number: paddedNumber,
        topicCategory,
        isGenerated: true,
        titleEn: stripMarkdown(raw.titleEn) || scenarioTitle,
        titleThai: stripMarkdown(raw.titleThai) || scenarioTitle,
        levelLabel: `ระดับ ${rankId} · ${topicCategory}`,
        durationMinutes: Math.max(10, Math.min(25, Number(raw.durationMinutes) || 14)),
        tutorId,
        summaryThai:
          stripMarkdown(raw.summaryThai) ||
          `ฝึกฟัง พูด อ่าน เขียน ภาษาอังกฤษระดับ ${rankId} ในสถานการณ์ "${scenarioTitle}"`,
        culturalInsightThai:
          stripMarkdown(raw.culturalInsightThai) ||
          `สังเกตน้ำเสียงและจังหวะการพูดจริงของครู ${t.name} เพื่อนำไปใช้สื่อสารอย่างเป็นธรรมชาติ`,
        listening: {
          sceneTitleThai:
            stripMarkdown(raw.listening?.sceneTitleThai) || `บรรยากาศ: ${scenarioTitle}`,
          contextThai:
            stripMarkdown(raw.listening?.contextThai) ||
            `ฝึกฟังบทสนทนาจริงของครู ${t.name} และ ${t.partnerName}`,
          partnerName: t.partnerName,
          partnerVoice: t.partnerVoice,
          dialogue: (Array.isArray(raw.listening?.dialogue)
            ? raw.listening.dialogue
            : []
          ).map(
            (
              d: {
                speaker?: string;
                english?: string;
                thai?: string;
                style?: string;
                connectedPhrase?: string;
                connectedSoundsLike?: string;
                connectedExplanationThai?: string;
              },
              i: number
            ) => {
              const english = stripMarkdown(d.english);
              const rawPhrase = stripMarkdown(d.connectedPhrase);
              const isValidNote =
                rawPhrase.length > 1 &&
                !["none", "n/a", "-", "null"].includes(rawPhrase.toLowerCase()) &&
                english.toLowerCase().includes(rawPhrase.toLowerCase());
              const speakerName =
                stripMarkdown(d.speaker) || (i % 2 === 0 ? t.name : t.partnerName);
              const isMainTutor = speakerName
                .toLowerCase()
                .includes(t.name.toLowerCase());

              return {
                id: `${lessonId}-d${i}`,
                speaker: speakerName,
                voiceName: isMainTutor ? t.voice : t.partnerVoice,
                style: stripMarkdown(d.style) || "Natural native speaker",
                english,
                thai: stripMarkdown(d.thai),
                connectedNotes: isValidNote
                  ? [
                      {
                        phrase: rawPhrase,
                        soundsLike: stripMarkdown(d.connectedSoundsLike),
                        explanationThai: stripMarkdown(d.connectedExplanationThai),
                      },
                    ]
                  : undefined,
              };
            }
          ),
          questions: (Array.isArray(raw.listening?.questions)
            ? raw.listening.questions
            : []
          ).map(
            (
              q: {
                questionThai?: string;
                options?: string[];
                correctIndex?: number;
                explanationThai?: string;
              },
              i: number
            ) => {
              const opts = (Array.isArray(q.options) ? q.options : [])
                .map((o) => stripMarkdown(o))
                .filter(Boolean)
                .slice(0, 3);
              const idx =
                typeof q.correctIndex === "number" &&
                q.correctIndex >= 0 &&
                q.correctIndex < opts.length
                  ? q.correctIndex
                  : 0;
              return {
                id: `${lessonId}-lq${i}`,
                questionThai: stripMarkdown(q.questionThai),
                options: opts,
                correctIndex: idx,
                explanationThai: stripMarkdown(q.explanationThai),
              };
            }
          ),
        },
        speaking: {
          shadowingPhrases: (Array.isArray(raw.speaking?.shadowingPhrases)
            ? raw.speaking.shadowingPhrases
            : []
          ).map(
            (
              s: {
                english?: string;
                stressGuide?: string;
                ipa?: string;
                thaiMeaning?: string;
                nativeTipThai?: string;
              },
              i: number
            ) => ({
              id: `${lessonId}-s${i}`,
              english: stripMarkdown(s.english),
              stressGuide: stripMarkdown(s.stressGuide) || stripMarkdown(s.english),
              ipa: stripMarkdown(s.ipa),
              thaiMeaning: stripMarkdown(s.thaiMeaning),
              nativeTipThai: stripMarkdown(s.nativeTipThai),
            })
          ),
          roleplayTitle:
            stripMarkdown(raw.speaking?.roleplayTitle) || scenarioTitle,
          roleplayContextThai: stripMarkdown(raw.speaking?.roleplayContextThai),
          roleplayScenarioPrompt:
            stripMarkdown(raw.speaking?.roleplayScenarioPrompt) ||
            `Roleplay ${scenarioTitle} at CEFR ${rankId} level.`,
          openingLineEn:
            stripMarkdown(raw.speaking?.openingLineEn) || "Hi! How's it going?",
          openingLineThai:
            stripMarkdown(raw.speaking?.openingLineThai) || "สวัสดี! เป็นไงบ้าง?",
          goalTurns: rankId === "A1" ? 2 : 3,
        },
        reading: {
          formatLabel:
            stripMarkdown(raw.reading?.formatLabel) || "Native Reading",
          headline: stripMarkdown(raw.reading?.headline) || scenarioTitle,
          authorMeta:
            stripMarkdown(raw.reading?.authorMeta) ||
            `${t.name} · ${t.city} · 2 min read`,
          paragraphs: cleanParagraphs,
          expressions: cleanExpressions,
          questions: (Array.isArray(raw.reading?.questions)
            ? raw.reading.questions
            : []
          ).map(
            (
              q: {
                questionThai?: string;
                options?: string[];
                correctIndex?: number;
                explanationThai?: string;
              },
              i: number
            ) => {
              const opts = (Array.isArray(q.options) ? q.options : [])
                .map((o) => stripMarkdown(o))
                .filter(Boolean)
                .slice(0, 3);
              const idx =
                typeof q.correctIndex === "number" &&
                q.correctIndex >= 0 &&
                q.correctIndex < opts.length
                  ? q.correctIndex
                  : 0;
              return {
                id: `${lessonId}-rq${i}`,
                questionThai: stripMarkdown(q.questionThai),
                options: opts,
                correctIndex: idx,
                explanationThai: stripMarkdown(q.explanationThai),
              };
            }
          ),
        },
        writing: {
          promptTitle:
            stripMarkdown(raw.writing?.promptTitle) || scenarioTitle,
          promptInstructionThai: stripMarkdown(
            raw.writing?.promptInstructionThai
          ),
          promptInstructionEn: stripMarkdown(raw.writing?.promptInstructionEn),
          targetExpressions: (Array.isArray(raw.writing?.targetExpressions)
            ? raw.writing.targetExpressions
            : []
          )
            .map((x: unknown) => stripMarkdown(x))
            .filter(Boolean)
            .slice(0, 5),
          minWords: Math.max(8, Number(raw.writing?.minWords) || 15),
          sampleStarter: stripMarkdown(raw.writing?.sampleStarter),
        },
      };

      if (
        hydratedLesson.listening.dialogue.length < 3 ||
        hydratedLesson.listening.questions.length < 2 ||
        hydratedLesson.speaking.shadowingPhrases.length < 2 ||
        hydratedLesson.reading.paragraphs.length < 2 ||
        hydratedLesson.reading.questions.length < 2 ||
        hydratedLesson.writing.targetExpressions.length < 2
      ) {
        return res.status(502).json({
          error: "เนื้อหาบทเรียนที่สร้างไม่สมบูรณ์ กรุณาลองกดสร้างใหม่อีกครั้ง",
        });
      }

      res.json({ lesson: hydratedLesson });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 7. Generate 4-Skill Rank Promotion Exam
  app.post("/api/generate-exam", async (req, res) => {
    try {
      const { rankId = "A1" } = req.body as { rankId: string };
      const ai = getAiClient();
      const pedagogy =
        RANK_PEDAGOGY_GUIDE[rankId] || RANK_PEDAGOGY_GUIDE.A1;
      const tutorKeys = Object.keys(TUTOR_META);
      const examinerTutorId =
        tutorKeys[Math.floor(Math.random() * tutorKeys.length)] || "maya";
      const examiner = TUTOR_META[examinerTutorId];

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Create a fresh 4-skill Rank Promotion Exam to test whether a Thai learner has mastered CEFR ${rankId} (${pedagogy}) and is ready to advance to the next level.
Examiner: ${examiner.name} from ${examiner.city}.

Requirements (ALL arrays must be populated completely):
1. listening: A natural spoken monologue or short story script (4-6 sentences matching ${rankId}) + Thai context + EXACTLY 2 comprehension questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
2. reading: Headline + authentic short passage (2-3 paragraphs matching ${rankId}) + EXACTLY 2 comprehension/nuance questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
3. speaking: A realistic spoken question/prompt from ${examiner.name} in English (promptEn) + Thai translation (promptThai) + helpful guidance in Thai.
4. writing: A realistic writing prompt in English (promptEn) + Thai instruction (promptThai) + appropriate minWords (${rankId === "A1" ? 15 : rankId === "A2" ? 20 : 30}).`,
        config: {
          systemInstruction:
            "You are a fair, authoritative English proficiency examiner. Design a realistic, practical 4-skill promotion test matching the exact CEFR level. Always populate all arrays with 2 questions and 3 options each. Never use markdown asterisks (**).",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["listening", "reading", "speaking", "writing"],
            properties: {
              listening: {
                type: Type.OBJECT,
                required: ["contextThai", "script", "questions"],
                properties: {
                  contextThai: { type: Type.STRING },
                  script: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: [
                        "questionThai",
                        "options",
                        "correctIndex",
                        "explanationThai",
                      ],
                      properties: {
                        questionThai: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        correctIndex: { type: Type.INTEGER },
                        explanationThai: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              reading: {
                type: Type.OBJECT,
                required: ["headline", "passage", "questions"],
                properties: {
                  headline: { type: Type.STRING },
                  passage: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: [
                        "questionThai",
                        "options",
                        "correctIndex",
                        "explanationThai",
                      ],
                      properties: {
                        questionThai: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                        correctIndex: { type: Type.INTEGER },
                        explanationThai: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
              speaking: {
                type: Type.OBJECT,
                required: ["promptEn", "promptThai", "guidanceThai"],
                properties: {
                  promptEn: { type: Type.STRING },
                  promptThai: { type: Type.STRING },
                  guidanceThai: { type: Type.STRING },
                },
              },
              writing: {
                type: Type.OBJECT,
                required: ["promptEn", "promptThai", "minWords"],
                properties: {
                  promptEn: { type: Type.STRING },
                  promptThai: { type: Type.STRING },
                  minWords: { type: Type.INTEGER },
                },
              },
            },
          },
        },
      });

      const raw = JSON.parse((response.text ?? "{}").trim());
      const listeningQuestions = (
        Array.isArray(raw.listening?.questions) ? raw.listening.questions : []
      ).map(
        (
          q: {
            questionThai?: string;
            options?: string[];
            correctIndex?: number;
            explanationThai?: string;
          },
          i: number
        ) => {
          const opts = (Array.isArray(q.options) ? q.options : [])
            .map((o) => stripMarkdown(o))
            .filter(Boolean)
            .slice(0, 3);
          const idx =
            typeof q.correctIndex === "number" &&
            q.correctIndex >= 0 &&
            q.correctIndex < opts.length
              ? q.correctIndex
              : 0;
          return {
            id: `ex-l-${i}`,
            questionThai: stripMarkdown(q.questionThai),
            options: opts,
            correctIndex: idx,
            explanationThai: stripMarkdown(q.explanationThai),
          };
        }
      );

      const readingQuestions = (
        Array.isArray(raw.reading?.questions) ? raw.reading.questions : []
      ).map(
        (
          q: {
            questionThai?: string;
            options?: string[];
            correctIndex?: number;
            explanationThai?: string;
          },
          i: number
        ) => {
          const opts = (Array.isArray(q.options) ? q.options : [])
            .map((o) => stripMarkdown(o))
            .filter(Boolean)
            .slice(0, 3);
          const idx =
            typeof q.correctIndex === "number" &&
            q.correctIndex >= 0 &&
            q.correctIndex < opts.length
              ? q.correctIndex
              : 0;
          return {
            id: `ex-r-${i}`,
            questionThai: stripMarkdown(q.questionThai),
            options: opts,
            correctIndex: idx,
            explanationThai: stripMarkdown(q.explanationThai),
          };
        }
      );

      const exam = {
        rankId,
        examinerTutorId,
        listening: {
          contextThai: stripMarkdown(raw.listening?.contextThai),
          script: stripMarkdown(raw.listening?.script),
          questions: listeningQuestions,
        },
        reading: {
          headline: stripMarkdown(raw.reading?.headline) || "Reading Assessment",
          passage: stripMarkdown(raw.reading?.passage),
          questions: readingQuestions,
        },
        speaking: {
          promptEn:
            stripMarkdown(raw.speaking?.promptEn) || "Tell me about your day.",
          promptThai: stripMarkdown(raw.speaking?.promptThai),
          guidanceThai: stripMarkdown(raw.speaking?.guidanceThai),
        },
        writing: {
          promptEn:
            stripMarkdown(raw.writing?.promptEn) || "Write a short reply.",
          promptThai: stripMarkdown(raw.writing?.promptThai),
          minWords: Math.max(10, Number(raw.writing?.minWords) || 15),
        },
      };

      if (
        !exam.listening.script ||
        exam.listening.questions.length < 2 ||
        !exam.reading.passage ||
        exam.reading.questions.length < 2
      ) {
        return res.status(502).json({
          error: "ชุดข้อสอบที่สร้างไม่สมบูรณ์ กรุณาลองเปิดสอบใหม่อีกครั้ง",
        });
      }

      res.json({ exam });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 8. Grade 4-Skill Rank Promotion Exam
  app.post("/api/grade-exam", async (req, res) => {
    try {
      const {
        rankId = "A1",
        passingScore = 70,
        listeningScore = 0,
        readingScore = 0,
        speakingAudioBase64,
        speakingMimeType = "audio/webm",
        speakingTextFallback = "",
        speakingPromptEn = "",
        writingText = "",
        writingPromptEn = "",
      } = req.body as {
        rankId: string;
        passingScore: number;
        listeningScore: number;
        readingScore: number;
        speakingAudioBase64?: string;
        speakingMimeType?: string;
        speakingTextFallback?: string;
        speakingPromptEn: string;
        writingText: string;
        writingPromptEn: string;
      };

      const ai = getAiClient();
      let spokenTranscript = speakingTextFallback.trim();

      if (speakingAudioBase64) {
        const trRes = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: speakingMimeType,
                  data: speakingAudioBase64,
                },
              },
              {
                text: "Transcribe the spoken English accurately. Return only the spoken words.",
              },
            ],
          },
        });
        spokenTranscript = (trRes.text ?? "").trim() || spokenTranscript;
      }

      const pedagogy =
        RANK_PEDAGOGY_GUIDE[rankId] || RANK_PEDAGOGY_GUIDE.A1;

      const gradeRes = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Grade the Speaking and Writing sections of a CEFR ${rankId} Promotion Exam (${pedagogy}).
Passing standard: ${passingScore}/100.

Speaking Prompt: "${speakingPromptEn}"
Learner's Spoken Response (transcribed): "${spokenTranscript || "(No speech provided)"}"

Writing Prompt: "${writingPromptEn}"
Learner's Written Response: "${writingText || "(No text provided)"}"

Listening Score (objective): ${listeningScore}/100
Reading Score (objective): ${readingScore}/100

Grade realistically and fairly for ${rankId} level (don't expect C2 perfection for an A1 beginner, but ensure genuine communicative competence at ${rankId}).`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction:
            "You are a fair native English examiner grading a Thai learner's Promotion Test. Provide honest numeric scores (0-100) for speaking and writing, plus encouraging, actionable feedback in natural Thai.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              speakingScore: { type: Type.INTEGER },
              writingScore: { type: Type.INTEGER },
              speakingFeedbackThai: { type: Type.STRING },
              writingFeedbackThai: { type: Type.STRING },
              verdictThai: { type: Type.STRING },
              nextStepsThai: { type: Type.STRING },
            },
          },
        },
      });

      const parsed = JSON.parse((gradeRes.text ?? "{}").trim());
      const speakingScore = Math.max(
        0,
        Math.min(100, Number(parsed.speakingScore ?? 0))
      );
      const writingScore = Math.max(
        0,
        Math.min(100, Number(parsed.writingScore ?? 0))
      );

      const overallScore = Math.round(
        (listeningScore + readingScore + speakingScore + writingScore) / 4
      );
      const passed = overallScore >= passingScore && speakingScore >= 40 && writingScore >= 40;

      res.json({
        passed,
        overallScore,
        passingScore,
        skillScores: {
          listening: listeningScore,
          speaking: speakingScore,
          reading: readingScore,
          writing: writingScore,
        },
        spokenTranscript,
        verdictThai:
          parsed.verdictThai ||
          (passed
            ? "ยินดีด้วย! คุณผ่านเกณฑ์การเลื่อนลำดับขั้นแล้ว"
            : "ยังไม่ผ่านเกณฑ์ในรอบนี้ แนะนำให้ฝึกบทเรียนเพิ่มเติมในระดับนี้แล้วลองสอบใหม่อีกครั้ง"),
        speakingFeedbackThai: parsed.speakingFeedbackThai || "",
        writingFeedbackThai: parsed.writingFeedbackThai || "",
        nextStepsThai: parsed.nextStepsThai || "",
      });
    } catch (err) {
      const formatted = formatError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NativeBridge server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
