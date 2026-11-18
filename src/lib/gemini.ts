import {
  GoogleGenAI,
  Type,
  ThinkingLevel,
} from "@google/genai";
import type {
  Lesson,
  PromotionExam,
  PromotionExamResult,
  TutorId,
  WritingEvaluation,
} from "../types/lesson";

/**
 * BYOK (Bring Your Own Key) Gemini client.
 * ผู้ใช้ใส่ Gemini API key ของตัวเอง (เก็บไว้ใน localStorage ของเครื่องผู้ใช้เท่านั้น)
 * ทุกฟังก์ชันนี้พอร์ตมาจาก server.ts ของ AI Studio เดิมแบบเนื้อหาเดียวกันทุกประโยค
 */

const API_KEY_STORAGE = "nativebridge_api_key_v1";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || null;
  } catch {
    return null;
  }
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

function getClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "ยังไม่ได้ใส่ Gemini API key — กดไอคอนรูปเฟืองเพื่อตั้งค่าก่อนใช้งาน"
    );
  }
  // SDK v3 ใช้ v1 เป็นค่าเริ่มต้น แต่โมเดลใหม่ (gemini-4-*, TTS/Transcribe)
  // เปิดให้ใช้ผ่าน v1beta ก่อน — บังคับ v1beta เพื่อให้เรียกโมเดลได้ครบ
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1beta" },
  });
}

/** ตรวจว่า key ใช้ได้จริง (เรียก list models ไม่กินโควตา) */
export async function validateApiKey(
  key: string
): Promise<{ ok: boolean; errorThai?: string }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.trim())}`,
      { method: "GET" }
    );
    if (res.ok) return { ok: true };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return {
        ok: false,
        errorThai:
          "API key ไม่ถูกต้อง — ตรวจสอบว่าคัดลอกครบและสมัครที่ aistudio.google.com/apikey",
      };
    }
    return {
      ok: false,
      errorThai: `เชื่อมต่อ Google ไม่สำเร็จ (HTTP ${res.status}) — ลองใหม่อีกครั้ง`,
    };
  } catch {
    return {
      ok: false,
      errorThai: "อินเทอร์เน็ตมีปัญหา — เชื่อมต่อเครือข่ายแล้วลองใหม่",
    };
  }
}

function formatError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid")
  ) {
    return new Error(
      "API key ไม่ถูกต้องหรือหมดอายุ — กดไอคอนรูปเฟืองเพื่ออัปเดต key"
    );
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return new Error(
      "ถึงโควตาการใช้งานฟรีชั่วคราว — รอสักครู่แล้วลองใหม่อีกครั้ง"
    );
  }
  if (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.toLowerCase().includes("high demand") ||
    msg.toLowerCase().includes("overloaded")
  ) {
    return new Error(
      "เซิร์ฟเวอร์โมเดลกำลังมีผู้ใช้หนาแน่น — รอ 10-20 วินาทีแล้วกดสร้างใหม่อีกครั้ง"
    );
  }
  if (msg.includes("500") || msg.includes("INTERNAL")) {
    return new Error("เซิร์ฟเวอร์โมเดลขัดข้องชั่วคราว — ลองกดสร้างใหม่อีกครั้ง");
  }
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("ERR_")
  ) {
    return new Error(
      "เชื่อมต่อ Google ไม่ได้ — ตรวจอินเทอร์เน็ต ไฟร์วอลล์ หรือ VPN แล้วลองใหม่"
    );
  }
  return new Error(msg || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
}

/** แปลงข้อความ JSON จากโมเดล พร้อมข้อความ error ภาษาไทยที่อ่านรู้เรื่อง */
function parseModelJson(
  text: string | undefined,
  partLabel: string
): Record<string, any> {
  const raw = (text ?? "").trim();
  if (!raw) {
    throw new Error(
      `โมเดลไม่ได้ส่งข้อมูลกลับมา (${partLabel}) — กดสร้างใหม่อีกครั้ง`
    );
  }
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    throw new Error(
      `ข้อมูลจากโมเดลไม่สมบูรณ์ (${partLabel}) — กดสร้างใหม่อีกครั้ง`
    );
  }
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

const stripMarkdown = (s: unknown): string =>
  typeof s === "string"
    ? s.replace(/\*\*/g, "").replace(/`/g, "").trim()
    : "";

