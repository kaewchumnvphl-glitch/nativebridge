import { ArrowRight, Award, Check, Lock, Trash2, Volume2 } from "lucide-react";
import { TUTORS } from "../data/curriculum";
import { RANKS, getRankById } from "../data/ranks";
import {
  Lesson,
  LessonProgress,
  RankId,
  SavedPhrase,
  SkillKey,
} from "../types/lesson";
import { speakNativeText } from "../utils/audio";

interface ProgressViewProps {
  allLessons: Lesson[];
  unlockedRankId: RankId;
  progress: Record<string, LessonProgress>;
  savedPhrases: SavedPhrase[];
  onOpenLessonSkill: (lessonId: string, skill: SkillKey) => void;
  onRemovePhrase: (id: string) => void;
  onGoToExam: () => void;
}

export function ProgressView({
  allLessons,
  unlockedRankId,
  progress,
  savedPhrases,
  onOpenLessonSkill,
  onRemovePhrase,
  onGoToExam,
}: ProgressViewProps) {
  const currentRank = getRankById(unlockedRankId);

  const skillStats = (
    [
      { key: "listeningDone", skill: "listening", label: "การฟัง (Listening)" },
      { key: "speakingDone", skill: "speaking", label: "การพูด (Speaking)" },
      { key: "readingDone", skill: "reading", label: "การอ่าน (Reading)" },
      { key: "writingDone", skill: "writing", label: "การเขียน (Writing)" },
    ] as const
  ).map((item) => {
    const doneCount = allLessons.filter(
      (l) => progress[l.id]?.[item.key]
    ).length;
    return { ...item, doneCount };
  });

  const totalCompletedModules = allLessons.filter((l) => {
    const p = progress[l.id];
    return (
      p?.listeningDone && p?.speakingDone && p?.readingDone && p?.writingDone
    );
  }).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-blue-700">
            สถิติการฝึกฝนและสมุดสำนวนส่วนตัว
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            ลำดับขั้นปัจจุบัน: {currentRank.titleThai}
          </h1>
          <p className="text-sm text-slate-600">
            ฝึกบทเรียนไม่รู้จบในระดับของคุณและสอบเลื่อนขั้นเมื่อพร้อมเพื่อปลดล็อกระดับถัดไป
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToExam}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>ทำแบบทดสอบเลื่อนลำดับขั้น</span>
        </button>
      </div>

      {/* 6-Rank Milestone Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {RANKS.map((r) => {
          const isUnlocked = r.rankNumber <= currentRank.rankNumber;
          const isCurrent = r.id === unlockedRankId;
          return (
            <div
              key={r.id}
              className={`rounded-xl border p-4 space-y-1.5 ${
                isCurrent
                  ? "border-blue-600 bg-blue-50/60"
                  : isUnlocked
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-white opacity-75"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="font-mono text-slate-900">
                  Rank {r.rankNumber} ({r.cefr})
                </span>
                {isUnlocked ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-800 leading-snug">
                {r.difficultyLabelThai}
              </p>
            </div>
          );
        })}
      </div>

      {/* 4-Skill Practice Counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skillStats.map((stat) => (
          <div
            key={stat.skill}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-2"
          >
            <span className="text-xs font-medium text-slate-500 block">
              {stat.label}
            </span>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
              {stat.doneCount} บท
            </div>
            <p className="text-xs text-slate-500 tabular-nums">
              จากทั้งหมด {allLessons.length} บทที่เปิดเรียนแล้ว
            </p>
          </div>
        ))}
      </div>

      {/* Lesson History Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            ประวัติบทเรียนที่เปิดเรียนแล้ว ({totalCompletedModules}/
            {allLessons.length} บทครบ 4 ทักษะ)
          </h2>
        </div>

        <div className="divide-y divide-slate-200 max-h-[420px] overflow-y-auto">
          {allLessons.map((lesson) => {
            const p = progress[lesson.id];
            const tutor = TUTORS[lesson.tutorId];
            const skills: Array<{
              key: SkillKey;
              label: string;
              done: boolean;
            }> = [
              { key: "listening", label: "ฟัง", done: Boolean(p?.listeningDone) },
              { key: "speaking", label: "พูด", done: Boolean(p?.speakingDone) },
              { key: "reading", label: "อ่าน", done: Boolean(p?.readingDone) },
              { key: "writing", label: "เขียน", done: Boolean(p?.writingDone) },
            ];

            return (
              <div
                key={lesson.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    ระดับ {lesson.rankId} · บทที่ {lesson.number} · {tutor.name} (
                    {tutor.city})
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {lesson.titleThai}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {skills.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onOpenLessonSkill(lesson.id, s.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        s.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s.done ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal Native Phrasebook */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              สมุดสำนวนเจ้าของภาษาที่บันทึกไว้
            </h2>
            <p className="text-xs text-slate-500">
              กดปุ่มลำโพงเพื่อทบทวนการออกเสียงได้ตลอดเวลา
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            {savedPhrases.length} รายการ
          </span>
        </div>

        {savedPhrases.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            ยังไม่มีสำนวนที่บันทึกไว้ คุณสามารถกดไอคอนรูปบุ๊กมาร์กในหน้าบทเรียนการฟังหรือการอ่านเพื่อเก็บประโยคที่ชอบไว้ทบทวนได้ที่นี่
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {savedPhrases.map((item) => (
              <div
                key={item.id}
                className="p-5 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{item.sourceLesson}</span>
                    {item.ipa && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{item.ipa}</span>
                      </>
                    )}
                  </div>
                  <p className="text-base font-medium text-slate-900">
                    {item.english}
                  </p>
                  <p className="text-sm text-slate-600">{item.thai}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      speakNativeText({
                        text: item.english,
                        voiceName: item.voiceName,
                      }).catch(() => {})
                    }
                    aria-label="ฟังเสียงสำนวน"
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-700 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePhrase(item.id)}
                    aria-label="ลบออกจากสมุดคำศัพท์"
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
