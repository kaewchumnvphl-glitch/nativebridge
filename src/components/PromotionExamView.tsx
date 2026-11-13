import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  Check,
  Loader2,
  Mic,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { TUTORS } from "../data/curriculum";
import { getNextRank, getRankById } from "../data/ranks";
import {
  PromotionExam,
  PromotionExamResult,
  RankId,
} from "../types/lesson";
import { blobToBase64, speakNativeText, stopActiveAudio } from "../utils/audio";
import { apiGenerateExam, apiGradeExam } from "../lib/gemini";

interface PromotionExamViewProps {
  currentRankId: RankId;
  completedInRankCount: number;
  onPromoted: (nextRankId: RankId) => void;
  onBackToPractice: () => void;
}

export function PromotionExamView({
  currentRankId,
  completedInRankCount,
  onPromoted,
  onBackToPractice,
}: PromotionExamViewProps) {
  const rank = getRankById(currentRankId);
  const nextRank = getNextRank(currentRankId);

  const [exam, setExam] = useState<PromotionExam | null>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  const [listeningAnswers, setListeningAnswers] = useState<Record<string, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<string, number>>({});
  const [isPlayingListening, setIsPlayingListening] = useState(false);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);

  // Speaking recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>("audio/webm");
  const [speakingFallbackText, setSpeakingFallbackText] = useState("");
  const [writingText, setWritingText] = useState("");

  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<PromotionExamResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setExam(null);
    setResult(null);
    setListeningAnswers({});
    setReadingAnswers({});
    setRecordedBlob(null);
    setSpeakingFallbackText("");
    setWritingText("");
    stopActiveAudio();
  }, [currentRankId]);

  useEffect(() => {
    return () => {
      stopActiveAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleGenerateExam = async () => {
    stopActiveAudio();
    setExamError(null);
    setResult(null);
    setListeningAnswers({});
    setReadingAnswers({});
    setRecordedBlob(null);
    setSpeakingFallbackText("");
    setWritingText("");
    setIsLoadingExam(true);

    try {
      const data = await apiGenerateExam({ rankId: currentRankId });
      if (!data.exam) {
        throw new Error("ไม่สามารถสร้างข้อสอบได้");
      }
      setExam(data.exam);
    } catch (err) {
      setExamError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างข้อสอบ"
      );
    } finally {
      setIsLoadingExam(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }

    setExamError(null);
    stopActiveAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size >= 200) {
          setRecordedBlob(blob);
          setRecordedMime(mime.split(";")[0]);
        } else {
          setExamError("ไม่ได้ยินเสียงพูด กรุณาลองกดอัดเสียงใหม่อีกครั้ง");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setExamError(
        "ไม่สามารถเปิดไมโครโฟนได้ คุณสามารถพิมพ์คำตอบภาษาอังกฤษในช่องสำรองด้านล่างแทนได้"
      );
    }
  };

  const handleSubmitExam = async () => {
    if (!exam || isGrading) return;
    setExamError(null);
    setIsGrading(true);

    try {
      const listeningCorrect = exam.listening.questions.filter(
        (q) => listeningAnswers[q.id] === q.correctIndex
      ).length;
      const listeningScore = Math.round(
        (listeningCorrect / Math.max(1, exam.listening.questions.length)) * 100
      );

      const readingCorrect = exam.reading.questions.filter(
        (q) => readingAnswers[q.id] === q.correctIndex
      ).length;
      const readingScore = Math.round(
        (readingCorrect / Math.max(1, exam.reading.questions.length)) * 100
      );

      let speakingAudioBase64: string | undefined;
      if (recordedBlob) {
        speakingAudioBase64 = await blobToBase64(recordedBlob);
      }

      const graded = await apiGradeExam({
        rankId: currentRankId,
        passingScore: rank.passingScore,
        listeningScore,
        readingScore,
        speakingAudioBase64,
        speakingMimeType: recordedMime,
        speakingTextFallback: speakingFallbackText,
        speakingPromptEn: exam.speaking.promptEn,
        writingText,
        writingPromptEn: exam.writing.promptEn,
      });
      setResult(graded);

      if (graded.passed && nextRank) {
        onPromoted(nextRank.id);
      }
    } catch (err) {
      setExamError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจข้อสอบ"
      );
    } finally {
      setIsGrading(false);
    }
  };

  const examiner = exam ? TUTORS[exam.examinerTutorId] : TUTORS.oliver;
  const writingWordCount = writingText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Exam Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-700">
                แบบทดสอบเลื่อนลำดับขั้น
              </span>
              <span aria-hidden="true">·</span>
              <span>{rank.titleEn}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                เกณฑ์ผ่าน {rank.passingScore}/100
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
              {nextRank
                ? `สอบเพื่อเลื่อนระดับสู่ ${nextRank.titleThai}`
                : "สอบรับรองความเชี่ยวชาญสูงสุดระดับเจ้าของภาษา (C2)"}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              วัดผลครบทั้ง 4 ทักษะ (ฟัง พูด อ่าน เขียน) จากข้อสอบชุดใหม่ที่ครูเจ้าของภาษาสร้างขึ้นสดๆ หากยังไม่ผ่านเกณฑ์ คุณสามารถกลับไปฝึกบทเรียนไม่รู้จบในระดับนี้ต่อได้ตลอดเวลา
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs text-slate-500 block">
              บทเรียนที่ฝึกในระดับนี้
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {completedInRankCount} บท
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isLoadingExam}
            onClick={handleGenerateExam}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoadingExam ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังออกข้อสอบ 4 ทักษะชุดใหม่...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>
                  {exam ? "สร้างข้อสอบชุดใหม่" : "เริ่มทำแบบทดสอบเลื่อนขั้น"}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToPractice}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            กลับไปฝึกบทเรียนไม่รู้จบต่อ
          </button>
        </div>

        {examError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {examError}
          </p>
        )}
      </div>

      {/* Exam Workspace */}
      {exam && !result && (
        <div className="space-y-6">
          {/* Part 1: Listening */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-medium text-blue-700">
                  ส่วนที่ 1/4 · การฟัง (Listening)
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  ฟังเสียงครู {examiner.name} แล้วตอบคำถาม
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {exam.listening.contextThai}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (isPlayingListening) {
                    stopActiveAudio();
                    setIsPlayingListening(false);
                    return;
                  }
                  setIsPlayingListening(true);
                  try {
                    await speakNativeText({
                      text: exam.listening.script,
                      voiceName: examiner.voiceName,
                      style: examiner.stylePrompt,
                    });
                  } finally {
                    setIsPlayingListening(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlayingListening ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>หยุดเล่นเสียง</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>ฟังเสียงข้อสอบ</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-5">
              {exam.listening.questions.map((q, idx) => (
                <div key={q.id} className="space-y-2.5">
                  <p className="text-sm font-medium text-slate-900">
                    {idx + 1}. {q.questionThai}
                  </p>
                  <div className="grid gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setListeningAnswers((prev) => ({
                            ...prev,
                            [q.id]: optIdx,
                          }))
                        }
                        className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                          listeningAnswers[q.id] === optIdx
                            ? "border-blue-600 bg-blue-50 text-blue-900 font-medium"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Part 2: Reading */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-medium text-blue-700">
                ส่วนที่ 2/4 · การอ่าน (Reading)
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {exam.reading.headline}
              </h2>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {exam.reading.passage}
            </div>

            <div className="space-y-5">
              {exam.reading.questions.map((q, idx) => (
                <div key={q.id} className="space-y-2.5">
                  <p className="text-sm font-medium text-slate-900">
                    {idx + 1}. {q.questionThai}
                  </p>
                  <div className="grid gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setReadingAnswers((prev) => ({
                            ...prev,
                            [q.id]: optIdx,
                          }))
                        }
                        className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                          readingAnswers[q.id] === optIdx
                            ? "border-blue-600 bg-blue-50 text-blue-900 font-medium"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Part 3: Speaking */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-700">
                  ส่วนที่ 3/4 · การพูด (Speaking)
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  ตอบคำถามด้วยเสียงภาษาอังกฤษกับครู {examiner.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (isPlayingPrompt) {
                    stopActiveAudio();
                    setIsPlayingPrompt(false);
                    return;
                  }
                  setIsPlayingPrompt(true);
                  try {
                    await speakNativeText({
                      text: exam.speaking.promptEn,
                      voiceName: examiner.voiceName,
                      style: examiner.stylePrompt,
                    });
                  } finally {
                    setIsPlayingPrompt(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-blue-700" />
                <span>{isPlayingPrompt ? "กำลังเล่น..." : "ฟังคำถาม"}</span>
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-base font-medium text-slate-900">
                &ldquo;{exam.speaking.promptEn}&rdquo;
              </p>
              <p className="text-xs text-slate-600">{exam.speaking.promptThai}</p>
              <p className="text-xs text-blue-700 pt-1">
                แนวทาง: {exam.speaking.guidanceThai}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isRecording
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-blue-700 hover:bg-blue-800 text-white"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>หยุดอัดเสียงคำตอบ</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>
                      {recordedBlob ? "อัดเสียงใหม่" : "อัดเสียงตอบคำถาม"}
                    </span>
                  </>
                )}
              </button>

              {recordedBlob && !isRecording && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span>บันทึกเสียงคำตอบแล้ว พร้อมส่งตรวจ</span>
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-2">
              <label
                htmlFor="speaking-fallback"
                className="text-xs text-slate-500 block"
              >
                (ทางเลือกกรณีไม่มีไมโครโฟน) พิมพ์คำตอบที่คุณต้องการพูดเป็นภาษาอังกฤษ:
              </label>
              <input
                id="speaking-fallback"
                type="text"
                value={speakingFallbackText}
                onChange={(e) => setSpeakingFallbackText(e.target.value)}
                placeholder="พิมพ์คำตอบภาษาอังกฤษที่นี่หากไม่ได้อัดเสียง..."
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              />
            </div>
          </section>

          {/* Part 4: Writing */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="border-b border-slate-200 pb-4 space-y-1">
              <p className="text-xs font-medium text-blue-700">
                ส่วนที่ 4/4 · การเขียน (Writing)
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {exam.writing.promptEn}
              </h2>
              <p className="text-xs text-slate-600">{exam.writing.promptThai}</p>
            </div>

            <textarea
              rows={5}
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="เขียนคำตอบภาษาอังกฤษของคุณที่นี่..."
              className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-blue-600 resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-500 tabular-nums">
                จำนวนคำ: <strong className="text-slate-900">{writingWordCount}</strong>{" "}
                / แนะนำ {exam.writing.minWords}+ คำ
              </span>

              <button
                type="button"
                disabled={
                  isGrading ||
                  (!recordedBlob && !speakingFallbackText.trim()) ||
                  writingWordCount < 5
                }
                onClick={handleSubmitExam}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจข้อสอบทั้ง 4 ทักษะ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ส่งข้อสอบเพื่อประเมินการเลื่อนขั้น</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Exam Result Scorecard */}
      {result && (
        <div
          className={`bg-white border rounded-xl p-6 sm:p-8 space-y-6 ${
            result.passed ? "border-emerald-300" : "border-amber-300"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5">
              <span
                className={`text-xs font-semibold ${
                  result.passed ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {result.passed
                  ? "สอบผ่านเกณฑ์เลื่อนลำดับขั้นแล้ว!"
                  : "ยังไม่ผ่านเกณฑ์ในรอบนี้ — ฝึกบทเรียนต่อได้ไม่รู้จบ"}
              </span>
              <h2 className="text-2xl font-semibold text-slate-900">
                {result.verdictThai}
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 block">
                คะแนนรวม (เกณฑ์ผ่าน {result.passingScore})
              </span>
              <span
                className={`text-3xl font-bold font-mono tabular-nums ${
                  result.passed ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {result.overallScore}/100
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { label: "การฟัง (Listening)", score: result.skillScores.listening },
                { label: "การพูด (Speaking)", score: result.skillScores.speaking },
                { label: "การอ่าน (Reading)", score: result.skillScores.reading },
                { label: "การเขียน (Writing)", score: result.skillScores.writing },
              ] as const
            ).map((s) => (
              <div
                key={s.label}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1"
              >
                <span className="text-xs text-slate-500 block">{s.label}</span>
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {s.score}/100
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-900">
                ผลประเมินทักษะการพูด
              </h3>
              {result.spokenTranscript && (
                <p className="text-xs text-slate-500">
                  เสียงที่ถอดความได้: &ldquo;{result.spokenTranscript}&rdquo;
                </p>
              )}
              <p className="text-sm text-slate-700 leading-relaxed">
                {result.speakingFeedbackThai}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-900">
                ผลประเมินทักษะการเขียน
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {result.writingFeedbackThai}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">คำแนะนำขั้นถัดไป: </strong>
            {result.nextStepsThai}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {result.passed && nextRank ? (
              <button
                type="button"
                onClick={onBackToPractice}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>เริ่มเรียนใน {nextRank.titleThai}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToPractice}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>กลับไปฝึกบทเรียนไม่รู้จบในระดับนี้</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerateExam}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>สอบซ่อม / ทำข้อสอบชุดใหม่อีกครั้ง</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
