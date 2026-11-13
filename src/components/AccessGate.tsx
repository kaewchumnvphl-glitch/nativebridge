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
import { generatePayload } from "promptpay-qr";
import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  setApiKey,
  validateApiKey,
} from "../lib/gemini";
import {
  activateCode,
  clearAccess,
  formatDateThai,
  getAccess,
  getDeviceId,
  type AccessInfo,
} from "../lib/access";

/** ข้อมูลรับเงิน — แก้ไขได้ที่นี่จุดเดียว */
export const PAYMENT = {
  promptpayId: "0889231826",
  amountThb: 100,
  lineId: "champion2026",
  daysPerPayment: 30,
};

type GateStep = "checking" | "need-key" | "need-access" | "ready";

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

/* ================= ขั้นที่ 1: ใส่ API key ================= */

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

/* ================= ขั้นที่ 2: สมาชิก 100 บาท/เดือน ================= */

function PaymentStep({ onDone, notice }: { onDone: () => void; notice?: string | null }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceId = getDeviceId();

  useEffect(() => {
    let cancelled = false;
    Promise.resolve(
      generatePayload(PAYMENT.promptpayId, { amount: PAYMENT.amountThb })
    )
      .then((payload: string) =>
        QRCode.toDataURL(payload, { width: 360, margin: 2, errorCorrectionLevel: "M" })
      )
      .then((url: string) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (!code.trim() || checking) return;
    setChecking(true);
    setError(null);
    const info = await activateCode(code);
    if (info.valid) {
      onDone();
    } else {
      setError(info.reason || "รหัสไม่ถูกต้อง");
    }
    setChecking(false);
  };

  return (
    <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <BadgeCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {notice ? notice : "ขั้นตอนที่ 2 — เปิดใช้งานสมาชิก"}
          </h2>
          <p className="text-sm text-slate-500">
            สมาชิกรายเดือน {PAYMENT.amountThb} บาท / {PAYMENT.daysPerPayment} วัน — ใช้ได้ทุกบทเรียน ทุกระดับ
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* ชำระเงิน */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <QrCode className="h-4 w-4 text-emerald-600" /> 1. สแกนจ่าย {PAYMENT.amountThb} บาท
          </h3>
          <div className="flex justify-center rounded-xl bg-white p-2">
            {qrUrl ? (
              <img src={qrUrl} alt="QR PromptPay 100 บาท" className="h-44 w-44" />
            ) : qrError ? (
              <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 text-center text-xs text-slate-500">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                โหลด QR ไม่สำเร็จ — โอนมือได้เลย
              </div>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            )}
          </div>
          <div className="space-y-1 text-center text-sm">
            <p className="text-slate-600">
              พร้อมเพย์{" "}
              <span className="font-mono font-bold text-slate-900">{PAYMENT.promptpayId}</span>
            </p>
            <p className="text-slate-600">
              ยอด <span className="font-bold text-slate-900">{PAYMENT.amountThb} บาท</span> (โอนมือได้ทุกธนาคาร)
            </p>
          </div>
        </div>

        {/* ส่งสลิป + รหัสเครื่อง */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> 2. รับรหัสเปิดใช้งาน
          </h3>
          <ol className="space-y-1.5 text-sm text-slate-600">
            <li>
              เพิ่มเพื่อน LINE{" "}
              <span className="font-mono font-bold text-slate-900">{PAYMENT.lineId}</span>{" "}
              <CopyButton text={PAYMENT.lineId} label="คัดลอก ID" />
            </li>
            <li>
              ส่ง <b>สลิปโอนเงิน</b> + <b>รหัสเครื่อง</b> ด้านล่างนี้ให้ผู้ดูแล
            </li>
            <li>
              รับรหัสกลับมาแล้ววางในช่องด้านล่าง — รหัสใช้ได้ {PAYMENT.daysPerPayment} วัน
            </li>
          </ol>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                <Smartphone className="h-3 w-3" /> รหัสเครื่องของคุณ
              </p>
              <p className="font-mono text-lg font-bold tracking-wider text-blue-800">{deviceId}</p>
            </div>
            <CopyButton text={deviceId} label="คัดลอก" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="วางรหัสเปิดใช้งาน เช่น NB-XXXXX-XXXXX-..."
            spellCheck={false}
            className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!code.trim() || checking}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจ...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> เปิดใช้งาน
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        รหัสผูกกับรหัสเครื่องนี้เท่านั้น — แชร์ไปเครื่องอื่นจะใช้ไม่ได้
      </p>
    </div>
  );
}

/* ================= หน้าจัดการสมาชิก ================= */

function ManageModal({
  access,
  onClose,
  onChangeKey,
  onRenew,
}: {
  access: AccessInfo;
  onClose: () => void;
  onChangeKey: () => void;
  onRenew: () => void;
}) {
  const deviceId = getDeviceId();
  const daysLeft = access.expiresAt
    ? Math.max(0, Math.ceil((access.expiresAt - Date.now()) / 86_400_000))
    : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
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
            หมดอายุ: <b className="text-slate-900">{access.expiresAt ? formatDateThai(access.expiresAt) : "-"}</b>
          </p>
          <p className="text-slate-600">
            เหลือเวลา: <b className="text-slate-900">{daysLeft} วัน</b>
          </p>
          <p className="font-mono text-xs text-slate-400">รหัสเครื่อง: {deviceId}</p>
        </div>
        <div className="grid gap-2">
          <button
            onClick={onRenew}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            ต่ออายุสมาชิก ({PAYMENT.amountThb} บาท/{PAYMENT.daysPerPayment} วัน)
          </button>
          <button
            onClick={onChangeKey}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            เปลี่ยน Gemini API key
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Gate หลัก ================= */

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<GateStep>("checking");
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!hasApiKey()) {
      setStep("need-key");
      return;
    }
    const info = await getAccess();
    if (info.valid) {
      setAccess(info);
      setStep("ready");
    } else {
      setAccess(info);
      setNotice(info.reason?.includes("หมดอายุ") ? "สมาชิกหมดอายุ — ต่ออายุเพื่อใช้งานต่อ" : null);
      setStep("need-access");
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

  if (step === "need-access") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-emerald-50 px-4 py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Native<span className="text-blue-600">Bridge</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {hasApiKey() ? "API key ของคุณพร้อมแล้ว ✓" : ""}
          </p>
        </header>
        <PaymentStep
          notice={notice}
          onDone={() => {
            setNotice(null);
            check();
          }}
        />
        <button
          type="button"
          onClick={() => {
            clearApiKey();
            setStep("need-key");
          }}
          className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
        >
          เปลี่ยน Gemini API key
        </button>
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
        {access?.expiresAt ? formatDateThai(access.expiresAt) : "สมาชิก"}
      </button>
      {manageOpen && access && (
        <ManageModal
          access={access}
          onClose={() => setManageOpen(false)}
          onChangeKey={() => {
            setManageOpen(false);
            clearAccess();
            clearApiKey();
            setStep("need-key");
          }}
          onRenew={() => {
            setManageOpen(false);
            setAccess(null);
            setNotice("ต่ออายุสมาชิก — จ่ายเงินแล้ววางรหัสใหม่");
            setStep("need-access");
          }}
        />
      )}
    </>
  );
}
