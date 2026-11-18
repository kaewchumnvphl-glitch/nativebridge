/**
 * ระบบทดลองใช้ 3 เดือน (Free Trial) แทนระบบรหัสเปิดใช้งาน
 * - มีแค่ API Key ที่ผ่านการตรวจสอบแล้ว ใช้ได้ 90 วัน
 * - เก็บ "รหัสเครื่อง" ไว้เพื่อบล็อกการใช้ซ้ำบนเครื่องอื่น (ไม่มีการลงลายเซ็นหนัก)
 * - มีช่องส่งfeedback เพื่อนำไปปรับปรุง
 */

const TRIAL_DAYS = 90; // 3 เดือน
const DEVICE_ID_KEY = "nativebridge_device_id_v1";
const TRIAL_START_KEY = "nativebridge_trial_start_ms";
const FEEDBACK_KEY = "nativebridge_feedback_v1";

/** กำหนดค่าเริ่มต้น Device ID */
export function getDeviceId(): string {
  let id = "";
  try {
    id = localStorage.getItem(DEVICE_ID_KEY) || "";
  } catch {
    id = "";
  }
  if (!id) {
    const uuid = crypto.randomUUID().replace(/-/g, "");
    id = uuid.slice(0, 16).toUpperCase();
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

/** ตั้งค่าเริ่มต้น trial (เรียกเมื่อผู้ใช้จบขั้นตอนที่ 1) */
export function setTrialStart(): void {
  try {
    localStorage.setItem(TRIAL_START_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

/** ตรวจว่าเคยเริ่ม trial แล้วหรือยัง (ใช้แยกจากกรณี trial หมดอายุ) */
export function hasTrialStarted(): boolean {
  try {
    return Boolean(localStorage.getItem(TRIAL_START_KEY));
  } catch {
    return false;
  }
}

/** ตรวจสอบว่าอยู่ในช่วงทrial หรือยัง */
export function isInTrial(): boolean {
  try {
    const startStr = localStorage.getItem(TRIAL_START_KEY);
    if (!startStr) return false;
    const start = parseInt(startStr, 10);
    if (!Number.isFinite(start)) return false;
    const elapsed = Date.now() - start;
    return elapsed < TRIAL_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

/** คำนวณวันที่หมดอายุของทrial ที่เหลือ */
export function getTrialExpiry(): { expired: boolean; daysLeft: number } {
  try {
    const startStr = localStorage.getItem(TRIAL_START_KEY);
    if (!startStr) return { expired: true, daysLeft: 0 };
    const start = parseInt(startStr, 10);
    if (!Number.isFinite(start)) return { expired: true, daysLeft: 0 };
    const elapsed = Date.now() - start;
    const remaining = TRIAL_DAYS * 86_400_000 - elapsed;
    const daysLeft = Math.max(0, Math.ceil(remaining / 86_400_000));
    return { expired: remaining <= 0, daysLeft };
  } catch {
    return { expired: true, daysLeft: 0 };
  }
}

/** รายการความคิดเห็นหนึ่งรายการ */
export interface FeedbackEntry {
  id: string;
  timestamp: string;
  message: string;
  contact?: string;
  deviceId: string;
  trialDaysLeft: number | null;
}

const MAX_FEEDBACK_ENTRIES = 20;

/** แปลงข้อมูลรุ่นเก่า (string ที่คั่นด้วย |||) ให้เป็นรายการมาตรฐาน */
function normalizeFeedback(value: unknown): FeedbackEntry[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }

  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "string"
      ? parsed.split("|||")
      : [];

  return list.flatMap((item, index) => {
    if (typeof item === "string") {
      const message = item.trim();
      if (!message) return [];
      return [
        {
          id: `legacy-${index}`,
          timestamp: "",
          message,
          deviceId: "",
          trialDaysLeft: null,
        },
      ];
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const message =
        typeof obj.message === "string"
          ? obj.message
          : typeof obj.feedback === "string"
            ? obj.feedback
            : "";
      if (!message.trim()) return [];
      return [
        {
          id: typeof obj.id === "string" ? obj.id : `legacy-${index}`,
          timestamp: typeof obj.timestamp === "string" ? obj.timestamp : "",
          message: message.trim(),
          contact: typeof obj.contact === "string" ? obj.contact : undefined,
          deviceId: typeof obj.deviceId === "string" ? obj.deviceId : "",
          trialDaysLeft:
            typeof obj.trialDaysLeft === "number" ? obj.trialDaysLeft : null,
        },
      ];
    }
    return [];
  });
}

/** ดึงความคิดเห็นที่บันทึกไว้ในเครื่องนี้ */
export function getFeedback(): FeedbackEntry[] {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY);
    if (!data) return [];
    return normalizeFeedback(data);
  } catch {
    return [];
  }
}

/** บันทึกความคิดเห็นจากผู้ใช้ (เก็บใน localStorage ของเครื่องนี้) */
export function submitFeedback(
  message: string,
  contact?: string
): { ok: boolean; entry?: FeedbackEntry; error?: string } {
  const text = message.trim();
  if (!text) {
    return { ok: false, error: "กรุณาพิมพ์ข้อความก่อนส่ง" };
  }
  if (text.length > 2000) {
    return { ok: false, error: "ข้อความยาวเกิน 2,000 ตัวอักษร" };
  }

  try {
    const entry: FeedbackEntry = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `fb-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      message: text,
      contact: contact?.trim() || undefined,
      deviceId: getDeviceId(),
      trialDaysLeft: hasTrialStarted() ? getTrialExpiry().daysLeft : null,
    };
    const updated = [...getFeedback(), entry].slice(-MAX_FEEDBACK_ENTRIES);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    return { ok: true, entry };
  } catch {
    return {
      ok: false,
      error:
        "บันทึกไม่สำเร็จ — พื้นที่เก็บข้อมูลของเบราว์เซอร์อาจเต็มหรือถูกปิด",
    };
  }
}

/** ตั้งค่า reset trial (เรียกเมื่อต้องการให้เริ่มทrial ใหม่) */
export function resetTrial(): void {
  try {
    localStorage.removeItem(TRIAL_START_KEY);
    localStorage.removeItem("nativebridge_access_code_v1");
  } catch {
    /* ignore */
  }
}

/** ตรวจสอบสถานะการใช้งานแบบรวม (Key + Trial) */
export function checkUsageStatus(): {
  hasKey: boolean;
  inTrial: boolean;
  daysLeft: number;
  expired: boolean;
} {
  const hasKey = !!localStorage.getItem("nativebridge_api_key_v1");
  const inTrial = isInTrial();
  const { expired, daysLeft } = getTrialExpiry();
  return { hasKey, inTrial, daysLeft, expired };
}