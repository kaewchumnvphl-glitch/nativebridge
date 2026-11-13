import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  Play,
  Square,
  Volume2,
} from "lucide-react";
import { DialogueLine, Lesson, SavedPhrase } from "../types/lesson";
import { speakNativeText, stopActiveAudio } from "../utils/audio";

interface ListeningLabProps {
  lesson: Lesson;
  isCompleted: boolean;
  savedIds: Set<string>;
  onSavePhrase: (phrase: SavedPhrase) => void;
  onComplete: () => void;
}

export function ListeningLab({
  lesson,
  isCompleted,
  savedIds,
  onSavePhrase,
  onComplete,
}: ListeningLabProps) {
  const [blindMode, setBlindMode] = useState(false);
  const [showThai, setShowThai] = useState(true);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1.0>(1.0);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  const { listening } = lesson;
  const playbackCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      playbackCancelledRef.current = true;
      stopActiveAudio();
    };
  }, []);

  const handlePlayFullDialogue = async () => {
    if (activeAudioId !== null) {
      playbackCancelledRef.current = true;
      stopActiveAudio();
      setActiveAudioId(null);
      return;
    }

    playbackCancelledRef.current = false;
    setAudioError(null);
    setActiveAudioId("full");
    try {
      for (const line of listening.dialogue) {
        if (playbackCancelledRef.current) break;
        setActiveAudioId(line.id);
        await speakNativeText({
          text: line.english,
          voiceName: line.voiceName,
          style: line.style,
          playbackRate,
        });
      }
    } catch (err) {
      if (!playbackCancelledRef.current) {
        setAudioError(
          err instanceof Error ? err.message : "ไม่สามารถเล่นเสียงได้ในขณะนี้"
        );
      }
    } finally {
      setActiveAudioId(null);
    }
  };

  const handlePlayLine = async (line: DialogueLine) => {
    if (activeAudioId === line.id) {
      playbackCancelledRef.current = true;
      stopActiveAudio();
      setActiveAudioId(null);
      return;
    }
    playbackCancelledRef.current = false;
    setAudioError(null);
    setActiveAudioId(line.id);
    try {
      await speakNativeText({
        text: line.english,
        voiceName: line.voiceName,
        style: line.style,
        playbackRate,
      });
    } catch (err) {
      setAudioError(
        err instanceof Error ? err.message : "ไม่สามารถเล่นเสียงได้ในขณะนี้"
      );
    } finally {
      setActiveAudioId(null);
    }
  };

  const handleSelectOption = (questionId: string, idx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: idx }));
    setCheckedQuestions((prev) => {
      const next = { ...prev, [questionId]: true };
      const allAnsweredCorrect = listening.questions.every((q) => {
        const chosen = questionId === q.id ? idx : selectedAnswers[q.id];
        return chosen === q.correctIndex;
      });
      if (allAnsweredCorrect && !isCompleted) {
        onComplete();
      }
      return next;
    });
  };

  const allCorrect = listening.questions.every(
    (q) => selectedAnswers[q.id] === q.correctIndex
  );

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">
              {listening.sceneTitleThai}
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              ฝึกฟังบทสนทนาจริงและจับเสียงเชื่อมคำ
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {listening.contextThai}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-4 h-4" />
              <span>ผ่านการฝึกฟังแล้ว</span>
            </div>
          )}
        </div>

        {/* Audio Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlayFullDialogue}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeAudioId ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>หยุดเล่นเสียง</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>ฟังบทสนทนาทั้งหมด</span>
                </>
              )}
            </button>

            <div
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
              role="group"
              aria-label="ความเร็วเสียง"
            >
              <button
                type="button"
                onClick={() => setPlaybackRate(0.75)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  playbackRate === 0.75
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                0.75x ช้าชัด
              </button>
              <button
                type="button"
                onClick={() => setPlaybackRate(1.0)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  playbackRate === 1.0
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1.0x ปกติ
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBlindMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                blindMode
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {blindMode ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>เปิดบทพูด</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>ซ่อนบทพูด (ฝึกหู)</span>
                </>
              )}
            </button>

            {!blindMode && (
              <button
                type="button"
                onClick={() => setShowThai((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{showThai ? "ซ่อนคำแปลไทย" : "แสดงคำแปลไทย"}</span>
              </button>
            )}
          </div>
        </div>

        {audioError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {audioError}
          </p>
        )}
      </div>

      {/* Dialogue Transcript & Connected Speech Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        {blindMode ? (
          <div className="p-10 text-center space-y-3">
            <Headphones className="w-8 h-8 text-blue-700 mx-auto" />
            <h4 className="text-base font-semibold text-slate-900">
              โหมดฝึกฟังแบบไม่ดูซับ (Blind Listening)
            </h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              ลองกด &ldquo;ฟังบทสนทนาทั้งหมด&rdquo; ด้านบน 1–2 รอบเพื่อจับน้ำเสียงและใจความสำคัญ จากนั้นค่อยกด &ldquo;เปิดบทพูด&rdquo; เพื่อเช็กเสียงเชื่อมคำ
            </p>
          </div>
        ) : (
          listening.dialogue.map((line) => {
            const isPlaying = activeAudioId === line.id;
            const phraseId = `dialogue-${line.id}`;
            const isSaved = savedIds.has(phraseId);

            return (
              <div
                key={line.id}
                className={`p-5 transition-colors ${
                  isPlaying ? "bg-blue-50/60" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {line.speaker}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{line.style}</span>
                    </div>
                    <p className="text-base font-medium text-slate-900 leading-relaxed">
                      {line.english}
                    </p>
                    {showThai && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {line.thai}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayLine(line)}
                      aria-label={`เล่นเสียงประโยคของ ${line.speaker}`}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
                        isPlaying
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {isPlaying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSavePhrase({
                          id: phraseId,
                          english: line.english,
                          thai: line.thai,
                          sourceLesson: lesson.titleEn,
                          voiceName: line.voiceName,
                        })
                      }
                      aria-label="บันทึกประโยคลงสมุดคำศัพท์"
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors cursor-pointer ${
                        isSaved
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                {line.connectedNotes && line.connectedNotes.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid gap-3 sm:grid-cols-2">
                    {line.connectedNotes.map((note) => (
                      <div
                        key={note.phrase}
                        className="bg-slate-50 rounded-lg p-3 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-blue-800">
                            {note.phrase}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            →
                          </span>
                          <span className="font-mono text-slate-700">
                            {note.soundsLike}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {note.explanationThai}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Comprehension Check */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              ทดสอบความเข้าใจจากการฟัง
            </h4>
            <p className="text-xs text-slate-500">
              ตอบถูกครบทุกข้อเพื่อบันทึกความคืบหน้าทักษะการฟังของบทนี้
            </p>
          </div>
          {(allCorrect || isCompleted) && (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกว่าฝึกฟังจบแล้ว</span>
            </button>
          )}
        </div>

        <div className="space-y-6">
          {listening.questions.map((q, qIdx) => {
            const selected = selectedAnswers[q.id];
            const isChecked = checkedQuestions[q.id];
            const isCorrect = selected === q.correctIndex;

            return (
              <div key={q.id} className="space-y-3">
                <p className="text-sm font-medium text-slate-900">
                  {qIdx + 1}. {q.questionThai}
                </p>
                <div className="grid gap-2">
                  {q.options.map((opt, idx) => {
                    const chosen = selected === idx;
                    let optionStyle =
                      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                    if (isChecked && chosen && isCorrect) {
                      optionStyle =
                        "border-emerald-600 bg-emerald-50 text-emerald-900";
                    } else if (isChecked && chosen && !isCorrect) {
                      optionStyle =
                        "border-amber-600 bg-amber-50 text-amber-900";
                    } else if (isChecked && idx === q.correctIndex) {
                      optionStyle =
                        "border-emerald-300 bg-emerald-50/50 text-emerald-900";
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(q.id, idx)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors cursor-pointer ${optionStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {isChecked && (
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
