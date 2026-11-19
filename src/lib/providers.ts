import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Multi-provider BYOK layer.
 * ผู้ใช้ใส่ key ของค่ายใดก็ได้ (Gemini / OpenAI / Claude / OpenRouter / Groq /
 * DeepSeek / Mistral / custom OpenAI-compatible) — เก็บใน localStorage ของเครื่องผู้ใช้เท่านั้น
 */

export type ProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "deepseek"
  | "mistral"
  | "custom";

export type ProviderKind = "gemini" | "openai" | "anthropic";

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  defaultModel: string;
  keyHint: string;
  docsUrl: string;
  helpThai: string;
  allowBaseUrlEdit: boolean;
  /** โมเดลสำหรับ /audio/transcriptions (เฉพาะค่ายที่รองรับ) */
  transcriptionModel?: string;
  ttsNoteThai?: string;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-4-hydrogen",
    keyHint: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
    helpThai:
      "ล็อกอินบัญชี Google → สร้าง API key → คัดลอก key ที่ขึ้นต้นด้วย AIza",
    allowBaseUrlEdit: false,
  },
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    keyHint: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
    helpThai:
      "ล็อกอิน platform.openai.com → API keys → Create new secret key (ขึ้นต้น sk-proj-)",
    allowBaseUrlEdit: false,
    transcriptionModel: "whisper-1",
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์คุณภาพสูง",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-latest",
    keyHint: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    helpThai:
      "ล็อกอิน Anthropic Console → Settings → API Keys → Create Key (ขึ้นต้น sk-ant-)",
    allowBaseUrlEdit: false,
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์และการถอดเสียง",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    keyHint: "sk-or-...",
    docsUrl: "https://openrouter.ai/keys",
    helpThai:
      "ล็อกอิน OpenRouter → Keys → Create Key (ขึ้นต้น sk-or-) รองรับโมเดลหลายค่ายใน key เดียว",
    allowBaseUrlEdit: false,
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์และการถอดเสียง",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    keyHint: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
    helpThai: "ล็อกอิน Groq Console → API Keys → Create API Key (ขึ้นต้น gsk_)",
    allowBaseUrlEdit: false,
    transcriptionModel: "whisper-large-v3",
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์คุณภาพสูง",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    keyHint: "sk-...",
    docsUrl: "https://platform.deepseek.com/api_keys",
    helpThai: "ล็อกอิน DeepSeek Platform → API keys → Create key",
    allowBaseUrlEdit: false,
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์และการถอดเสียง",
  },
  {
    id: "mistral",
    label: "Mistral AI",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    keyHint: "_global_key_...",
    docsUrl: "https://console.mistral.ai/api-keys/",
    helpThai: "ล็อกอิน Mistral Console → API Keys → Create new key",
    allowBaseUrlEdit: false,
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์และการถอดเสียง",
  },
  {
    id: "custom",
    label: "อื่น ๆ (OpenAI-compatible)",
    kind: "openai",
    baseUrl: "",
    defaultModel: "",
    keyHint: "ใส่ key ตามที่ผู้ให้บริการกำหนด",
    docsUrl: "",
    helpThai:
      "ระบุ Base URL แบบ OpenAI-compatible (เช่น https://api.example.com/v1) และชื่อโมเดลเอง",
    allowBaseUrlEdit: true,
    ttsNoteThai: "รองรับเฉพาะ Gemini key สำหรับเสียงพากย์และการถอดเสียง",
  },
];

const PROVIDER_MAP = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
) as Record<ProviderId, ProviderDefinition>;

const PROVIDER_STORAGE = "nativebridge_provider_v1";
const KEY_STORAGE = "nativebridge_api_key_v1";
const MODEL_STORAGE = "nativebridge_model_v1";
const BASE_URL_STORAGE = "nativebridge_base_url_v1";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage อาจถูกปิดในโหมดส่วนตัว */
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ================= storage ================= */

export function getProviderId(): ProviderId {
  const stored = safeGet(PROVIDER_STORAGE) as ProviderId | null;
  return stored && PROVIDER_MAP[stored] ? stored : "gemini";
}

export function setProviderId(id: ProviderId) {
  if (PROVIDER_MAP[id]) safeSet(PROVIDER_STORAGE, id);
}

export function getApiKey(): string | null {
  return safeGet(KEY_STORAGE) || null;
}

