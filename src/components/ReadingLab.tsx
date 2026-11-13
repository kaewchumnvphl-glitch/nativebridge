import { Fragment, useState } from "react";
import { Bookmark, Check, Loader2, Volume2 } from "lucide-react";
import { Lesson, NativeExpression, SavedPhrase, TutorProfile } from "../types/lesson";
import { speakNativeText, stopActiveAudio } from "../utils/audio";

interface ReadingLabProps {
  lesson: Lesson;
  tutor: TutorProfile;
  isCompleted: boolean;
  savedIds: Set<string>;
  onSavePhrase: (phrase: SavedPhrase) => void;
  onComplete: () => void;
}

export function ReadingLab({
  lesson,
  tutor,
  isCompleted,
  savedIds,
  onSavePhrase,
  onComplete,
}: ReadingLabProps) {
  const { reading } = lesson;
  const [selectedExpr, setSelectedExpr] = useState<NativeExpression | undefined>(
    reading.expressions?.[0]
  );
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleReadPassage = async () => {
    if (isReadingAloud) {
      stopActiveAudio();
      setIsReadingAloud(false);
      return;
    }
    setAudioError(null);
    setIsReadingAloud(true);
    try {
      await speakNativeText({
        text: `${reading.headline}. ${reading.paragraphs.join(" ")}`,
        voiceName: tutor.voiceName,
        style: tutor.stylePrompt,
        playbackRate: 1.0,
      });
    } catch (err) {
      setAudioError(
        err instanceof Error ? err.message : "ไม่สามารถเล่นเสียงอ่านบทความได้"
      );
    } finally {
      setIsReadingAloud(false);
    }
  };

  const handleReadExpression = async (expr: NativeExpression) => {
    setAudioError(null);
    try {
      await speakNativeText({
        text: `${expr.phrase}. ${expr.example}`,
        voiceName: tutor.voiceName,
        style: tutor.stylePrompt,
      });
    } catch {
      // silent fallback handled inside speakNativeText
    }
  };

  const renderHighlightedParagraph = (paragraph: string) => {
    const validExpressions = (reading.expressions || []).filter(
      (e) => e.phrase && e.phrase.trim().length > 0
    );
    if (validExpressions.length === 0) {
      return paragraph;
    }
    const sorted = [...validExpressions].sort(
      (a, b) => b.phrase.length - a.phrase.length
    );
    const pattern = new RegExp(
      `(${sorted
        .map((e) => e.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})`,
      "gi"
    );

    const parts = paragraph.split(pattern);
    return parts.map((part, idx) => {
      const match = sorted.find(
        (e) => e.phrase.toLowerCase() === part.toLowerCase()
      );
      if (!match) {
        return <Fragment key={idx}>{part}</Fragment>;
      }
      const isSelected = selectedExpr?.id === match.id;
      return (
        <button
          key={idx}
          type="button"
          onClick={() => setSelectedExpr(match)}
          className={`inline font-medium underline decoration-2 underline-offset-4 transition-colors cursor-pointer ${
            isSelected
              ? "text-blue-800 bg-blue-100/80 decoration-blue-700 rounded px-1"
              : "text-blue-700 decoration-blue-300 hover:bg-blue-50 rounded px-0.5"
          }`}
        >
          {part}
        </button>
      );
    });
  };

  const handleSelectQuestion = (questionId: string, idx: number) => {
    const next = { ...selectedAnswers, [questionId]: idx };
    setSelectedAnswers(next);
    const allCorrect = reading.questions.every(
      (q) => next[q.id] === q.correctIndex
    );
    if (allCorrect && !isCompleted) {
      onComplete();
    }
  };

  const savedExprId = selectedExpr ? `expr-${selectedExpr.id}` : "";
  const isExprSaved = selectedExpr ? savedIds.has(savedExprId) : false;

  return (
    <div className="space-y-8">
      {/* Authentic Reading Passage */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-blue-700">
                {reading.formatLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>{reading.authorMeta}</span>
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 leading-snug text-balance">
              {reading.headline}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleReadPassage}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isReadingAloud ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                <span>กำลังอ่าน... (คลิกเพื่อหยุด)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-blue-700" />
                <span>ให้ครู {tutor.name} อ่านให้ฟัง</span>
              </>
            )}
          </button>
        </div>

        {audioError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {audioError}
          </p>
        )}

        <div className="space-y-4 max-w-[68ch] text-base text-slate-800 leading-relaxed">
          {reading.paragraphs.map((p, idx) => (
            <p key={idx}>{renderHighlightedParagraph(p)}</p>
          ))}
        </div>

        <p className="text-xs text-slate-500 pt-2">
          เคล็ดลับ: คลิกที่คำหรือสำนวนที่ขีดเส้นใต้สีน้ำเงินในบทความเพื่อดูคำอธิบายและวิธีใช้แบบเจ้าของภาษา
        </p>
      </div>

      {/* Interactive Expression Inspector */}
      {selectedExpr && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-900">
              เจาะลึกสำนวนเจ้าของภาษาในบทความ
            </h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {reading.expressions.map((expr) => (
                <button
                  key={expr.id}
                  type="button"
                  onClick={() => setSelectedExpr(expr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedExpr.id === expr.id
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {expr.phrase}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono text-slate-700">
                    {selectedExpr.ipa}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>ระดับภาษา: {selectedExpr.register}</span>
                </div>
                <h5 className="text-lg font-semibold text-slate-900">
                  {selectedExpr.phrase}
                </h5>
                <p className="text-sm text-slate-700">{selectedExpr.meaningThai}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReadExpression(selectedExpr)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>ฟังตัวอย่าง</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSavePhrase({
                      id: savedExprId,
                      english: selectedExpr.phrase,
                      thai: selectedExpr.meaningThai,
                      ipa: selectedExpr.ipa,
                      sourceLesson: lesson.titleEn,
                      voiceName: tutor.voiceName,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    isExprSaved
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isExprSaved ? "fill-current" : ""}`}
                  />
                  <span>{isExprSaved ? "บันทึกแล้ว" : "เก็บเข้าสมุดคำศัพท์"}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 text-sm text-slate-800">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                ตัวอย่างการใช้จริง:
              </span>
              &ldquo;{selectedExpr.example}&rdquo;
            </div>
          </div>
        </div>
      )}

      {/* Reading Nuance Check */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              เช็กความเข้าใจเชิงบริบท
            </h4>
            <p className="text-xs text-slate-500">
              ตอบถูกครบทุกข้อเพื่อบันทึกความคืบหน้าทักษะการอ่าน
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-4 h-4" />
              <span>ผ่านการฝึกอ่านแล้ว</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {reading.questions.map((q, qIdx) => {
            const chosen = selectedAnswers[q.id];
            const answered = chosen !== undefined;
            const isCorrect = chosen === q.correctIndex;

            return (
              <div key={q.id} className="space-y-3">
                <p className="text-sm font-medium text-slate-900">
                  {qIdx + 1}. {q.questionThai}
                </p>
                <div className="grid gap-2">
                  {q.options.map((opt, idx) => {
                    let style =
                      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                    if (answered && chosen === idx && isCorrect) {
                      style =
                        "border-emerald-600 bg-emerald-50 text-emerald-900";
                    } else if (answered && chosen === idx && !isCorrect) {
                      style = "border-amber-600 bg-amber-50 text-amber-900";
                    } else if (answered && idx === q.correctIndex) {
                      style =
                        "border-emerald-300 bg-emerald-50/50 text-emerald-900";
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectQuestion(q.id, idx)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {answered && (
                  <p
                    className={`text-xs leading-relaxed ${
                      isCorrect ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {isCorrect ? "ถูกต้อง: " : "คำอธิบาย: "}
                    {q.explanationThai}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
