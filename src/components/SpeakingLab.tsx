import { useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  MessageSquare,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { Lesson, RoleplayTurn, ShadowingPhrase, TutorProfile } from "../types/lesson";
import { blobToBase64, speakNativeText, stopActiveAudio } from "../utils/audio";
import { apiRoleplay, apiTranscribe, apiTranscribeCoach } from "../lib/gemini";

interface SpeakingLabProps {
  lesson: Lesson;
  tutor: TutorProfile;
  isCompleted: boolean;
  onComplete: (score?: number) => void;
}

interface ShadowingFeedback {
  accuracyScore: number;
  heardText: string;
  feedbackThai: string;
  focusTipThai: string;
  passed: boolean;
}

export function SpeakingLab({
  lesson,
  tutor,
  isCompleted,
  onComplete,
}: SpeakingLabProps) {
  const [subMode, setSubMode] = useState<"shadowing" | "roleplay">("shadowing");

  // Shadowing state
  const [playingPhraseId, setPlayingPhraseId] = useState<string | null>(null);
  const [recordingPhraseId, setRecordingPhraseId] = useState<string | null>(null);
  const [analyzingPhraseId, setAnalyzingPhraseId] = useState<string | null>(null);
  const [feedbackByPhrase, setFeedbackByPhrase] = useState<
    Record<string, ShadowingFeedback>
  >({});
  const [micError, setMicError] = useState<string | null>(null);

  // Roleplay state
  const [turns, setTurns] = useState<RoleplayTurn[]>([
    {
      id: "opening",
      role: "tutor",
      text: lesson.speaking.openingLineEn,
      thai: lesson.speaking.openingLineThai,
    },
  ]);
  const [textInput, setTextInput] = useState("");
  const [showRoleplayThai, setShowRoleplayThai] = useState(true);
  const [isRecordingRoleplay, setIsRecordingRoleplay] = useState(false);
  const [isSendingRoleplay, setIsSendingRoleplay] = useState(false);
  const [roleplayError, setRoleplayError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset state if lesson switches
  useEffect(() => {
    setTurns([
      {
        id: "opening",
        role: "tutor",
        text: lesson.speaking.openingLineEn,
        thai: lesson.speaking.openingLineThai,
      },
    ]);
    setFeedbackByPhrase({});
    setMicError(null);
    setRoleplayError(null);
    setTextInput("");
    stopActiveAudio();
  }, [lesson.id, lesson.speaking.openingLineEn, lesson.speaking.openingLineThai]);

  useEffect(() => {
    return () => {
      stopActiveAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handlePlayShadowing = async (phrase: ShadowingPhrase) => {
    if (playingPhraseId === phrase.id) {
      stopActiveAudio();
      setPlayingPhraseId(null);
      return;
    }
    setMicError(null);
    setPlayingPhraseId(phrase.id);
    try {
      await speakNativeText({
        text: phrase.english,
        voiceName: tutor.voiceName,
        style: tutor.stylePrompt,
      });
    } catch (err) {
      setMicError(err instanceof Error ? err.message : "เล่นเสียงไม่สำเร็จ");
    } finally {
      setPlayingPhraseId(null);
    }
  };

  const startRecordingForPhrase = async (phrase: ShadowingPhrase) => {
    setMicError(null);
    stopActiveAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setMicError("ไม่ได้ยินเสียงพูด กรุณาลองกดอัดเสียงใหม่อีกครั้ง");
          setRecordingPhraseId(null);
          return;
        }
        setAnalyzingPhraseId(phrase.id);
        try {
          const audioBase64 = await blobToBase64(blob);
          const data = await apiTranscribeCoach({
            audioBase64,
            mimeType: mimeType.split(";")[0],
            targetPhrase: phrase.english,
            contextThai: phrase.thaiMeaning,
          });
          setFeedbackByPhrase((prev) => {
            const next = { ...prev, [phrase.id]: data as ShadowingFeedback };
            const passedCount = Object.values(next).filter((f) => f.passed).length;
            if (passedCount >= 2) {
              const avgScore = Math.round(
                Object.values(next).reduce((acc, f) => acc + f.accuracyScore, 0) /
                  Object.values(next).length
              );
              onComplete(avgScore);
            }
            return next;
          });
        } catch (err) {
          setMicError(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการวิเคราะห์เสียง"
          );
        } finally {
          setAnalyzingPhraseId(null);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingPhraseId(phrase.id);
    } catch {
      setMicError(
        "ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟนในเบราว์เซอร์ หรือสลับไปฝึกในโหมด 'สนทนาจำลอง' แบบพิมพ์โต้ตอบได้เช่นกัน"
      );
    }
  };

  const stopRecordingPhrase = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setRecordingPhraseId(null);
    }
  };

  const submitRoleplayMessage = async (messageText: string) => {
    const clean = messageText.trim();
    if (!clean || isSendingRoleplay) return;

    setRoleplayError(null);
    setTextInput("");

    const userTurnId = `user-${Date.now()}`;
    const updatedHistory = [
      ...turns.map((t) => ({ role: t.role, text: t.text })),
    ];

    setTurns((prev) => [
      ...prev,
      { id: userTurnId, role: "user", text: clean },
    ]);

    setIsSendingRoleplay(true);
    try {
      const data = await apiRoleplay({
        tutorName: tutor.name,
        tutorCity: tutor.city,
        tutorStyle: tutor.stylePrompt,
        scenarioTitle: lesson.speaking.roleplayTitle,
        scenarioPrompt: lesson.speaking.roleplayScenarioPrompt,
        history: updatedHistory,
        userMessage: clean,
      });

      const tutorTurn: RoleplayTurn = {
        id: `tutor-${Date.now()}`,
        role: "tutor",
        text: data.tutorReply,
        thai: data.tutorReplyThai,
        suggestedReplies: data.suggestedReplies,
      };

      setTurns((prev) => {
        const next = prev.map((t) =>
          t.id === userTurnId && data.nativeUpgrade
            ? { ...t, upgrade: data.nativeUpgrade }
            : t
        );
        const finalTurns = [...next, tutorTurn];
        const userTurnsCount = finalTurns.filter((t) => t.role === "user").length;
        if (userTurnsCount >= lesson.speaking.goalTurns) {
          onComplete(90);
        }
        return finalTurns;
      });

      // Speak the tutor's reply automatically like a real conversation
      speakNativeText({
        text: data.tutorReply,
        voiceName: tutor.voiceName,
        style: tutor.stylePrompt,
      }).catch(() => {});
    } catch (err) {
      setRoleplayError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างสนทนา"
      );
    } finally {
      setIsSendingRoleplay(false);
    }
  };

  const toggleRoleplayMic = async () => {
    if (isRecordingRoleplay) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
        setIsRecordingRoleplay(false);
      }
      return;
    }

    setRoleplayError(null);
    stopActiveAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopStream();
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setRoleplayError("ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้ง");
          return;
        }
        setIsSendingRoleplay(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const trData = await apiTranscribe({
            audioBase64,
            mimeType: mimeType.split(";")[0],
          });
          if (!trData.transcript) {
            throw new Error("ไม่สามารถถอดเสียงได้ ลองพูดให้ชัดขึ้นอีกนิด");
          }
          setIsSendingRoleplay(false);
          await submitRoleplayMessage(trData.transcript);
        } catch (err) {
          setIsSendingRoleplay(false);
          setRoleplayError(
            err instanceof Error ? err.message : "ไม่สามารถรับเสียงพูดได้"
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingRoleplay(true);
    } catch {
      setRoleplayError(
        "ไม่สามารถเปิดไมโครโฟนได้ กรุณาอนุญาตไมโครโฟน หรือพิมพ์คำตอบด้านล่างเพื่อสนทนาต่อได้เลย"
      );
    }
  };

  const userTurnsDone = turns.filter((t) => t.role === "user").length;
  const lastTutorTurn = [...turns].reverse().find((t) => t.role === "tutor");

  return (
    <div className="space-y-6">
      {/* Sub-mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubMode("shadowing")}
            className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === "shadowing"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            1. ฝึกออกเสียงตามเจ้าของภาษา (Shadowing)
          </button>
          <button
            type="button"
            onClick={() => setSubMode("roleplay")}
            className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === "roleplay"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            2. สนทนาโต้ตอบสดกับครู {tutor.name}
          </button>
        </div>

        {isCompleted && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <Check className="w-4 h-4" />
            <span>ผ่านการฝึกพูดแล้ว</span>
          </div>
        )}
      </div>

      {subMode === "shadowing" ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">
              ฝึกออกเสียง จังหวะ และเน้นคำ (Shadowing Lab)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              กดฟังต้นแบบจากครู {tutor.name} จากนั้นกด &ldquo;อัดเสียงพูดตาม&rdquo; แล้วพูดซ้ำทันที ระบบจะฟังเสียงจริงของคุณเทียบกับเจ้าของภาษาและแนะนำจุดปรับปรุงเป็นภาษาไทย (ผ่านอย่างน้อย 2 ประโยค หรือสนทนาในโหมด 2 ครบ {lesson.speaking.goalTurns} รอบ)
            </p>
            {micError && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                {micError}
              </p>
            )}
          </div>

          {lesson.speaking.shadowingPhrases.map((phrase, idx) => {
            const isPlaying = playingPhraseId === phrase.id;
            const isRecording = recordingPhraseId === phrase.id;
            const isAnalyzing = analyzingPhraseId === phrase.id;
            const feedback = feedbackByPhrase[phrase.id];

            return (
              <div
                key={phrase.id}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        ประโยคที่ {idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{phrase.ipa}</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {phrase.english}
                    </p>
                    <p className="text-xs font-mono text-blue-800 bg-blue-50 inline-block px-2.5 py-1 rounded">
                      จังหวะเน้นเสียง: {phrase.stressGuide}
                    </p>
                    <p className="text-sm text-slate-600">{phrase.thaiMeaning}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayShadowing(phrase)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-blue-700" />
                      <span>{isPlaying ? "กำลังเล่น..." : "ฟังต้นแบบ"}</span>
                    </button>

                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecordingPhrase}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>หยุดอัดเสียง</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isAnalyzing || Boolean(recordingPhraseId)}
                        onClick={() => startRecordingForPhrase(phrase)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังตรวจเสียง...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>อัดเสียงพูดตาม</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                  เทคนิคเจ้าของภาษา: {phrase.nativeTipThai}
                </p>

                {feedback && (
                  <div
                    className={`rounded-lg p-4 border space-y-2 ${
                      feedback.passed
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          feedback.passed ? "text-emerald-800" : "text-amber-800"
                        }`}
                      >
                        {feedback.passed
                          ? "ผ่านเกณฑ์ความชัดเจน"
                          : "ลองฝึกอีกนิด"}
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-slate-800">
                        ความชัดเจน {feedback.accuracyScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">เสียงที่ได้ยิน:</span> &ldquo;
                      {feedback.heardText || "..."}&rdquo;
                    </p>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {feedback.feedbackThai}
                    </p>
                    <p className="text-xs text-slate-600">
                      จุดโฟกัสเพิ่มเติม: {feedback.focusTipThai}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Roleplay Chat Stage */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={tutor.avatarUrl}
                alt={`ครู ${tutor.name}`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {lesson.speaking.roleplayTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  คู่สนทนา: {tutor.name} ({tutor.city}) · เป้าหมายโต้ตอบ{" "}
                  <span className="tabular-nums font-medium text-slate-800">
                    {Math.min(userTurnsDone, lesson.speaking.goalTurns)}/
                    {lesson.speaking.goalTurns}
                  </span>{" "}
                  รอบ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRoleplayThai((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showRoleplayThai ? "ซ่อนคำแปลไทย" : "แสดงคำแปลไทย"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopActiveAudio();
                  setTurns([
                    {
                      id: "opening",
                      role: "tutor",
                      text: lesson.speaking.openingLineEn,
                      thai: lesson.speaking.openingLineThai,
                    },
                  ]);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เริ่มใหม่</span>
              </button>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            {lesson.speaking.roleplayContextThai}
          </div>

          {/* Conversation Transcript */}
          <div className="p-5 space-y-5 max-h-[460px] overflow-y-auto">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`flex flex-col ${
                  turn.role === "user" ? "items-end" : "items-start"
                } space-y-2`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 space-y-1.5 ${
                    turn.role === "user"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed">{turn.text}</p>
                    {turn.role === "tutor" && (
                      <button
                        type="button"
                        onClick={() =>
                          speakNativeText({
                            text: turn.text,
                            voiceName: tutor.voiceName,
                            style: tutor.stylePrompt,
                          }).catch(() => {})
                        }
                        aria-label="ฟังเสียงครู"
                        className="p-1.5 rounded-md bg-white text-blue-700 hover:bg-blue-50 border border-slate-200 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {turn.role === "tutor" && showRoleplayThai && turn.thai && (
                    <p className="text-xs text-slate-600 border-t border-slate-200/80 pt-1.5">
                      {turn.thai}
                    </p>
                  )}
                </div>

                {turn.role === "user" && turn.upgrade && (
                  <div className="max-w-[85%] bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 text-xs space-y-1">
                    <div className="font-semibold text-emerald-800">
                      {turn.upgrade.isAlreadyNatural
                        ? "พูดได้เป็นธรรมชาติมาก!"
                        : "Native Upgrade (ปรับให้ลื่นไหลแบบเจ้าของภาษา):"}
                    </div>
                    {!turn.upgrade.isAlreadyNatural && (
                      <p className="font-medium text-slate-900">
                        &ldquo;{turn.upgrade.naturalVersion}&rdquo;
                      </p>
                    )}
                    <p className="text-slate-600">{turn.upgrade.whyThai}</p>
                  </div>
                )}
              </div>
            ))}

            {isSendingRoleplay && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>ครู {tutor.name} กำลังฟังและตอบกลับ...</span>
              </div>
            )}
          </div>

          {/* Suggested Replies */}
          {lastTutorTurn?.suggestedReplies &&
            lastTutorTurn.suggestedReplies.length > 0 && (
              <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  แนวทางตอบ:
                </span>
                {lastTutorTurn.suggestedReplies.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setTextInput(idea)}
                    className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            )}

          {roleplayError && (
            <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
              {roleplayError}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRoleplayMessage(textInput);
            }}
            className="p-4 border-t border-slate-200 flex items-center gap-2.5 bg-white"
          >
            <button
              type="button"
              onClick={toggleRoleplayMic}
              disabled={isSendingRoleplay}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isRecordingRoleplay
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              {isRecordingRoleplay ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>หยุดพูดและส่ง</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-blue-700" />
                  <span>พูดตอบ</span>
                </>
              )}
            </button>

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="หรือพิมพ์ภาษาอังกฤษตอบกลับที่นี่..."
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />

            <button
              type="submit"
              disabled={!textInput.trim() || isSendingRoleplay}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ส่ง</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