export function setApiKey(key: string) {
  safeSet(KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  safeRemove(KEY_STORAGE);
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

export function getModelOverride(): string {
  return (safeGet(MODEL_STORAGE) || "").trim();
}

export function setModelOverride(model: string) {
  const value = model.trim();
  if (value) safeSet(MODEL_STORAGE, value);
  else safeRemove(MODEL_STORAGE);
}

export function getBaseUrlOverride(): string {
  return (safeGet(BASE_URL_STORAGE) || "").trim().replace(/\/+$/, "");
}

export function setBaseUrlOverride(baseUrl: string) {
  const value = baseUrl.trim().replace(/\/+$/, "");
  if (value) safeSet(BASE_URL_STORAGE, value);
  else safeRemove(BASE_URL_STORAGE);
}

export function getProviderDefinition(id?: ProviderId): ProviderDefinition {
  return PROVIDER_MAP[id || getProviderId()] || PROVIDER_MAP.gemini;
}

export interface ActiveConfig {
  provider: ProviderDefinition;
  key: string;
  model: string;
  baseUrl: string;
}

export function getActiveConfig(): ActiveConfig {
  const provider = getProviderDefinition();
  return {
    provider,
    key: getApiKey() || "",
    model: getModelOverride() || provider.defaultModel,
    baseUrl: getBaseUrlOverride() || provider.baseUrl,
  };
}

export function getMaskedKey(): string {
  const key = getApiKey() || "";
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/* ================= errors & parsing ================= */

export function formatApiError(err: unknown, providerLabel?: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("missing key") || msg.includes("ยังไม่ได้ใส่")) {
    return new Error("ยังไม่ได้ใส่ API key — กดปุ่มตั้งค่าด้านขวาบนเพื่อเพิ่ม key");
  }
  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid") ||
    msg.toLowerCase().includes("incorrect api key") ||
    msg.toLowerCase().includes("invalid api key") ||
    msg.toLowerCase().includes("unauthorized")
  ) {
    return new Error(
      "API key ไม่ถูกต้องหรือหมดอายุ — กดปุ่มตั้งค่าด้านขวาบนเพื่ออัปเดต key"
    );
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return new Error(
      "ถึงโควตาการใช้งานฟรีชั่วคราว — รอสักครู่แล้วลองใหม่ หรือเปลี่ยน key/ค่ายอื่น"
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
  if (msg.includes("400") || msg.toLowerCase().includes("model not found")) {
    return new Error(
      `โมเดลที่เลือกอาจใช้ไม่ได้กับ ${providerLabel || "ผู้ให้บริการ"} — กดปุ่มตั้งค่าเพื่อเปลี่ยนชื่อโมเดล`
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
      `เชื่อมต่อ ${providerLabel || "ผู้ให้บริการ AI"} ไม่ได้ — ตรวจอินเทอร์เน็ต ไฟร์วอลล์ หรือ VPN แล้วลองใหม่`
    );
  }
  return new Error(msg || "เกิดข้อผิดพลาดที่ไม่คาดคิด");
}

export function parseModelJson(
  text: string | undefined,
  partLabel: string
): Record<string, any> {
  let raw = (text ?? "").trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) raw = fenced[1].trim();
  if (!raw.startsWith("{")) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  }
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

async function readJsonResponse(res: Response, providerLabel: string): Promise<any> {
  const body = await res.text();
  if (!res.ok) {
    let detail = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.error?.message || parsed?.message || detail;
    } catch {
      /* ใช้ข้อความดิบ */
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${providerLabel} ส่งข้อมูลไม่สมบูรณ์ — ลองใหม่อีกครั้ง`);
  }
}

function makeGeminiClient(key: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: { apiVersion: "v1beta" },
  });
}

/** ใช้เฉพาะ TTS (Gemini) — ค่ายอื่นให้ audio.ts fallback ไป speechSynthesis */
export function getGeminiClient(): GoogleGenAI {
  const { provider, key } = getActiveConfig();
  if (provider.id !== "gemini" || !key) {
    throw new Error(
      "เสียงพากย์คุณภาพสูงใช้ได้กับ Gemini key — แอปจะใช้เสียงจากเบราว์เซอร์แทน"
    );
  }
  return makeGeminiClient(key);
}

/* ================= key validation ================= */

export async function validateProviderKey(
  key: string,
  providerId: ProviderId,
  baseUrlOverride?: string
): Promise<{ ok: boolean; errorThai?: string }> {
  const trimmed = key.trim();
  const provider = getProviderDefinition(providerId);
  if (!trimmed) {
    return { ok: false, errorThai: "กรุณาวาง API key ก่อนตรวจสอบ" };
  }

  const baseUrl = (baseUrlOverride || provider.baseUrl).trim().replace(/\/+$/, "");
  if (provider.kind !== "gemini" && !baseUrl) {
    return {
      ok: false,
      errorThai: "กรุณาระบุ Base URL ของผู้ให้บริการ (เช่น https://api.example.com/v1)",
    };
  }

  try {
    let res: Response;
    if (provider.kind === "gemini") {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`,
        { method: "GET" }
      );
    } else if (provider.kind === "anthropic") {
      res = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          "x-api-key": trimmed,
          "anthropic-version": "2023-06-01",
        },
      });
    } else {
      res = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${trimmed}` },
      });
    }

    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        errorThai: `API key ไม่ถูกต้อง — ตรวจสอบว่าคัดลอกครบจาก ${provider.label}`,
      };
    }
    if (res.status === 404 && provider.allowBaseUrlEdit) {
      return {
        ok: false,
        errorThai: "ไม่พบ endpoint /models — ตรวจสอบ Base URL ว่าถูกต้องและลงท้ายด้วย /v1",
      };
    }
    return {
      ok: false,
      errorThai: `เชื่อมต่อ ${provider.label} ไม่สำเร็จ (HTTP ${res.status}) — ลองใหม่อีกครั้ง`,
    };
  } catch {
    return {
      ok: false,
      errorThai: "อินเทอร์เน็ตมีปัญหา — เชื่อมต่อเครือข่ายแล้วลองใหม่",
    };
  }
}

/* ================= provider-agnostic JSON generation ================= */

export interface GenerateJsonOptions {
  prompt: string;
  systemInstruction?: string;
  schema?: unknown;
  thinkingLevel?: "LOW" | "MEDIUM" | "HIGH";
  maxOutputTokens?: number;
  label?: string;
}

export async function generateJson(
  opts: GenerateJsonOptions
): Promise<Record<string, any>> {
  const { provider, key, model, baseUrl } = getActiveConfig();
  if (!key) throw formatApiError(new Error("missing key"), provider.label);

  const label = opts.label || "ข้อมูลจากโมเดล";
  const baseSystem = opts.systemInstruction || "";
  const jsonRule =
    "ตอบกลับด้วย JSON object ที่สมบูรณ์เพียง 1 ชิ้นเท่านั้น ห้ามขึ้นโค้ดเฟนซ์ ``` ห้ามคำอธิบายเพิ่ม";
  let system = `${baseSystem}\n\n${jsonRule}`.trim();
  if (provider.kind !== "gemini" && opts.schema) {
    system += `\n\nRequired JSON structure:\n${JSON.stringify(opts.schema)}`;
  }

  try {
    if (provider.kind === "gemini") {
      const config: Record<string, unknown> = {
        systemInstruction: baseSystem,
        responseMimeType: "application/json",
      };
      if (opts.schema) config.responseSchema = opts.schema;
      if (opts.thinkingLevel) {
        config.thinkingConfig = {
          thinkingLevel:
            opts.thinkingLevel === "MEDIUM"
              ? ThinkingLevel.MEDIUM
              : ThinkingLevel.LOW,
        };
      }
      if (opts.maxOutputTokens) config.maxOutputTokens = opts.maxOutputTokens;

      const response = await makeGeminiClient(key).models.generateContent({
        model,
        contents: opts.prompt,
        config: config as never,
      });
      return parseModelJson(response.text, label);
    }

    if (provider.kind === "anthropic") {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: Math.min(opts.maxOutputTokens || 4096, 8192),
          system,
          messages: [{ role: "user", content: opts.prompt }],
        }),
      });
      const data = await readJsonResponse(response, provider.label);
      const text = (Array.isArray(data?.content) ? data.content : [])
        .filter((block: { type?: string }) => block.type === "text")
        .map((block: { text?: string }) => block.text || "")
        .join("\n");
      return parseModelJson(text, label);
    }

    /* OpenAI-compatible: OpenAI / OpenRouter / Groq / DeepSeek / Mistral / custom */
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: opts.prompt },
      ],
      temperature: 0.4,
      ...(opts.maxOutputTokens ? { max_tokens: opts.maxOutputTokens } : {}),
    };

    let response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ ...body, response_format: { type: "json_object" } }),
    });

    // บาง endpoint แบบ OpenAI-compatible ไม่รองรับ response_format → ลองใหม่โดยไม่ใส่
    if (response.status === 400) {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      });
    }

    const data = await readJsonResponse(response, provider.label);
    const content = data?.choices?.[0]?.message?.content ?? "";
    return parseModelJson(
      typeof content === "string" ? content : JSON.stringify(content),
      label
    );
  } catch (err) {
    throw formatApiError(err, provider.label);
  }
}