/* ============================================================
 * 1. Text-to-Speech (single speaker or dual-speaker dialogue)
 * ============================================================ */

export interface TtsRequest {
  text?: string;
  voiceName?: string;
  style?: string;
  multiSpeaker?: Array<{
    speaker: string;
    text: string;
    style?: string;
    voiceName: string;
  }>;
}

export async function apiTts(
  params: TtsRequest
): Promise<{ audioBase64: string; mimeType: string }> {
  const ai = getClient();

  if (Array.isArray(params.multiSpeaker) && params.multiSpeaker.length === 2) {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [
        {
          role: "user",
          parts: params.multiSpeaker.map((line) => ({
            text: `${line.speaker}: ${line.text}`,
            speechMetadata: {
              speaker: line.speaker,
              style:
                line.style ||
                "Natural, warm native speaker in everyday conversation",
            },
          })) as never,
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: params.multiSpeaker.map((line) => ({
              speaker: line.speaker,
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: line.voiceName || "Kore" },
              },
            })),
          },
        },
      } as never,
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw formatError("No audio returned from TTS model.");
    return { audioBase64: base64Audio, mimeType: "audio/wav" };
  }

  const text = (params.text || "").trim();
  if (!text) throw formatError("Text is required for speech generation.");

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash-lite-tts",
    contents: [
      {
        role: "user",
        parts: [
          {
            text,
            speechMetadata: {
              style:
                params.style ||
                "Natural, clear native English speaker, friendly and articulate",
            },
          },
        ] as never,
      },
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: params.voiceName || "Kore" },
        },
      },
    } as never,
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw formatError("No audio returned from TTS model.");
  return { audioBase64: base64Audio, mimeType: "audio/wav" };
}

/* ============================================================
 * 2. Transcribe Audio Only
 * ============================================================ */

export async function apiTranscribe(params: {
  audioBase64: string;
  mimeType?: string;
}): Promise<{ transcript: string }> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || "audio/webm",
            data: params.audioBase64,
          },
        },
        {
          text: "Transcribe the spoken English accurately. Return only the spoken words without extra commentary.",
        },
      ],
    },
  });

  return { transcript: (response.text ?? "").trim() };
}

/* ============================================================
 * 3. Transcribe + Pronunciation & Fluency Coaching
 * ============================================================ */

export interface CoachFeedback {
  accuracyScore: number;
  heardText: string;
  feedbackThai: string;
  focusTipThai: string;
  passed: boolean;
}

