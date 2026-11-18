import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Plus,
  RotateCcw,
} from "lucide-react";
import { TUTORS } from "../data/curriculum";
import { getRankById } from "../data/ranks";
import { Lesson, LessonProgress, SavedPhrase, SkillKey } from "../types/lesson";
import { ListeningLab } from "./ListeningLab";
import { SpeakingLab } from "./SpeakingLab";
import { ReadingLab } from "./ReadingLab";
import { WritingLab } from "./WritingLab";

interface ClassroomViewProps {
  lesson: Lesson;
  rankLessons: Lesson[];
  activeSkill: SkillKey;
  progress: Record<string, LessonProgress>;
  savedPhrases: SavedPhrase[];
  isGeneratingLesson: boolean;
  generationError: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectSkill: (skill: SkillKey) => void;
  onMarkSkillComplete: (
    lessonId: string,
    skill: SkillKey,
    score?: number
  ) => void;
  onToggleSavePhrase: (phrase: SavedPhrase) => void;
  onGenerateNextLesson: () => void;
  onRegenerateLesson: () => void;
  onGoToLiveStudio: () => void;
  onGoToExam: () => void;
}

const SKILL_TABS: Array<{
  key: SkillKey;
  label: string;
  doneKey: keyof Pick<
    LessonProgress,
    "listeningDone" | "speakingDone" | "readingDone" | "writingDone"
  >;
}> = [
  { key: "listening", label: "1. ฟัง (Listening)", doneKey: "listeningDone" },
  { key: "speaking", label: "2. พูด (Speaking)", doneKey: "speakingDone" },
  { key: "reading", label: "3. อ่าน (Reading)", doneKey: "readingDone" },
  { key: "writing", label: "4. เขียน (Writing)", doneKey: "writingDone" },
];

