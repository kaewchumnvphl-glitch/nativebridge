import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  PROVIDERS,
  HIDDEN_PROVIDER_LABELS,
  getActiveConfig,
  getProviderDefinition,
  getProviderConfig,
  getMaskedKey,
  hasApiKey,
  setProviderId,
  saveProviderConfig,
  validateProviderKey,
  type ProviderId,
} from "../lib/providers";
import {
  getDeviceId,
  getFeedback,
  setTrialStart,
  hasTrialStarted,
  isInTrial,
  getTrialExpiry,
  submitFeedback,
  resetTrial,
  type FeedbackEntry,
} from "../lib/access";

/** สเต็ปของเกต */
type GateStep = "checking" | "need-key" | "need-access" | "ready" | "trial-info";

/** ปุ่มคัดลอก */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "คัดลอกแล้ว" : label || "คัดลอก"}
    </button>
  );
}

/* ================= ฟอร์มส่งความคิดเห็น ================= */

function formatThaiDateTime(iso: string): string {
  if (!iso) return "ไม่ทราบเวลา";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "ไม่ทราบเวลา";
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FeedbackForm() {
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [lastEntry, setLastEntry] = useState<FeedbackEntry | null>(null);
  const [saved, setSaved] = useState<FeedbackEntry[]>(() => getFeedback());
  const [showSaved, setShowSaved] = useState(false);

  const submit = () => {
    const result = submitFeedback(message, contact);
    if (!result.ok) {
      setStatus("error");
      setError(result.error || "ส่งความคิดเห็นไม่สำเร็จ");
      return;
    }
    setStatus("success");
    setError("");
    setLastEntry(result.entry ?? null);
    setSaved(getFeedback());
    setMessage("");
    setContact("");
  };

  const textToShare = (lastEntry?.message || message).trim();
  const shareText = `${textToShare}\n\n— ส่งจากแอป NativeBridge`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
  const issueUrl = `https://github.com/kaewchumnvphl-glitch/nativebridge/issues/new?title=${encodeURIComponent(
    "ความคิดเห็นจากผู้ใช้ NativeBridge"
  )}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <MessageCircle className="h-4 w-4" /> ส่งความคิดเห็น
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
          เล่าให้ฟังหน่อยว่าชอบอะไร ปัญหาที่เจอ หรืออยากให้ปรับอะไร —
          ข้อความจะถูกบันทึกไว้ในเครื่องนี้ก่อน แล้วคุณเลือกส่งต่อให้ทีมพัฒนาได้
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        rows={4}
        maxLength={2000}
        placeholder="ตัวอย่าง: ฟีเจอร์ฟังบทสนทนาใช้ดีมาก แต่ปุ่มสร้างบทเรียนใหม่รอนาน / เจอข้อความผิดตรงไหน..."
        className="w-full resize-y rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={120}
          placeholder="ช่องทางติดต่อ (ไม่บังคับ)"
          className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <span className="text-[11px] tabular-nums text-emerald-700/70">
          {message.length}/2000
        </span>
      </div>

      {status === "error" && (
        <p className="flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {status === "success" ? (
        <div className="space-y-3 rounded-lg border border-emerald-300 bg-white p-3">
          <p className="flex items-start gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            บันทึกความคิดเห็นแล้ว — ขอบคุณครับ!
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            ข้อความอยู่ในเครื่องนี้แล้ว หากต้องการให้ทีมพัฒนาเห็นทันที
            เลือกช่องทางด้านล่างได้เลย
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={shareText} label="คัดลอกข้อความ" />
            <a
              href={lineUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95"
            >
              <MessageCircle className="h-3.5 w-3.5" /> แชร์ผ่าน LINE
            </a>
            <a
              href={issueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> เปิด GitHub Issue
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setLastEntry(null);
            }}
            className="text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >
            ส่งอีกข้อความ
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!message.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> ส่งความคิดเห็น
        </button>
      )}

      {saved.length > 0 && (
        <div className="border-t border-emerald-200/70 pt-2">
          <button
            type="button"
            onClick={() => setShowSaved((v) => !v)}
            className="text-xs font-semibold text-emerald-800/80 hover:text-emerald-900"
          >
            {showSaved ? "ซ่อน" : "ดู"}ความคิดเห็นที่บันทึกไว้ ({saved.length})
          </button>
          {showSaved && (
            <ul className="mt-2 space-y-2">
              {saved
                .slice(-3)
                .reverse()
                .map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg border border-emerald-200 bg-white p-2.5 text-xs text-slate-600"
                  >
                    <p className="whitespace-pre-wrap break-words">{entry.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatThaiDateTime(entry.timestamp)}
                      {entry.contact ? ` · ${entry.contact}` : ""}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= ขั้นที่ 1: ใส่ API key (เหมือนเดิม) ================= */

function ApiKeyStep({ onDone }: { onDone: () => void }) {
  const initial = getActiveConfig();
  const [providerId, setSelectedProvider] = useState<ProviderId>(
    initial.provider.id
  );
  // เติม key ที่บันทึกไว้ของค่ายที่กำลังใช้งาน เพื่อให้ปุ่มบันทึกกดได้ทันที
  const [key, setKey] = useState(initial.key || "");
  const [model, setModel] = useState(
    initial.model === initial.provider.defaultModel ? "" : initial.model
  );
  const [baseUrl, setBaseUrl] = useState(
    initial.provider.allowBaseUrlEdit ? initial.baseUrl : ""
  );
  const [showKey, setShowKey] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = getProviderDefinition(providerId);
  const currentMasked = getMaskedKey();

  const changeProvider = (id: ProviderId) => {
    const def = getProviderDefinition(id);
    const saved = getProviderConfig(id);
    setSelectedProvider(id);
    setKey(saved?.key || "");
    setError(null);
    setModel(saved?.model && saved.model !== def.defaultModel ? saved.model : "");
    setBaseUrl(def.allowBaseUrlEdit ? saved?.baseUrl || def.baseUrl : "");
  };

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    const result = await validateProviderKey(trimmed, providerId, baseUrl);
    if (result.ok) {
      setProviderId(providerId);
      saveProviderConfig(providerId, trimmed, model, baseUrl);
      onDone();
    } else {
      setError(result.errorThai || "ตรวจสอบ key ไม่ผ่าน");
    }
    setChecking(false);
  };

  return (
    <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {currentMasked
              ? "ตั้งค่า API Key ของคุณ"
              : "ขั้นตอนที่ 1 — ใส่ API Key ของคุณ"}
          </h2>
          <p className="text-sm text-slate-500">
            รองรับ Gemini, OpenRouter, Groq, DeepSeek, Mistral, Hugging Face
            หรือ endpoint แบบ OpenAI-compatible — ใช้ key ของตัวเอง เก็บหลายค่ายไว้ในเครื่อง
            สลับค่ายสำรองอัตโนมัติเมื่อโควตาเต็ม
          </p>
        </div>
      </div>

      {currentMasked && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Key ปัจจุบัน: <span className="font-mono">{currentMasked}</span> (
          {getProviderDefinition().label}) — หากต้องการเปลี่ยน ให้เลือกค่ายใหม่ด้านล่างแล้วใส่ key อันใหม่
        </p>
      )}

      <div className="space-y-3 rounded-xl bg-slate-50 p-4">
        <label className="block text-sm font-semibold text-slate-700">
          ผู้ให้บริการ AI
          <select
            value={providerId}
            onChange={(e) => changeProvider(e.target.value as ProviderId)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-900">
          <p>{provider.helpThai}</p>
          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
            >
              เปิดหน้าสร้าง API key ของ {provider.label}{" "}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {HIDDEN_PROVIDER_LABELS.length > 0 && (
          <p className="text-[11px] leading-relaxed text-slate-500">
            หมายเหตุ: ค่าย{" "}
            <span className="font-semibold text-slate-600">
              {HIDDEN_PROVIDER_LABELS.join(", ")}
            </span>{" "}
            ถูกซ่อนออกชั่วคราว เพราะ API ของค่ายนั้นไม่เปิดให้ browser เรียกโดยตรง
            (CORS) — จะเปิดใช้อีกครั้งเมื่อมี backend ของตัวเอง
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          API key
        </label>
        <div className="flex items-center gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={provider.keyHint}
            autoFocus
            spellCheck={false}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50"
            aria-label={showKey ? "ซ่อน key" : "แสดง key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          ชื่อโมเดล <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={provider.defaultModel || "เช่น gpt-4o-mini"}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {provider.defaultModel && (
          <p className="text-[11px] text-slate-400">
            ค่าเริ่มต้น: {provider.defaultModel} — ใส่เฉพาะชื่อโมเดล เช่น gpt-5-mini
            หรือ gemini-4-hydrogen <b className="text-amber-600">ไม่ใช่ชื่อค่าย</b> (เช่น ChatGPT) ไม่เช่นนั้นจะขึ้น HTTP 404
          </p>
        )}
      </div>

      {provider.allowBaseUrlEdit && (
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Base URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="text-[11px] text-slate-400">
            ต้องเป็น endpoint แบบ OpenAI-compatible (มี /chat/completions)
          </p>
        </div>
      )}

      {provider.ttsNoteThai && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          เสียงพากย์จะใช้ ElevenLabs หรือ Gemini key ที่คุณเก็บไว้ในเครื่อง (สลับสำรองอัตโนมัติ)
          {provider.id !== "openai" && provider.id !== "groq" && provider.id !== "custom"
            ? " ส่วนการถอดเสียงจากไมโครโฟนใช้ Gemini / OpenAI / Groq"
            : ""}
          {" หากไม่มี key สำหรับเสียง จะใช้เสียงของเบราว์เซอร์แทน"}
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!key.trim() || checking || (provider.allowBaseUrlEdit && !baseUrl.trim())}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {checking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบ key...
          </>
        ) : (
          "ตรวจสอบและบันทึก key"
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Key ของคุณถูกเก็บในเบราว์เซอร์ของคุณเอง (localStorage) เท่านั้น —
        แอปไม่มีเซิร์ฟเวอร์รับ key
      </p>
    </div>
  );
}

/* ================= ขั้นที่ 2: หน้าทดลองใช้ 3 เดือน (Free Trial) ================= */

function TrialStep({ onDone }: { onDone: () => void }) {
  const deviceId = getDeviceId();

  return (
    <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 2 — เริ่มทดลองใช้ฟรี 3 เดือน</h2>
          <p className="text-sm text-slate-500">
            ใช้ API Key ของคุณทันที — ไม่ต้องจ่ายเงิน 3 เดือนแรกฟรี (เพียงแค่มี key ที่ผ่านการตรวจสอบแล้ว)
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <ol className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <li>
            <span className="font-bold text-blue-600">1.</span>{" "}
            <span>กรอก API Key ของผู้ให้บริการที่คุณเลือก แล้วผ่านขั้นตอนที่ 1 ไปแล้ว</span>
          </li>
          <li>
            <span className="font-bold text-blue-600">2.</span>{" "}
            <span>ระบบจะตรวจสอบ key อัตโนมัติ และเริ่มนับวันทดลองใช้ 90 วัน</span>
          </li>
          <li>
            <span className="font-bold text-blue-600">3.</span>{" "}
            <span>เมื่อตรวจสอบผ่าน จะสามารถใช้งานแอปได้ทันที 3 เดือน (90 วัน)</span>
          </li>
        </ol>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          <strong>เงื่อนไข:</strong> 3 เดือนแรกใช้ฟรี แล้วจะต้องต่ออายุโดยการจ่าย 100 บาท/เดือน (หรือหยุดใช้ได้)
        </p>
        <p className="text-sm text-slate-600">
          <strong>เกี่ยวกับ Device ID:</strong> รหัสเครื่องจะถูกบันทึกไว้ในเครื่องนี้เท่านั้น หากลองใช้บนเครื่องอื่น จะต้องขอรหัสใหม่
        </p>
      </div>

      <button
        type="button"
        onClick={onDone}
        disabled={!deviceId}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deviceId ? "เริ่มใช้งานฟรี 3 เดือน" : "กำลังสร้างรหัสเครื่อง..."}
      </button>

      <p className="text-center text-xs text-slate-400">
        รหัสเครื่องของคุณ: {deviceId || "กำลังสร้าง..."}
      </p>
    </div>
  );
}

/* ================= หน้าข้อมูล trial คงค้าง ================= */

function TrialInfoStep({ onReset }: { onReset: () => void }) {
  const { expired, daysLeft } = getTrialExpiry();

  return (
    <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">สถานะการทดลองใช้</h2>
        </div>
      </div>

      <div className="space-y-2">
        {expired ? (
          <p className="text-sm text-slate-600">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> <strong>ทดลองใช้ 3 เดือนสิ้นสุดแล้ว</strong> คุณสามารถหยุดใช้ได้ หรือติดต่อแอดมินเพื่อขอเริ่มทดลองใช้ใหม่
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            <BadgeCheck className="h-4 w-4 text-emerald-500" /> เหลือเวลาอีก <b className="text-slate-900">{daysLeft} วัน</b> จาก 3 เดือน
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          <strong>ช่วยพัฒนาแอป:</strong> บอกเราได้เลยว่าชอบอะไร เจอปัญหาตรงไหน
          หรืออยากให้เพิ่มฟีเจอร์อะไร — ข้อความจะถูกบันทึกไว้ในเครื่องนี้
          และคุณเลือกส่งต่อให้ทีมพัฒนาได้
        </p>
        <FeedbackForm />
        <button
          type="button"
          onClick={() => {
            resetTrial();
            onReset();
          }}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          เริ่มทดลองใช้ใหม่
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        ความคิดเห็นถูกเก็บไว้ในเครื่องของคุณเท่านั้น ไม่มีการส่งข้อมูลอัตโนมัติออกไป
      </p>
    </div>
  );
}

/* ================= Gate หลัก ================= */

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<GateStep>("checking");
  const [access, setAccess] = useState<{ valid: boolean; daysLeft: number } | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [changingKey, setChangingKey] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!hasApiKey()) {
      setStep("need-key");
      return;
    }
    if (isInTrial()) {
      const { daysLeft } = getTrialExpiry();
      setAccess({ valid: true, daysLeft });
      setStep("ready");
      return;
    }
    if (hasTrialStarted()) {
      setAccess({ valid: false, daysLeft: 0 });
      setStep("trial-info");
      return;
    }
    setAccess(null);
    setStep("need-access");
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (step === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (step === "need-key") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-blue-50 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Native<span className="text-blue-600">Bridge</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เรียนภาษาอังกฤษแบบเจ้าของภาษา — ฟัง พูด อ่าน เขียน ครบทั้ง 4 ทักษะ
          </p>
        </header>
        <ApiKeyStep
          onDone={() => {
            setNotice(null);
            setStep(changingKey ? "ready" : "need-access");
            setChangingKey(false);
          }}
        />
      </div>
    );
  }

  if (step === "need-access") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Native<span className="text-blue-600">Bridge</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เรียนภาษาอังกฤษแบบเจ้าของภาษา — ฟัง พูด อ่าน เขียน ครบทั้ง 4 ทักษะ
          </p>
        </header>
        <TrialStep
          onDone={() => {
            setTrialStart();
            const { daysLeft } = getTrialExpiry();
            setAccess({ valid: true, daysLeft });
            setStep("ready");
          }}
        />
      </div>
    );
  }

  if (step === "trial-info") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Native<span className="text-blue-600">Bridge</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เรียนภาษาอังกฤษแบบเจ้าของภาษา — ฟัง พูด อ่าน เขียน ครบทั้ง 4 ทักษะ
          </p>
        </header>
        <TrialInfoStep
          onReset={() => {
            setAccess(null);
            setStep("need-access");
          }}
        />
      </div>
    );
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => setManageOpen(true)}
        className="fixed right-3 top-3 z-40 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:bg-white"
        title="สมาชิกและการตั้งค่า"
      >
        <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
        {access && access.daysLeft > 0 ? (
          <span>ทดลองใช้เหลือ {access.daysLeft} วัน</span>
        ) : (
          <span>สมาชิก</span>
        )}
      </button>
      {manageOpen && access && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setManageOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <CalendarClock className="h-5 w-5 text-blue-600" /> สมาชิกของคุณ
              </h3>
              <button
                onClick={() => setManageOpen(false)}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                ปิด
              </button>
            </div>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-600">
                เหลือเวลา: <b className="text-slate-900">{access.daysLeft} วัน</b>
              </p>
              <p className="text-slate-600">
                ผู้ให้บริการ AI:{" "}
                <b className="text-slate-900">{getProviderDefinition().label}</b>
              </p>
              <p className="font-mono text-xs text-slate-400">รหัสเครื่อง: {getDeviceId()}</p>
            </div>
            <button
              onClick={() => {
                setManageOpen(false);
                setChangingKey(true);
                setStep("need-key");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <KeyRound className="h-4 w-4" /> เปลี่ยน API key / ผู้ให้บริการ
            </button>
            <FeedbackForm />
            <button
              onClick={() => {
                resetTrial();
                setManageOpen(false);
                setAccess(null);
                setStep("need-access");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              เริ่มทดลองใช้ใหม่
            </button>
          </div>
        </div>
      )}
    </>
  );
}