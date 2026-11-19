import { Type } from "@google/genai";
import type {
  Lesson,
  PromotionExam,
  PromotionExamResult,
  TutorId,
  WritingEvaluation,
} from "../types/lesson";
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
  getGeminiClient,
  isElevenLabsAvailable,
  apiElevenLabsTts,
  generateJson,
  transcribeAudio,
  validateProviderKey,
  formatApiError as formatError,
  type ProviderId,
} from "./providers";

/**
 * BYOK (Bring Your Own Key) — รองรับหลายค่ายผ่าน lib/providers.ts
 * ผู้ใช้ใส่ key ของตัวเอง (เก็บไว้ใน localStorage ของเครื่องผู้ใช้เท่านั้น)
 * เนื้อหาคำสั่งและโครงสร้างบทเรียนเหมือนฉบับเดิมทุกประโยค
 */

export {
  getApiKey,
  setApiKey,
  clearApiKey,
  hasApiKey,
};

/** ตรวจว่า key ใช้ได้จริง (เรียก list models ไม่กินโควตา) */
export async function validateApiKey(
  key: string,
  providerId: ProviderId = "gemini",
  baseUrl?: string
): Promise<{ ok: boolean; errorThai?: string }> {
  return validateProviderKey(key, providerId, baseUrl);
}

