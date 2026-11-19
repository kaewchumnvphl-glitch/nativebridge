import { apiTts } from "../lib/gemini";

let currentAudio: HTMLAudioElement | null = null;
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();

export function stopActiveAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playBase64Wav(
  base64: string,
  playbackRate = 1.0,
  mimeType = "audio/wav"
): Promise<void> {
  stopActiveAudio();
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    audio.playbackRate = playbackRate;
    currentAudio = audio;
    audio.onended = () => {
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch((err) => {
      if (currentAudio === audio) currentAudio = null;
      reject(err);
    });
  });
}

export async function speakNativeText(params: {
  text?: string;
  voiceName?: string;
  style?: string;
  playbackRate?: number;
  multiSpeaker?: Array<{
    speaker: string;
    text: string;
    style?: string;
    voiceName: string;
  }>;
}): Promise<{ usedFallback: boolean }> {
  const cacheKey = JSON.stringify({
    text: params.text,
    voiceName: params.voiceName,
    multiSpeaker: params.multiSpeaker,
  });

  const cached = ttsCache.get(cacheKey);
  if (cached) {
    await playBase64Wav(
      cached.audioBase64,
      params.playbackRate ?? 1.0,
      cached.mimeType
    );
    return { usedFallback: false };
  }

  try {
    const data = await apiTts({
      text: params.text,
      voiceName: params.voiceName,
      style: params.style,
      multiSpeaker: params.multiSpeaker,
    });

    if (!data.audioBase64) {
      throw new Error("Empty audio payload");
    }

    ttsCache.set(cacheKey, {
      audioBase64: data.audioBase64,
      mimeType: data.mimeType || "audio/wav",
    });
    await playBase64Wav(
      data.audioBase64,
      params.playbackRate ?? 1.0,
      data.mimeType || "audio/wav"
    );
    return { usedFallback: false };
  } catch {
    // Graceful browser SpeechSynthesis fallback if network/API quota fails
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      stopActiveAudio();
      const spoken = params.multiSpeaker
        ? params.multiSpeaker.map((m) => m.text).join(" ")
        : params.text || "";
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(spoken);
        utterance.lang = "en-US";
        utterance.rate = params.playbackRate ?? 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
      return { usedFallback: true };
    }
    throw new Error("Unable to play audio right now.");
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