export async function apiTranscribeCoach(params: {
  audioBase64: string;
  mimeType?: string;
  targetPhrase: string;
  contextThai?: string;
}): Promise<CoachFeedback> {
  const ai = getClient();

  const transcribeResponse = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || "audio/webm",
            data: params.audioBase64,
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
    contents: `Target native phrase: "${params.targetPhrase}"
Context (Thai): ${params.contextThai || "Everyday conversation"}
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
    } as never,
  });

  const parsed = JSON.parse((coachResponse.text ?? "{}").trim());
  return {
    accuracyScore: parsed.accuracyScore ?? 0,
    heardText: spokenText || parsed.heardText || "",
    feedbackThai:
      parsed.feedbackThai ?? "ลองพูดใหม่อีกครั้งให้ชัดเจนขึ้นนะครับ",
    focusTipThai:
      parsed.focusTipThai ?? "เน้นเสียงพยัญชนะท้ายคำและจังหวะการเชื่อมคำ",
    passed: Boolean(parsed.passed),
  };
}

/* ============================================================
 * 4. Live Conversation Roleplay with Native Tutor
 * ============================================================ */

export interface RoleplayResponse {
  tutorReply: string;
  tutorReplyThai: string;
  nativeUpgrade?: {
    isAlreadyNatural: boolean;
    naturalVersion: string;
    whyThai: string;
  };
  suggestedReplies: string[];
}

export async function apiRoleplay(params: {
  tutorName: string;
  tutorCity: string;
  tutorStyle: string;
  scenarioTitle: string;
  scenarioPrompt: string;
  history?: Array<{ role: "tutor" | "user"; text: string }>;
  userMessage: string;
}): Promise<RoleplayResponse> {
  if (!params.userMessage || !params.userMessage.trim()) {
    throw formatError("userMessage is required.");
  }

  const ai = getClient();
  const conversationLog = (params.history || [])
    .slice(-10)
    .map(
      (turn) =>
        `${turn.role === "tutor" ? params.tutorName : "Learner"}: ${turn.text}`
    )
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Tutor Persona: ${params.tutorName} from ${params.tutorCity}. Speaking style: ${params.tutorStyle}.
Roleplay Scenario: ${params.scenarioTitle} — ${params.scenarioPrompt}

Conversation so far:
${conversationLog || "(Start of conversation)"}
Learner just said: "${params.userMessage.trim()}"

Respond in character as ${params.tutorName}. Keep the reply natural, engaging, and 1–3 sentences long. Also give a gentle Native Upgrade on what the learner just said.`,
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
    } as never,
  });

  const parsed = JSON.parse((response.text ?? "{}").trim());
  return parsed as RoleplayResponse;
}

/* ============================================================
 * 5. Evaluate English Writing
 * ============================================================ */