export function ClassroomView({
  lesson,
  rankLessons,
  activeSkill,
  progress,
  savedPhrases,
  isGeneratingLesson,
  generationError,
  onSelectLesson,
  onSelectSkill,
  onMarkSkillComplete,
  onToggleSavePhrase,
  onGenerateNextLesson,
  onRegenerateLesson,
  onGoToLiveStudio,
  onGoToExam,
}: ClassroomViewProps) {
  const tutor = TUTORS[lesson.tutorId];
  const rank = getRankById(lesson.rankId);
  const lessonProgress = progress[lesson.id] ?? {
    listeningDone: false,
    speakingDone: false,
    readingDone: false,
    writingDone: false,
  };

  const savedIds = new Set(savedPhrases.map((p) => p.id));
  const lessonIndex = rankLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? rankLessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < rankLessons.length - 1 ? rankLessons[lessonIndex + 1] : null;

  const completedSkillsCount = [
    lessonProgress.listeningDone,
    lessonProgress.speakingDone,
    lessonProgress.readingDone,
    lessonProgress.writingDone,
  ].filter(Boolean).length;

  const renderSkillIcon = (key: SkillKey) => {
    switch (key) {
      case "listening":
        return <Headphones className="w-3.5 h-3.5" />;
      case "speaking":
        return <Mic className="w-3.5 h-3.5" />;
      case "reading":
        return <BookOpen className="w-3.5 h-3.5" />;
      case "writing":
        return <PenLine className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Lesson Top Strip & 4-Skill Segmented Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-blue-700">
                {rank.titleEn} · บทที่ {lesson.number}
              </span>
              <span aria-hidden="true">·</span>
              <span>{lesson.topicCategory}</span>
              <span aria-hidden="true">·</span>
              <span>
                ครูผู้สอน {tutor.name} ({tutor.city})
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{lesson.durationMinutes} นาที</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-balance">
              {lesson.titleThai}
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {lesson.summaryThai}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-xs text-slate-500 block">
              ความสำเร็จของบทนี้
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {completedSkillsCount}/4 ทักษะ
            </span>
          </div>
        </div>

        {/* 4-Skill Segmented Switcher */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
            role="tablist"
            aria-label="เลือกทักษะที่ต้องการฝึก"
          >
            {SKILL_TABS.map((tab) => {
              const isActive = activeSkill === tab.key;
              const isDone = lessonProgress[tab.doneKey];
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectSkill(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    renderSkillIcon(tab.key)
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lesson.isGenerated && (
              <button
                type="button"
                disabled={isGeneratingLesson}
                onClick={onRegenerateLesson}
                title="สร้างเนื้อหาบทเรียนนี้ใหม่"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>สร้างบทนี้ใหม่</span>
              </button>
            )}
            {prevLesson && (
              <button
                type="button"
                onClick={() => onSelectLesson(prevLesson.id)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>บทก่อนหน้า</span>
              </button>
            )}
            {nextLesson ? (
              <button
                type="button"
                onClick={() => onSelectLesson(nextLesson.id)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>บทถัดไป</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isGeneratingLesson}
                onClick={onGenerateNextLesson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isGeneratingLesson ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังสร้างบทเรียนถัดไป... (1-2 นาที)</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>สร้างบทเรียนถัดไปไม่รู้จบ</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {generationError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {generationError}
          </p>
        )}
      </div>

      {/* Two-Zone Classroom Split */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8">
          {activeSkill === "listening" && (
            <ListeningLab
              key={lesson.id}
              lesson={lesson}
              isCompleted={lessonProgress.listeningDone}
              savedIds={savedIds}
              onSavePhrase={onToggleSavePhrase}
              onComplete={() => onMarkSkillComplete(lesson.id, "listening")}
            />
          )}

          {activeSkill === "speaking" && (
            <SpeakingLab
              key={lesson.id}
              lesson={lesson}
              tutor={tutor}
              isCompleted={lessonProgress.speakingDone}
              onComplete={(score) =>
                onMarkSkillComplete(lesson.id, "speaking", score)
              }
            />
          )}

          {activeSkill === "reading" && (
            <ReadingLab
              key={lesson.id}
              lesson={lesson}
              tutor={tutor}
              isCompleted={lessonProgress.readingDone}
              savedIds={savedIds}
              onSavePhrase={onToggleSavePhrase}
              onComplete={() => onMarkSkillComplete(lesson.id, "reading")}
            />
          )}

          {activeSkill === "writing" && (
            <WritingLab
              key={lesson.id}
              lesson={lesson}
              tutor={tutor}
              isCompleted={lessonProgress.writingDone}
              onComplete={(score) =>
                onMarkSkillComplete(lesson.id, "writing", score)
              }
            />
          )}
        </div>

        {/* Right Tutor & Endless Rank Companion Deck */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src={tutor.avatarUrl}
                alt={`ครู ${tutor.name}`}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div>
                <p className="text-xs text-slate-500">ครูเจ้าของภาษาประจำบท</p>
                <h2 className="text-base font-semibold text-slate-900">
                  {tutor.name} · {tutor.city}
                </h2>
                <p className="text-xs text-blue-700 font-medium">
                  {tutor.accentLabel}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {tutor.bioThai}
            </p>
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <p className="text-xs font-semibold text-slate-900">
                มุมมองวัฒนธรรมเจ้าของภาษา
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {lesson.culturalInsightThai}
              </p>
            </div>
          </div>

          {/* Endless Lessons in Current Rank */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                บทเรียนในระดับ {rank.cefr}
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {rankLessons.length} บท
              </span>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {rankLessons.map((item) => {
                const p = progress[item.id];
                const doneCount = [
                  p?.listeningDone,
                  p?.speakingDone,
                  p?.readingDone,
                  p?.writingDone,
                ].filter(Boolean).length;
                const isCurrent = item.id === lesson.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectLesson(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent
                        ? "border-blue-600 bg-blue-50/70 text-slate-900"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500 block">
                        บทที่ {item.number} · {TUTORS[item.tutorId].name}
                      </span>
                      <span className="text-xs font-medium block truncate">
                        {item.titleThai}
                      </span>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                      {doneCount}/4
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                disabled={isGeneratingLesson}
                onClick={onGenerateNextLesson}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGeneratingLesson ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังสร้างบทใหม่... (1-2 นาที)</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>สร้างบทเรียนใหม่ในระดับ {rank.cefr}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onGoToExam}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-blue-700" />
                <span>สอบเลื่อนลำดับขั้นถัดไป</span>
              </button>

              <button
                type="button"
                onClick={onGoToLiveStudio}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                เปิดโหมดคุยสดอิสระกับครูต่างชาติ
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
