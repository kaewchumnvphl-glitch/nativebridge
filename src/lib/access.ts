/**
 * ระบบสมาชิกแบบรหัสเปิดใช้งาน 30 วัน (ไม่ต้องล็อกอิน)
 * รหัส = ลายเซ็นดิจิทัล (ECDSA P-256) ที่แอดมินออกให้จากเครื่องมือส่วนตัว
 * ผูกกับ "รหัสเครื่อง" ของผู้ใช้ แชร์รหัสไปเครื่องอื่นไม่ได้ และปลอมรหัสไม่ได้
 * เพราะการตรวจใช้กุญแจสาธารณะ (public key) ที่ฝังในแอป — ไม่มีกุญแจลับอยู่ในโค้ด
 */

const DEVICE_ID_KEY = "nativebridge_device_id_v1";
const ACCESS_CODE_KEY = "nativebridge_access_code_v1";

/** กุญแจสาธารณะ (SPKI DER, base64) — ใช้ตรวจลายเซ็นรหัสเปิดใช้งาน */
const PUBLIC_KEY_SPKI_B64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyxsd/cF9udBqLwXNzHrCCwr8I+kXN5qoZxk7rZ7C+2G6CeLyGhnmy9sfVtTybPwky43EKSl4BCf/BhGyIGfVVw==";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/** จัดรูปรหัสให้อ่านง่าย: NB-XXXXX-XXXXX-... */
export function formatCode(bytes: Uint8Array): string {
  const b32 = base32Encode(bytes);
  const groups = b32.match(/.{1,5}/g) || [];
  return "NB-" + groups.join("-");
}

export function parseCode(text: string): Uint8Array {
  // ตัดคำนำหน้า NB- ออกก่อน decode ไม่งั้น N,B จะถูกนับเป็นข้อมูล
  const stripped = text.trim().toUpperCase();
  const withoutPrefix = stripped.startsWith("NB-")
    ? stripped.slice(3)
    : stripped.startsWith("NB")
      ? stripped.slice(2)
      : stripped;
  return base32Decode(withoutPrefix);
}

/** รหัสเครื่อง: 16 ตัวอักษร hex (ผูกกับเครื่องนี้เท่านั้น) */
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

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

let cachedPublicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey;
  const raw = Uint8Array.from(atob(PUBLIC_KEY_SPKI_B64), (c) =>
    c.charCodeAt(0)
  );
  cachedPublicKey = await crypto.subtle.importKey(
    "spki",
    raw as BufferSource,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  return cachedPublicKey;
}

export interface AccessInfo {
  valid: boolean;
  expiresAt: number | null; // epoch ms
  reason?: string;
}

function decodeToken(code: Uint8Array): {
  ok: true;
  payload: Uint8Array;
  signature: Uint8Array;
  deviceIdHex: string;
  expiresAtMs: number;
} | {
  ok: false;
  reason: string;
} {
  const PAYLOAD_LEN = 14; // magic(1) + version(1) + deviceId(8) + exp(4)
  const SIG_LEN = 64; // ECDSA P-256 raw r||s
  if (code.length < PAYLOAD_LEN + SIG_LEN) {
    return { ok: false, reason: "รูปแบบรหัสไม่ถูกต้อง" };
  }
  const payload = code.slice(0, PAYLOAD_LEN);
  const signature = code.slice(PAYLOAD_LEN);
  if (payload[0] !== 0x4e /* "N" */ || payload[1] !== 1) {
    return { ok: false, reason: "รหัสไม่รองรับเวอร์ชันนี้" };
  }
  const deviceIdHex = Array.from(payload.slice(2, 10))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const exp =
    (payload[10] << 24) | (payload[11] << 16) | (payload[12] << 8) | payload[13];
  const expiresAtMs = exp * 1000;
  if (!Number.isFinite(expiresAtMs)) {
    return { ok: false, reason: "วันหมดอายุในรหัสไม่ถูกต้อง" };
  }
  return { ok: true, payload, signature, deviceIdHex, expiresAtMs };
}

export async function verifyCode(
  codeText: string
): Promise<AccessInfo & { deviceIdHex?: string }> {
  try {
    const decoded = decodeToken(parseCode(codeText));
    if (!decoded.ok) return { valid: false, expiresAt: null, reason: decoded.reason };

    const publicKey = await getPublicKey();
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      decoded.signature as BufferSource,
      decoded.payload as BufferSource
    );
    if (!ok) {
      return {
        valid: false,
        expiresAt: null,
        reason: "รหัสไม่ถูกต้อง (ลายเซ็นไม่ตรง) — ตรวจสอบการคัดลอกอีกครั้ง",
      };
    }

    const myDevice = getDeviceId();
    if (decoded.deviceIdHex !== myDevice) {
      return {
        valid: false,
        expiresAt: null,
        reason: "รหัสนี้ออกให้กับเครื่องอื่น (ผูกกับรหัสเครื่องของผู้ใช้แต่ละคน)",
      };
    }

    const now = Date.now();
    if (decoded.expiresAtMs <= now) {
      return {
        valid: false,
        expiresAt: decoded.expiresAtMs,
        reason: "รหัสหมดอายุแล้ว — ต่ออายุสมาชิกเพื่อใช้งานต่อ",
      };
    }

    return { valid: true, expiresAt: decoded.expiresAtMs };
  } catch {
    return {
      valid: false,
      expiresAt: null,
      reason: "รูปแบบรหัสไม่ถูกต้อง — ขอรหัสใหม่จากผู้ดูแล",
    };
  }
}

/** ตรวจและบันทึกรหัสใหม่ */
export async function activateCode(codeText: string): Promise<AccessInfo> {
  const info = await verifyCode(codeText);
  if (info.valid && info.expiresAt) {
    const normalized = formatCode(parseCode(codeText));
    try {
      localStorage.setItem(ACCESS_CODE_KEY, normalized);
    } catch {
      /* ignore */
    }
  }
  return info;
}

export async function getAccess(): Promise<AccessInfo> {
  let stored = "";
  try {
    stored = localStorage.getItem(ACCESS_CODE_KEY) || "";
  } catch {
    stored = "";
  }
  if (!stored) {
    return { valid: false, expiresAt: null, reason: "ยังไม่ได้เปิดใช้งานสมาชิก" };
  }
  return verifyCode(stored);
}

export function clearAccess() {
  try {
    localStorage.removeItem(ACCESS_CODE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatDateThai(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
