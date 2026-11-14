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

/** ตั้งค่าเริ่มต้นทrial (เรียกเมื่อผู้ใช้จบขั้นตอนที่ 1) */
export function setTrialStart(): void {
  try {
    localStorage.setItem(TRIAL_START_KEY, Date.now().toString());
  } catch {
    /* ignore */
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

/** ส่งเก็บข้อความfeedback จากผู้ใช้ */
export function submitFeedback(feedback: string): boolean {
  try {
    const existingStr = localStorage.getItem(FEEDBACK_KEY) || "";
    const existing = existingStr ? JSON.parse(existingStr) : [];
    // เก็บแค่ 5 ข้อความล่าสุด เพื่อไม่ให้ localStorage โตเกิน
    const updated = [...existing, feedback].slice(-5).join("|||");
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

/** ดึงข้อมูลfeedback ที่เก็บไว้ (สำหรับแอดมินใช้ตรวจสอบ) */
export function getFeedback(): Array<{ timestamp: string; feedback: string }> {
  try {
    const data = localStorage.getItem(FEEDBACK_KEY);
    if (!data) return [];
    const entries = JSON.parse(data);
    return entries.map((e: string) => {
      const [fb, ts] = e.split("|||");
      return { feedback: fb || "", timestamp: ts || "" };
    });
  } catch {
    return [];
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