/* ================= transcription ================= */

function base64ToBlob(base64: string, mimeType: string): Blob {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "audio/webm" });
}

function audioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export async function transcribeAudio(params: {
  audioBase64: string;
  mimeType?: string;
  prompt?: string;
}): Promise<string> {
  const { provider, key, baseUrl, model } = getActiveConfig();
  if (!key) throw formatApiError(new Error("missing key"), provider.label);
  const mimeType = params.mimeType || "audio/webm";

  try {
    if (provider.kind === "gemini") {
      const response = await makeGeminiClient(key).models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            { inlineData: { mimeType, data: params.audioBase64 } },
            {
              text:
                params.prompt ||
                "Transcribe the spoken English accurately. Return only the spoken words without extra commentary.",
            },
          ],
        },
      });
      return (response.text ?? "").trim();
    }

    const transcribeModel =
      provider.transcriptionModel ||
      (provider.id === "custom" ? model : "");
    if (provider.kind === "openai" && transcribeModel) {
      const form = new FormData();
      form.append(
        "file",
        base64ToBlob(params.audioBase64, mimeType),
        `speech.${audioExtension(mimeType)}`
      );
      form.append("model", transcribeModel);
      const response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
      const data = await readJsonResponse(response, provider.label);
      return String(data?.text ?? "").trim();
    }

    throw new Error(
      `ผู้ให้บริการ ${provider.label} ยังไม่รองรับการถอดเสียง — เปลี่ยนเป็น Gemini / OpenAI / Groq หรือใช้โหมดพิมพ์แทนได้`
    );
  } catch (err) {
    throw formatApiError(err, provider.label);
  }
}
