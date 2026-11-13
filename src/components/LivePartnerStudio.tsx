import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageSquare,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import {
  FREE_TALK_SCENARIOS,
  FreeTalkScenario,
  TUTORS,
} from "../data/curriculum";
import { RoleplayTurn, TutorId } from "../types/lesson";
import { blobToBase64, speakNativeText, stopActiveAudio } from "../utils/audio";
import { apiRoleplay, apiTranscribe } from "../lib/gemini";

export function LivePartnerStudio() {
  const [selectedScenario, setSelectedScenario] = useState<FreeTalkScenario>(
    FREE_TALK_SCENARIOS[0]
  );
  const [customTutorId, setCustomTutorId] = useState<TutorId>(
    FREE_TALK_SCENARIOS[0].tutorId
  );
  const [customTopic, setCustomTopic] = useState("");
  const [isCustomActive, setIsCustomActive] = useState(false);

  const [turns, setTurns] = useState<RoleplayTurn[]>([
    {
      id: "ft-open",
      role: "tutor",
      text: FREE_TALK_SCENARIOS[0].openingLineEn,
      thai: FREE_TALK_SCENARIOS[0].openingLineThai,
    },
  ]);
  const [showThai, setShowThai] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const activeTutor = TUTORS[isCustomActive ? customTutorId : selectedScenario.tutorId];

  useEffect(() => {
    return () => {
      stopActiveAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const selectScenario = (scenario: FreeTalkScenario) => {
    stopActiveAudio();
    setIsCustomActive(false);
    setSelectedScenario(scenario);
    setCustomTutorId(scenario.tutorId);
    setTurns([
      {
        id: `open-${scenario.id}`,
        role: "tutor",
        text: scenario.openingLineEn,
        thai: scenario.openingLineThai,
      },
    ]);
    setError(null);
  };

  const startCustomTopic = () => {
    if (!customTopic.trim()) return;
    stopActiveAudio();
    setIsCustomActive(true);
    const t = TUTORS[customTutorId];
    const openEn = `Hey! I'm ${t.name} from ${t.city}. I'd love to chat about "${customTopic.trim()}"—what's on your mind?`;
    const openTh = `สวัสดี! เราชื่อ ${t.name} จาก ${t.city} ยินดีคุยเรื่อง "${customTopic.trim()}" เลย คุณอยากเริ่มตรงไหนดี?`;
    setTurns([{ id: `custom-${Date.now()}`, role: "tutor", text: openEn, thai: openTh }]);
    setError(null);
  };

  const sendMessage = async (msg: string) => {
    const clean = msg.trim();
    if (!clean || isSending) return;
    setError(null);
    setTextInput("");

    const userTurnId = `u-${Date.now()}`;
    const history = turns.map((t) => ({ role: t.role, text: t.text }));
    setTurns((prev) => [...prev, { id: userTurnId, role: "user", text: clean }]);
    setIsSending(true);

    try {
      const scenarioTitle = isCustomActive
        ? `Custom Topic: ${customTopic}`
        : selectedScenario.titleEn;
      const scenarioPrompt = isCustomActive
        ? `Have a friendly, natural conversation with the learner about "${customTopic}". Speak naturally like a local from ${activeTutor.city}.`
        : selectedScenario.scenarioPrompt;

      const data = await apiRoleplay({
        tutorName: activeTutor.name,
        tutorCity: activeTutor.city,
        tutorStyle: activeTutor.stylePrompt,
        scenarioTitle,
        scenarioPrompt,
        history,
        userMessage: clean,
      });

      const tutorTurn: RoleplayTurn = {
        id: `t-${Date.now()}`,
        role: "tutor",
        text: data.tutorReply,
        thai: data.tutorReplyThai,
        suggestedReplies: data.suggestedReplies,
      };

      setTurns((prev) =>
        prev
          .map((t) =>
            t.id === userTurnId && data.nativeUpgrade
              ? { ...t, upgrade: data.nativeUpgrade }
              : t
          )
          .concat(tutorTurn)
      );

      speakNativeText({
        text: data.tutorReply,
        voiceName: activeTutor.voiceName,
        style: activeTutor.stylePrompt,
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสนทนา");
    } finally {
      setIsSending(false);
    }
  };

  const toggleMic = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }

    setError(null);
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setError("ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้ง");
          return;
        }
        setIsSending(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const trData = await apiTranscribe({
            audioBase64,
            mimeType: mimeType.split(";")[0],
          });
          if (!trData.transcript) {
            throw new Error("ไม่สามารถถอดเสียงได้ กรุณาลองพูดใหม่อีกครั้ง");
          }
          setIsSending(false);
          await sendMessage(trData.transcript);
        } catch (err) {
          setIsSending(false);
          setError(err instanceof Error ? err.message : "ไม่สามารถรับเสียงพูดได้");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้ไมโครโฟน หรือพิมพ์ข้อความด้านล่างเพื่อคุยต่อ");
    }
  };

  const lastTutorTurn = [...turns].reverse().find((t) => t.role === "tutor");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-blue-700">
          คู่สนทนาเจ้าของภาษาแบบเรียลไทม์
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 text-balance">
          คุยสดกับครูต่างชาติในสถานการณ์จริง
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          เลือกสถานการณ์หรือพิมพ์หัวข้อที่คุณอยากฝึกพูด ระบบจะโต้ตอบด้วยเสียงสำเนียงเจ้าของภาษา พร้อมปรับประโยคของคุณให้เป็นธรรมชาติขึ้นทุกครั้งที่ตอบ
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Control Deck */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              เลือกสถานการณ์จำลอง
            </h2>
            <div className="space-y-2">
              {FREE_TALK_SCENARIOS.map((sc) => {
                const tutor = TUTORS[sc.tutorId];
                const active = !isCustomActive && selectedScenario.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => selectScenario(sc)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer space-y-1 ${
                      active
                        ? "border-blue-600 bg-blue-50/70"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs text-slate-500">
                      {tutor.name} ({tutor.city}) · {sc.levelLabel}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {sc.titleThai}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {sc.descriptionThai}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              หรือตั้งหัวข้อคุยเอง
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(TUTORS) as TutorId[]).map((tid) => (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setCustomTutorId(tid)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      customTutorId === tid
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {TUTORS[tid].name}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="เช่น สั่งอาหารเจในลอนดอน, เล่าเรื่องหนังที่ชอบ"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              />

              <button
                type="button"
                disabled={!customTopic.trim()}
                onClick={startCustomTopic}
                className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                เริ่มคุยหัวข้อนี้กับ {TUTORS[customTutorId].name}
              </button>
            </div>
          </div>
        </div>

        {/* Right Interactive Conversation Stage */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={activeTutor.avatarUrl}
                alt={`ครู ${activeTutor.name}`}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isCustomActive ? customTopic : selectedScenario.titleEn}
                </h2>
                <p className="text-xs text-slate-500">
                  ครู {activeTutor.name} · {activeTutor.city} · {activeTutor.accentLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowThai((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showThai ? "ซ่อนคำแปลไทย" : "แสดงคำแปลไทย"}
              </button>
              <button
                type="button"
                onClick={() =>
                  isCustomActive
                    ? startCustomTopic()
                    : selectScenario(selectedScenario)
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างบทสนทนา</span>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5 min-h-[380px] max-h-[500px] overflow-y-auto">
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
                            voiceName: activeTutor.voiceName,
                            style: activeTutor.stylePrompt,
                          }).catch(() => {})
                        }
                        aria-label="ฟังเสียงครู"
                        className="p-1.5 rounded-md bg-white text-blue-700 border border-slate-200 hover:bg-blue-50 shrink-0 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {turn.role === "tutor" && showThai && turn.thai && (
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
                        : "Native Upgrade:"}
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

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>ครู {activeTutor.name} กำลังตอบกลับ...</span>
              </div>
            )}
          </div>

          {lastTutorTurn?.suggestedReplies &&
            lastTutorTurn.suggestedReplies.length > 0 && (
              <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  ไอเดียตอบกลับ:
                </span>
                {lastTutorTurn.suggestedReplies.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setTextInput(idea)}
                    className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-800 cursor-pointer"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            )}

          {error && (
            <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(textInput);
            }}
            className="p-4 border-t border-slate-200 flex items-center gap-2.5 bg-white"
          >
            <button
              type="button"
              onClick={toggleMic}
              disabled={isSending}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isRecording
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>หยุดพูดและส่ง</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-blue-700" />
                  <span>กดพูด</span>
                </>
              )}
            </button>

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="พิมพ์ภาษาอังกฤษโต้ตอบกับครู..."
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />

            <button
              type="submit"
              disabled={!textInput.trim() || isSending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ส่ง</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
