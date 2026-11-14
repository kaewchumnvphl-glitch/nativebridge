import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  setApiKey,
  validateApiKey,
  isInTrial,
  getTrialExpiry,
  submitFeedback,
  getFeedback,
  resetTrial,
} from "../lib/access";

/** ข้อมูล PromptPay (สำหรับหน้าจ่ายเงินแบบเก่า/อนาคต) - เก็บไว้ใช้พิมพ์แสดงผลได้ */
export const PAYMENT = {
  promptpayId: "0889231826",
  amountThb: 100,
  lineId: "champion2026",
  daysPerPayment: 30,
};

/** สเต็ปของเกต */
type GateStep = "checking" | "need-key" | "ready" | "trial-info";

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

/* ================= ขั้นที่ 1: ใส่ API key (เหมือนเดิม) ================= */

function ApiKeyStep({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    const result = await validateApiKey(trimmed);
    if (result.ok) {
      setApiKey(trimmed);
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
          <h2 className="text-lg font-bold text-slate-900">ขั้นตอนที่ 1 — ใส่ Gemini API Key ของคุณ</h2>
          <p className="text-sm text-slate-500">ใช้ key ของตัวเอง คุมโควตาเอง แอปไม่มีการส่ง key ไปเก็บที่เซิร์ฟเวอร์ใด ๆ</p>
        </div>
      </div>

      <ol className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">1.</span>
          <span>
            เปิด{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700"
            >
              aistudio.google.com/apikey <ExternalLink className="h-3.5 w-3.5" />
            </a>{" "}
            แล้วล็อกอินด้วยบัญชี Google
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">2.</span>
          <span>กด “Create API key” แล้วคัดลอก key (เริ่มด้วย AIza…)</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-blue-600">3.</span>
          <span>วาง key ในช่องด้านล่าง — เก็บไว้ในเครื่องคุณเท่านั้น</span>
        </li>
      </ol>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="AIza..."
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
        {error && (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!key.trim() || checking}
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
        Key ของคุณถูกเก็บในเบราว์เซอร์ของคุณเอง (localStorage) เท่านั้น
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
            <span className="font-bold text-blue-600">1.</span>
            <span>กรอก Gemini API Key ของคุณแล้วผ่านขั้นตอนที่ 1 ไปแล้ว</span>
          </i>
          </span>
          </li>
          <li>
            <span className="font-bold text-blue-600">2.</span>
            <span>ระบบจะตรวจสอบ key อัตโนมัติ และเริ่มนับวันทrial 90 วัน</span>
          </li>
          <li>
            <span className="font-bold text-blue-600">3.</span>
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

/* ================= หน้าข้อมูลทrial คงค้าง ================= */

function TrialInfoStep({ hasDoneReset }: { hasDoneReset: () => void }) {
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
            <AlertTriangle className="h-4 w-4 text-amber-500" /> <strong>ทrial 3 เดือนสิ้นสุดแล้ว</strong> คุณสามารถหยุดใช้ได้ หรือติดต่อแอดมินเพื่อขอเริ่มทrial ใหม่
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            <BadgeCheck className="h-4 w-4 text-emerald-500" /> เหลือเวลาอีก <b className="text-slate-900">{daysLeft} วัน</b> จาก 3 เดือน
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          <strong>เพื่อเป็นการช่วยพัฒนาแอป:</strong> หากคุณใช้แอปมารวมแล้ว โปรดใช้เวลาคลิกปุ่ม "ส่งความคิดเห็นสั้น" เพื่อบอกเราว่าใช้แล้วเป็นอย่างไรบ้าง (ฟีเจอร์ไหนชอบ ไม่ชอบ ข้อผิดพลาดเจอครับ)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => submitFeedback("ผู้ใช้ทดลองใช้แอป NativeBridge"))
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            ส่งความคิดเห็นสั้น
          </button>
          <button
            onClick={() => resetTrial()}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            เริ่มทrial ใหม่
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        ข้อมูลfeedback จะถูกเก็บไว้ในเครื่องของคุณและส่งให้ทีมพัฒนาเท่านั้น ไม่มีการส่งข้อมูลส่วนตัวออกไป
      </p>
    </div>
  );
}

/* ================= Gate หลัก ================= */

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<GateStep>("checking");
  const [access, setAccess] = useState<{ valid: boolean; daysLeft: number } | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!hasApiKey()) {
      setStep("need-key");
      return;
    }
    // มี key แล้ว → ตรวจสอบว่าอยู่ในช่วงทrial หรือยัง
    const inTrial = isInTrial();
    const { expired, daysLeft } = getTrialExpiry();

    if (inTrial && !expired) {
      // อยู่ในทrial 90 วัน ยังไม่หมด → เข้าสู่สเต็ป ready
      setStep("ready");
      setAccess({ valid: true, daysLeft });
    } else if (!inTrial) {
      // ไม่มีการตั้งค่าทrial (อาจเป็นการรีเซ็ตหรือยังไม่เคยเข้าใช้) → ให้ตั้งค่าทrial ใหม่
      setTrialStart();
      setStep("trial-info");
    } else {
      // ทrial หมดสิ้น → แสดงหน้าทrial-info บอกว่าหมดแล้ว
      setStep("trial-info");
    }
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
            setStep("need-access");
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
        <TrialInfoStep hasDoneReset={() => setStep("need-access")} />
      </div>
    );
  }

  if (step === "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Native<span className="text-blue-600">Bridge</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {access?.daysLeft > 0 ? `เหลือเวลาอีก ${access.daysLeft} วัน` : "ใช้งานได้เต็มรูปแบบ"} — ฟัง พูด อ่าน เขียน ครบทั้ง 4 ทักษะ
          </p>
        </header>
        {/* แอปหลักจะ render ผ่าน children ที่ส่งเข้าไป */}
        <div className="w-full max-w-3xl space-y-6">
          {children}
        </div>
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
        {access?.daysLeft > 0 ? (
          <p className="text-sm text-slate-600">ทrial {access.daysLeft} วันที่เหลือ</p>
        ) : (
          "สมาชิก"
        )}
      </button>
      {manageOpen && access && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <CalendarClock className="h-5 w-5 text-blue-600" /> สมาชิกของคุณ
              </h3>
              <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
                ปิด
              </button>
            </div>
            <div className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm">
              <p className="text-slate-600">
                เหลือเวลา: <b className="text-slate-900">{access?.daysLeft || 0} วัน</b>
              </p>
              <p className="font-mono text-xs text-slate-400">รหัสเครื่อง: {getDeviceId()}</p>
            </div>
            <div className="grid gap-2">
              <button
                onClick={() => submitFeedback("ผู้ใช้ทดลองใช้แอป NativeBridge"))
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                ส่งความคิดเห็นสั้น
              </button>
              <button
                onClick={() => resetTrial()}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                เริ่มทrial ใหม่
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    </>
  );
}