export async function apiEvaluateWriting(params: {
  promptTitle: string;
  promptInstruction: string;
  userText: string;
  targetExpressions?: string[];
}): Promise<WritingEvaluation> {
  if (!params.userText || !params.userText.trim()) {
    throw formatError("Writing text is required.");
  }

  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Writing Task: ${params.promptTitle}
Task Instructions: ${params.promptInstruction}
Recommended Native Expressions: ${(params.targetExpressions || []).join(", ") || "Natural everyday phrasing"}

Learner's Draft:
"""
${params.userText.trim()}
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
    } as never,
  });

  const parsed = JSON.parse((response.text ?? "{}").trim());
  return parsed as WritingEvaluation;
}

/* ============================================================
 * 6. Infinite Endless Lesson Generator (calibrated by Rank A1 -> C2)
 * ============================================================ */

export async function apiGenerateLesson(params: {
  rankId: string;
  sequenceNumber: number;
  topicCategory: string;
  scenarioTitle: string;
  twist: string;
  tutorId: TutorId;
  avoidTitles?: string[];
}): Promise<{ lesson: Lesson }> {
  const ai = getClient();
  const t = TUTOR_META[params.tutorId] || TUTOR_META.maya;
  const pedagogy = RANK_PEDAGOGY_GUIDE[params.rankId] || RANK_PEDAGOGY_GUIDE.A1;

  const sharedBrief = `Target Level: ${params.rankId} — ${pedagogy}
Lesson Sequence #: ${params.sequenceNumber}
Topic Category: ${params.topicCategory}
Specific Scenario: ${params.scenarioTitle}
Situational Twist: ${params.twist}
Main Tutor: ${t.name} (${t.city})
Dialogue Partner: ${t.partnerName}
Avoid duplicating these previous lesson titles: ${(params.avoidTitles || []).slice(-15).join(" | ") || "None"}`;

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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 8192,
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
      } as never,
    }),
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `${sharedBrief}

Create Part 2 of this lesson (Reading + Writing), matching the EXACT quality of our curated lessons:
1. reading.formatLabel (e.g. "Neighborhood Note", "Chat Thread", "Travel Sign"), reading.headline, reading.authorMeta ("${t.name} · ${t.city} · 2 min read").
2. reading.paragraphs: MUST contain EXACTLY 3 short, natural paragraphs in English strictly matching ${params.rankId}.
3. reading.expressions: MUST contain EXACTLY 4 useful phrases/expressions taken VERBATIM (exact spelling!) from those 3 paragraphs. Include valid /IPA/, register ("Casual" | "Neutral" | "Workplace" | "Idiomatic"), meaningThai, and example sentence.
4. reading.questions: MUST contain EXACTLY 2 comprehension questions in Thai, each with 3 options, correctIndex (0, 1, or 2), and explanationThai.
5. writing: promptTitle (short English title), promptInstructionThai, promptInstructionEn, targetExpressions (EXACTLY 4 English phrases), minWords (${params.rankId === "A1" ? 12 : params.rankId === "A2" ? 18 : 25}), sampleStarter.`,
      config: {
        systemInstruction:
          "You are an expert English curriculum designer for Thai learners. Always populate EVERY requested array with the exact item count requested (3 paragraphs, 4 expressions appearing verbatim in the paragraphs, 2 reading questions, 4 targetExpressions). Never return empty arrays. Never use markdown asterisks (**).",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        maxOutputTokens: 8192,
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
      } as never,
    }),
  ]).catch((err) => {
    throw formatError(err);
  });

  const rawPart1 = parseModelJson(partOneRes.text, "ส่วนฟังและพูด");
  const rawPart2 = parseModelJson(partTwoRes.text, "ส่วนอ่านและเขียน");
  const raw = { ...rawPart1, ...rawPart2 };
  const lessonId = `${params.rankId}-${params.sequenceNumber}-${Date.now()}`;
  const paddedNumber = String(params.sequenceNumber).padStart(2, "0");

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
    rankId: params.rankId,
    sequenceNumber: params.sequenceNumber,
    number: paddedNumber,
    topicCategory: params.topicCategory,
    isGenerated: true,
    titleEn: stripMarkdown(raw.titleEn) || params.scenarioTitle,
    titleThai: stripMarkdown(raw.titleThai) || params.scenarioTitle,
    levelLabel: `ระดับ ${params.rankId} · ${params.topicCategory}`,
    durationMinutes: Math.max(10, Math.min(25, Number(raw.durationMinutes) || 14)),
    tutorId: params.tutorId,
    summaryThai:
      stripMarkdown(raw.summaryThai) ||
      `ฝึกฟัง พูด อ่าน เขียน ภาษาอังกฤษระดับ ${params.rankId} ในสถานการณ์ "${params.scenarioTitle}"`,
    culturalInsightThai:
      stripMarkdown(raw.culturalInsightThai) ||
      `สังเกตน้ำเสียงและจังหวะการพูดจริงของครู ${t.name} เพื่อนำไปใช้สื่อสารอย่างเป็นธรรมชาติ`,
    listening: {
      sceneTitleThai:
        stripMarkdown(raw.listening?.sceneTitleThai) || `บรรยากาศ: ${params.scenarioTitle}`,
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
        stripMarkdown(raw.speaking?.roleplayTitle) || params.scenarioTitle,
      roleplayContextThai: stripMarkdown(raw.speaking?.roleplayContextThai),
      roleplayScenarioPrompt:
        stripMarkdown(raw.speaking?.roleplayScenarioPrompt) ||
        `Roleplay ${params.scenarioTitle} at CEFR ${params.rankId} level.`,
      openingLineEn:
        stripMarkdown(raw.speaking?.openingLineEn) || "Hi! How's it going?",
      openingLineThai:
        stripMarkdown(raw.speaking?.openingLineThai) || "สวัสดี! เป็นไงบ้าง?",
      goalTurns: params.rankId === "A1" ? 2 : 3,
    },
    reading: {
      formatLabel:
        stripMarkdown(raw.reading?.formatLabel) || "Native Reading",
      headline: stripMarkdown(raw.reading?.headline) || params.scenarioTitle,
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
        stripMarkdown(raw.writing?.promptTitle) || params.scenarioTitle,
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
    throw formatError(
      "เนื้อหาบทเรียนที่สร้างไม่สมบูรณ์ กรุณาลองกดสร้างใหม่อีกครั้ง"
    );
  }

  return { lesson: hydratedLesson as Lesson };
}

/* ============================================================
 * 7. Generate 4-Skill Rank Promotion Exam
 * ============================================================ */

export async function apiGenerateExam(params: {
  rankId: string;
}): Promise<{ exam: PromotionExam }> {
  const ai = getClient();
  const pedagogy =
    RANK_PEDAGOGY_GUIDE[params.rankId] || RANK_PEDAGOGY_GUIDE.A1;
  const tutorKeys = Object.keys(TUTOR_META);
  const examinerTutorId =
    tutorKeys[Math.floor(Math.random() * tutorKeys.length)] || "maya";
  const examiner = TUTOR_META[examinerTutorId];

  const response = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Create a fresh 4-skill Rank Promotion Exam to test whether a Thai learner has mastered CEFR ${params.rankId} (${pedagogy}) and is ready to advance to the next level.
Examiner: ${examiner.name} from ${examiner.city}.

Requirements (ALL arrays must be populated completely):
1. listening: A natural spoken monologue or short story script (4-6 sentences matching ${params.rankId}) + Thai context + EXACTLY 2 comprehension questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
2. reading: Headline + authentic short passage (2-3 paragraphs matching ${params.rankId}) + EXACTLY 2 comprehension/nuance questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
3. speaking: A realistic spoken question/prompt from ${examiner.name} in English (promptEn) + Thai translation (promptThai) + helpful guidance in Thai.
4. writing: A realistic writing prompt in English (promptEn) + Thai instruction (promptThai) + appropriate minWords (${params.rankId === "A1" ? 15 : params.rankId === "A2" ? 20 : 30}).`,
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
    } as never,
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
    rankId: params.rankId,
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
    throw formatError(
      "ชุดข้อสอบที่สร้างไม่สมบูรณ์ กรุณาลองเปิดสอบใหม่อีกครั้ง"
    );
  }

  return { exam: exam as PromotionExam };
}

/* ============================================================
 * 8. Grade 4-Skill Rank Promotion Exam
 * ============================================================ */

export async function apiGradeExam(params: {
  rankId: string;
  passingScore?: number;
  listeningScore?: number;
  readingScore?: number;
  speakingAudioBase64?: string;
  speakingMimeType?: string;
  speakingTextFallback?: string;
  speakingPromptEn?: string;
  writingText?: string;
  writingPromptEn?: string;
}): Promise<PromotionExamResult> {
  const ai = getClient();
  const listeningScore = params.listeningScore ?? 0;
  const readingScore = params.readingScore ?? 0;
  const passingScore = params.passingScore ?? 70;
  let spokenTranscript = (params.speakingTextFallback || "").trim();

  if (params.speakingAudioBase64) {
    const trRes = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: params.speakingMimeType || "audio/webm",
              data: params.speakingAudioBase64,
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
    RANK_PEDAGOGY_GUIDE[params.rankId] || RANK_PEDAGOGY_GUIDE.A1;

  const gradeRes = await ai.models.generateContent({
    model: "gemini-4-hydrogen",
    contents: `Grade the Speaking and Writing sections of a CEFR ${params.rankId} Promotion Exam (${pedagogy}).
Passing standard: ${passingScore}/100.

Speaking Prompt: "${params.speakingPromptEn || ""}"
Learner's Spoken Response (transcribed): "${spokenTranscript || "(No speech provided)"}"

Writing Prompt: "${params.writingPromptEn || ""}"
Learner's Written Response: "${params.writingText || "(No text provided)"}"

Listening Score (objective): ${listeningScore}/100
Reading Score (objective): ${readingScore}/100

Grade realistically and fairly for ${params.rankId} level (don't expect C2 perfection for an A1 beginner, but ensure genuine communicative competence at ${params.rankId}).`,
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
    } as never,
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

  return {
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
  };
}