export async function validateKey(
  key: string,
  providerId: ProviderId,
  baseUrl?: string
) {
  return validateProviderKey(key, providerId, baseUrl);
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
  const isDialogue =
    Array.isArray(params.multiSpeaker) && params.multiSpeaker.length === 2;

  // ใช้ ElevenLabs ก่อนเมื่อมี key (ประหยัดโควตาเสียง Gemini)
  // ถ้า ElevenLabs ไม่สำเร็จหรือไม่มี key → ใช้ Gemini ตามเดิม
  if (isElevenLabsAvailable()) {
    try {
      const spokenText = isDialogue
        ? params.multiSpeaker!.map((l) => `${l.speaker}: ${l.text}`).join("\n")
        : (params.text || "").trim();
      if (spokenText) {
        return await apiElevenLabsTts({
          text: spokenText,
          style: params.style,
        });
      }
    } catch {
      // fall through ไป Gemini
    }
  }

  const ai = getGeminiClient();

  if (isDialogue) {
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
  const transcript = await transcribeAudio({
    audioBase64: params.audioBase64,
    mimeType: params.mimeType,
  });
  return { transcript };
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
  const spokenText = await transcribeAudio({
    audioBase64: params.audioBase64,
    mimeType: params.mimeType,
    prompt:
      "Transcribe the learner's English speech verbatim. Return only the transcribed text.",
  });

  const parsed = await generateJson({
    systemInstruction:
      "You are a warm, observant native English pronunciation coach teaching a Thai learner. Compare the transcribed speech with the target phrase. Give practical advice in Thai about word stress, linking/connected speech, final consonants (-s, -ed, -t, -d), or rhythm. Be encouraging and concise.",
    prompt: `Target native phrase: "${params.targetPhrase}"
Context (Thai): ${params.contextThai || "Everyday conversation"}
What the Thai learner actually said (transcribed): "${spokenText || "(silence / unclear)"}"

Evaluate the learner's spoken attempt kindly and concretely like a real native tutor coaching a Thai speaker.`,
    schema: {
      type: Type.OBJECT,
      properties: {
        accuracyScore: { type: Type.INTEGER },
        heardText: { type: Type.STRING },
        feedbackThai: { type: Type.STRING },
        focusTipThai: { type: Type.STRING },
        passed: { type: Type.BOOLEAN },
      },
    },
    thinkingLevel: "LOW",
    label: "ผลประเมินการออกเสียง",
  });
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

  const conversationLog = (params.history || [])
    .slice(-10)
    .map(
      (turn) =>
        `${turn.role === "tutor" ? params.tutorName : "Learner"}: ${turn.text}`
    )
    .join("\n");

  const parsed = await generateJson({
    systemInstruction:
      "You are a friendly native English speaker having a real-life conversation with a Thai learner. Speak like a real local, never like a robotic textbook. Also coach them subtly by showing how a native speaker might phrase their sentence even more naturally.",
    prompt: `Tutor Persona: ${params.tutorName} from ${params.tutorCity}. Speaking style: ${params.tutorStyle}.
Roleplay Scenario: ${params.scenarioTitle} — ${params.scenarioPrompt}

Conversation so far:
${conversationLog || "(Start of conversation)"}
Learner just said: "${params.userMessage.trim()}"

Respond in character as ${params.tutorName}. Keep the reply natural, engaging, and 1–3 sentences long. Also give a gentle Native Upgrade on what the learner just said.`,
    schema: {
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
    thinkingLevel: "LOW",
    label: "บทสนทนาจำลอง",
  });
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

  const parsed = await generateJson({
    systemInstruction:
      "You are a native English writing coach for Thai learners. Preserve the learner's intended meaning while elevating their phrasing from translated-from-Thai English to truly natural native English. Explain nuances clearly in Thai.",
    prompt: `Writing Task: ${params.promptTitle}
Task Instructions: ${params.promptInstruction}
Recommended Native Expressions: ${(params.targetExpressions || []).join(", ") || "Natural everyday phrasing"}

Learner's Draft:
"""
${params.userText.trim()}
"""

Review this English draft as a supportive native English editor coaching a Thai learner.`,
    schema: {
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
    thinkingLevel: "MEDIUM",
    label: "ผลประเมินการเขียน",
  });
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

  const [rawPart1, rawPart2] = await Promise.all([
    generateJson({
      prompt: `${sharedBrief}

Create Part 1 of this lesson (Lesson Metadata + Listening + Speaking), matching the EXACT quality of our curated lessons:
1. titleEn, titleThai (concise natural Thai, no numbering), summaryThai (1-2 Thai sentences), culturalInsightThai (1-2 Thai sentences), durationMinutes (12-18).
2. listening.sceneTitleThai ("บรรยากาศ: ..."), listening.contextThai (1-2 Thai sentences), listening.dialogue: MUST contain EXACTLY 4 alternating turns (${t.name}, ${t.partnerName}, ${t.name}, ${t.partnerName}). Include connectedPhrase (exact substring from english), connectedSoundsLike (Thai phonetic guide like "แค-นาย-แฮฟ"), and connectedExplanationThai on turns 1 and 3.
3. listening.questions: MUST contain EXACTLY 2 multiple-choice comprehension questions in Thai, each with 3 distinct options in Thai and correctIndex (0, 1, or 2) + explanationThai.
4. speaking.shadowingPhrases: MUST contain EXACTLY 3 practical phrases for this scenario. stressGuide uses UPPERCASE for stressed words (no asterisks), valid /IPA/, thaiMeaning, and nativeTipThai.
5. speaking.roleplayTitle, roleplayContextThai, roleplayScenarioPrompt, openingLineEn, openingLineThai.`,
      systemInstruction:
        "You are an expert English curriculum designer for Thai learners. Always populate EVERY requested array with the exact item count requested (4 dialogue lines, 2 listening questions, 3 shadowing phrases). Never return empty arrays. Never use markdown asterisks (**).",
      thinkingLevel: "LOW",
      maxOutputTokens: 8192,
      label: "ส่วนฟังและพูด",
      schema: {
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
    }),
    generateJson({
      prompt: `${sharedBrief}

Create Part 2 of this lesson (Reading + Writing), matching the EXACT quality of our curated lessons:
1. reading.formatLabel (e.g. "Neighborhood Note", "Chat Thread", "Travel Sign"), reading.headline, reading.authorMeta ("${t.name} · ${t.city} · 2 min read").
2. reading.paragraphs: MUST contain EXACTLY 3 short, natural paragraphs in English strictly matching ${params.rankId}.
3. reading.expressions: MUST contain EXACTLY 4 useful phrases/expressions taken VERBATIM (exact spelling!) from those 3 paragraphs. Include valid /IPA/, register ("Casual" | "Neutral" | "Workplace" | "Idiomatic"), meaningThai, and example sentence.
4. reading.questions: MUST contain EXACTLY 2 comprehension questions in Thai, each with 3 options, correctIndex (0, 1, or 2), and explanationThai.
5. writing: promptTitle (short English title), promptInstructionThai, promptInstructionEn, targetExpressions (EXACTLY 4 English phrases), minWords (${params.rankId === "A1" ? 12 : params.rankId === "A2" ? 18 : 25}), sampleStarter.`,
      systemInstruction:
        "You are an expert English curriculum designer for Thai learners. Always populate EVERY requested array with the exact item count requested (3 paragraphs, 4 expressions appearing verbatim in the paragraphs, 2 reading questions, 4 targetExpressions). Never return empty arrays. Never use markdown asterisks (**).",
      thinkingLevel: "LOW",
      maxOutputTokens: 8192,
      label: "ส่วนอ่านและเขียน",
      schema: {
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
    }),
  ]).catch((err) => {
    throw formatError(err);
  });

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
  const pedagogy =
    RANK_PEDAGOGY_GUIDE[params.rankId] || RANK_PEDAGOGY_GUIDE.A1;
  const tutorKeys = Object.keys(TUTOR_META);
  const examinerTutorId =
    tutorKeys[Math.floor(Math.random() * tutorKeys.length)] || "maya";
  const examiner = TUTOR_META[examinerTutorId];

  const raw = await generateJson({
    prompt: `Create a fresh 4-skill Rank Promotion Exam to test whether a Thai learner has mastered CEFR ${params.rankId} (${pedagogy}) and is ready to advance to the next level.
Examiner: ${examiner.name} from ${examiner.city}.

Requirements (ALL arrays must be populated completely):
1. listening: A natural spoken monologue or short story script (4-6 sentences matching ${params.rankId}) + Thai context + EXACTLY 2 comprehension questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
2. reading: Headline + authentic short passage (2-3 paragraphs matching ${params.rankId}) + EXACTLY 2 comprehension/nuance questions in Thai (3 distinct options each, correctIndex 0-2, Thai explanation).
3. speaking: A realistic spoken question/prompt from ${examiner.name} in English (promptEn) + Thai translation (promptThai) + helpful guidance in Thai.
4. writing: A realistic writing prompt in English (promptEn) + Thai instruction (promptThai) + appropriate minWords (${params.rankId === "A1" ? 15 : params.rankId === "A2" ? 20 : 30}).`,
    systemInstruction:
      "You are a fair, authoritative English proficiency examiner. Design a realistic, practical 4-skill promotion test matching the exact CEFR level. Always populate all arrays with 2 questions and 3 options each. Never use markdown asterisks (**).",
    label: "ข้อสอบเลื่อนลำดับขั้น",
    schema: {
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
  });

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
  const listeningScore = params.listeningScore ?? 0;
  const readingScore = params.readingScore ?? 0;
  const passingScore = params.passingScore ?? 70;
  let spokenTranscript = (params.speakingTextFallback || "").trim();

  if (params.speakingAudioBase64) {
    const transcript = await transcribeAudio({
      audioBase64: params.speakingAudioBase64,
      mimeType: params.speakingMimeType,
      prompt:
        "Transcribe the spoken English accurately. Return only the spoken words.",
    });
    spokenTranscript = transcript || spokenTranscript;
  }

  const pedagogy =
    RANK_PEDAGOGY_GUIDE[params.rankId] || RANK_PEDAGOGY_GUIDE.A1;

  const parsed = await generateJson({
    prompt: `Grade the Speaking and Writing sections of a CEFR ${params.rankId} Promotion Exam (${pedagogy}).
Passing standard: ${passingScore}/100.

Speaking Prompt: "${params.speakingPromptEn || ""}"
Learner's Spoken Response (transcribed): "${spokenTranscript || "(No speech provided)"}"

Writing Prompt: "${params.writingPromptEn || ""}"
Learner's Written Response: "${params.writingText || "(No text provided)"}"

Listening Score (objective): ${listeningScore}/100
Reading Score (objective): ${readingScore}/100

Grade realistically and fairly for ${params.rankId} level (don't expect C2 perfection for an A1 beginner, but ensure genuine communicative competence at ${params.rankId}).`,
    systemInstruction:
      "You are a fair native English examiner grading a Thai learner's Promotion Test. Provide honest numeric scores (0-100) for speaking and writing, plus encouraging, actionable feedback in natural Thai.",
    thinkingLevel: "MEDIUM",
    label: "ผลสอบเลื่อนลำดับขั้น",
    schema: {
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
  });
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
