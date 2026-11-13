import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Headphones,
  Loader2,
  Lock,
  Mic,
  PenLine,
  Plus,
} from "lucide-react";
import {
  CURATED_LESSONS,
  HERO_STUDIO_IMAGE,
  TUTORS,
} from "./data/curriculum";
import {
  RANKS,
  TOPIC_CATEGORIES,
  getProceduralLessonSeed,
  getRankById,
} from "./data/ranks";
import {
  Lesson,
  LessonProgress,
  RankId,
  SavedPhrase,
  SkillKey,
  TutorId,
} from "./types/lesson";
import { ClassroomView } from "./components/ClassroomView";
import { LivePartnerStudio } from "./components/LivePartnerStudio";
import { ProgressView } from "./components/ProgressView";
import { PromotionExamView } from "./components/PromotionExamView";
import { stopActiveAudio } from "./utils/audio";
import { apiGenerateLesson } from "./lib/gemini";
import { AccessGate } from "./components/AccessGate";

type ActiveTab = "overview" | "classroom" | "live" | "exam" | "progress";

const STORAGE_PROGRESS_KEY = "nativebridge_progress_v2";
const STORAGE_PHRASES_KEY = "nativebridge_phrases_v2";
const STORAGE_GENERATED_KEY = "nativebridge_generated_lessons_v3";
const STORAGE_RANK_KEY = "nativebridge_unlocked_rank_v2";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function NativeBridge() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [unlockedRankId, setUnlockedRankId] = useState<RankId>(() =>
    loadJson<RankId>(STORAGE_RANK_KEY, "A1")
  );
  const [selectedRankId, setSelectedRankId] = useState<RankId>(() =>
    loadJson<RankId>(STORAGE_RANK_KEY, "A1")
  );
  const [generatedLessons, setGeneratedLessons] = useState<Lesson[]>(() =>
    loadJson<Lesson[]>(STORAGE_GENERATED_KEY, [])
  );
  const [currentLessonId, setCurrentLessonId] = useState<string>(
    CURATED_LESSONS[0].id
  );
  const [activeSkill, setActiveSkill] = useState<SkillKey>("listening");
  const [progress, setProgress] = useState<Record<string, LessonProgress>>(() =>
    loadJson<Record<string, LessonProgress>>(STORAGE_PROGRESS_KEY, {})
  );
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>(() =>
    loadJson<SavedPhrase[]>(STORAGE_PHRASES_KEY, [])
  );

  // Endless catalog explorer state
  const [catalogPageStart, setCatalogPageStart] = useState<number>(1);
  const [jumpNumberInput, setJumpNumberInput] = useState<string>("25");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [generatingSeedNum, setGeneratingSeedNum] = useState<number | null>(
    null
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PHRASES_KEY, JSON.stringify(savedPhrases));
    } catch {
      // ignore storage errors
    }
  }, [savedPhrases]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_GENERATED_KEY,
        JSON.stringify(generatedLessons)
      );
    } catch {
      // ignore storage errors
    }
  }, [generatedLessons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RANK_KEY, JSON.stringify(unlockedRankId));
    } catch {
      // ignore storage errors
    }
  }, [unlockedRankId]);

  const allLessons = useMemo(
    () => [...CURATED_LESSONS, ...generatedLessons],
    [generatedLessons]
  );

  const unlockedRankNumber = getRankById(unlockedRankId).rankNumber;
  const activeRankDef = getRankById(selectedRankId);

  const lessonsInSelectedRank = useMemo(
    () =>
      allLessons
        .filter((l) => l.rankId === selectedRankId)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    [allLessons, selectedRankId]
  );

  const currentLesson =
    allLessons.find((l) => l.id === currentLessonId) ??
    lessonsInSelectedRank[0] ??
    CURATED_LESSONS[0];

  const lessonsInCurrentLessonRank = useMemo(
    () =>
      allLessons
        .filter((l) => l.rankId === currentLesson.rankId)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    [allLessons, currentLesson.rankId]
  );

  const navigateToTab = (tab: ActiveTab) => {
    stopActiveAudio();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLesson = (lessonId: string, skill: SkillKey = "listening") => {
    stopActiveAudio();
    const target = allLessons.find((l) => l.id === lessonId);
    if (target) {
      setSelectedRankId(target.rankId);
    }
    setCurrentLessonId(lessonId);
    setActiveSkill(skill);
    setActiveTab("classroom");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateAndOpenLesson = async (
    rankId: RankId,
    sequenceNumber: number,
    customCategory?: string,
    forceRegenerate = false
  ) => {
    // Check if this sequenceNumber already exists in rank
    const existing = allLessons.find(
      (l) => l.rankId === rankId && l.sequenceNumber === sequenceNumber
    );
    if (existing && !forceRegenerate) {
      openLesson(existing.id, "listening");
      return;
    }

    setGenerationError(null);
    setIsGeneratingLesson(true);
    setGeneratingSeedNum(sequenceNumber);

    const seed = getProceduralLessonSeed(rankId, sequenceNumber);
    const chosenCategory =
      customCategory && customCategory !== "all"
        ? customCategory
        : seed.topicCategory;

    try {
      const avoidTitles = allLessons
        .filter((l) => l.rankId === rankId)
        .map((l) => l.titleEn);

      const data = await apiGenerateLesson({
        rankId,
        sequenceNumber,
        topicCategory: chosenCategory,
        scenarioTitle: seed.scenarioTitle,
        twist: seed.twist,
        tutorId: seed.tutorId,
        avoidTitles,
      });
      if (!data.lesson) {
        throw new Error("ไม่สามารถสร้างบทเรียนใหม่ได้");
      }

      const created = data.lesson as Lesson;
      setGeneratedLessons((prev) => [
        ...prev.filter(
          (l) =>
            !(l.rankId === rankId && l.sequenceNumber === sequenceNumber)
        ),
        created,
      ]);
      setSelectedRankId(rankId);
      setCurrentLessonId(created.id);
      setActiveSkill("listening");
      setActiveTab("classroom");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างบทเรียน"
      );
    } finally {
      setIsGeneratingLesson(false);
      setGeneratingSeedNum(null);
    }
  };

  const handleGenerateNextInRank = (rankId: RankId) => {
    const existingNums = allLessons
      .filter((l) => l.rankId === rankId)
      .map((l) => l.sequenceNumber);
    const nextSeq =
      existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    generateAndOpenLesson(
      rankId,
      nextSeq,
      selectedCategoryFilter !== "all" ? selectedCategoryFilter : undefined
    );
  };

  const handleMarkSkillComplete = (
    lessonId: string,
    skill: SkillKey,
    score?: number
  ) => {
    setProgress((prev) => {
      const existing = prev[lessonId] ?? {
        listeningDone: false,
        speakingDone: false,
        readingDone: false,
        writingDone: false,
      };
      return {
        ...prev,
        [lessonId]: {
          ...existing,
          listeningDone: skill === "listening" ? true : existing.listeningDone,
          speakingDone: skill === "speaking" ? true : existing.speakingDone,
          readingDone: skill === "reading" ? true : existing.readingDone,
          writingDone: skill === "writing" ? true : existing.writingDone,
          bestSpeakingScore:
            skill === "speaking" && score !== undefined
              ? Math.max(existing.bestSpeakingScore ?? 0, score)
              : existing.bestSpeakingScore,
          bestWritingScore:
            skill === "writing" && score !== undefined
              ? Math.max(existing.bestWritingScore ?? 0, score)
              : existing.bestWritingScore,
        },
      };
    });
  };

  const handleToggleSavePhrase = (phrase: SavedPhrase) => {
    setSavedPhrases((prev) => {
      const exists = prev.some((p) => p.id === phrase.id);
      if (exists) {
        return prev.filter((p) => p.id !== phrase.id);
      }
      return [phrase, ...prev];
    });
  };

  const handlePromoted = (nextRankId: RankId) => {
    const nextDef = getRankById(nextRankId);
    if (nextDef.rankNumber > unlockedRankNumber) {
      setUnlockedRankId(nextRankId);
      setSelectedRankId(nextRankId);
    }
  };

  const completedInUnlockedRank = allLessons.filter((l) => {
    if (l.rankId !== unlockedRankId) return false;
    const p = progress[l.id];
    return p?.listeningDone || p?.speakingDone || p?.readingDone || p?.writingDone;
  }).length;

  // Build endless procedural catalog slice (up to 2,000 seeds per Rank = 12,000+ lessons)
  const catalogSeeds = useMemo(() => {
    const items = [];
    for (let i = catalogPageStart; i < catalogPageStart + 9; i++) {
      if (i > activeRankDef.totalCatalogSeeds) break;
      const seed = getProceduralLessonSeed(selectedRankId, i);
      if (
        selectedCategoryFilter === "all" ||
        seed.topicCategory === selectedCategoryFilter
      ) {
        items.push(seed);
      }
    }
    // If category filter reduced items, scan forward slightly to show up to 6 matching lessons
    if (selectedCategoryFilter !== "all" && items.length < 6) {
      let cursor = catalogPageStart + 9;
      while (items.length < 6 && cursor <= activeRankDef.totalCatalogSeeds) {
        const seed = getProceduralLessonSeed(selectedRankId, cursor);
        if (seed.topicCategory === selectedCategoryFilter) {
          items.push(seed);
        }
        cursor++;
      }
    }
    return items;
  }, [
    catalogPageStart,
    selectedRankId,
    selectedCategoryFilter,
    activeRankDef.totalCatalogSeeds,
  ]);

  const nextUnfinishedLesson =
    lessonsInSelectedRank.find((l) => {
      const p = progress[l.id];
      return !(
        p?.listeningDone &&
        p?.speakingDone &&
        p?.readingDone &&
        p?.writingDone
      );
    }) ??
    lessonsInSelectedRank[0] ??
    CURATED_LESSONS[0];

  const rankCategories = TOPIC_CATEGORIES[selectedRankId] || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => navigateToTab("overview")}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            NativeBridge
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { key: "overview", label: "หลักสูตร" },
                { key: "classroom", label: "ห้องเรียน" },
                { key: "live", label: "คุยสดกับครู" },
                { key: "exam", label: "สอบเลื่อนขั้น" },
                { key: "progress", label: "ความก้าวหน้า" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => navigateToTab(item.key)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === item.key
                    ? "text-blue-700 underline decoration-2 underline-offset-8"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => openLesson(nextUnfinishedLesson.id, "listening")}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              เข้าห้องเรียน
            </button>
          </div>
        </div>

        {/* Mobile Nav Row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          {(
            [
              { key: "overview", label: "หลักสูตร" },
              { key: "classroom", label: "ห้องเรียน" },
              { key: "live", label: "คุยสดกับครู" },
              { key: "exam", label: "สอบเลื่อนขั้น" },
              { key: "progress", label: "ความก้าวหน้า" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateToTab(item.key)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === item.key
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {activeTab === "overview" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
            {/* Hero 2-Column Split */}
            <section className="grid gap-8 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <p className="text-xs font-medium text-blue-700">
                  สถาบันฝึกภาษาอังกฤษไม่รู้จบ (12,000+ บทเรียน) · ไล่ระดับจากง่ายไปหายาก
                </p>
                <h1 className="text-3xl sm:text-5xl font-semibold text-slate-900 leading-[1.15] text-balance">
                  เรียนจากง่ายไปยากแบบไม่รู้จบ จนกว่าจะสอบผ่านเลื่อนขั้น
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  เริ่มต้นตั้งแต่ระดับพื้นฐานที่สุด (A1) สู่ระดับเจ้าของภาษา (C2) ฝึกครบทั้ง ฟัง พูด อ่าน เขียน ร่วมกับครูชาวต่างชาติ และสร้างบทเรียนใหม่ได้นับหมื่นบทในระดับของคุณจนกว่าจะสอบผ่านเพื่อปลดล็อกขั้นถัดไป
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      openLesson(nextUnfinishedLesson.id, "listening")
                    }
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      เรียนต่อใน {getRankById(unlockedRankId).titleEn}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToTab("exam")}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-blue-700" />
                    <span>สอบเลื่อนลำดับขั้น</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  {heroImageError ? (
                    <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-blue-50">
                      <div className="space-y-2">
                        <p className="font-display text-xl font-semibold text-slate-800">
                          NativeBridge Endless Academy
                        </p>
                        <p className="text-sm text-slate-600">
                          A1 Foundation → C2 Native Mastery
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={HERO_STUDIO_IMAGE}
                      alt="โต๊ะเรียนภาษาอังกฤษบรรยากาศอบอุ่นพร้อมสมุดโน้ตและหูฟัง"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImageError(true)}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </section>

            {/* 4-Skill Methodology Strip */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Headphones,
                  title: "1. ฟัง (Listening)",
                  desc: "ฟังบทสนทนาจริงตามระดับ A1–C2 ปรับความเร็วได้ พร้อมฝึกจับเสียงเชื่อมคำ",
                },
                {
                  icon: Mic,
                  title: "2. พูด (Speaking)",
                  desc: "อัดเสียง Shadowing ตรวจคำต่อคำ และโต้ตอบสดกับครูต่างชาติด้วยเสียงจริง",
                },
                {
                  icon: BookOpen,
                  title: "3. อ่าน (Reading)",
                  desc: "บทความและแชทจริงไต่ระดับความยาก คลิกดูสำนวน IPA และบันทึกทบทวนได้",
                },
                {
                  icon: PenLine,
                  title: "4. เขียน (Writing)",
                  desc: "ส่งงานเขียนให้ครูต่างชาติตรวจและเกลาสำนวนให้เป็นธรรมชาติทุกบทเรียน",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5"
                  >
                    <Icon className="w-5 h-5 text-blue-700" />
                    <h2 className="text-base font-semibold text-slate-900">
                      {item.title}
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </section>

            {/* 6-Tier Rank Progression Gate */}
            <section className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    เส้นทาง 6 ลำดับขั้น (เริ่มจากง่ายไปหายาก)
                  </h2>
                  <p className="text-sm text-slate-600">
                    แต่ละระดับมีบทเรียนให้ฝึกไม่รู้จบ (ระดับละ 2,000+ หัวข้อ) จนกว่าคุณจะสอบผ่านเพื่อเลื่อนไประดับที่ยากขึ้น
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToTab("exam")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    สอบเลื่อนจาก {getRankById(unlockedRankId).cefr} ขึ้นระดับถัดไป
                  </span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {RANKS.map((rank) => {
                  const isUnlocked = rank.rankNumber <= unlockedRankNumber;
                  const isSelected = rank.id === selectedRankId;
                  const isPassed = rank.rankNumber < unlockedRankNumber;

                  return (
                    <button
                      key={rank.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => {
                        setSelectedRankId(rank.id);
                        setSelectedCategoryFilter("all");
                        setCatalogPageStart(1);
                      }}
                      className={`text-left rounded-xl border p-5 space-y-2.5 transition-colors ${
                        !isUnlocked
                          ? "border-slate-200 bg-slate-100/70 opacity-70 cursor-not-allowed"
                          : isSelected
                          ? "border-blue-600 bg-white shadow-sm cursor-pointer"
                          : "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-blue-700">
                          {rank.titleEn}
                        </span>
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>สอบผ่านแล้ว</span>
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-slate-600 font-medium">
                            {rank.difficultyLabelThai}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Lock className="w-3.5 h-3.5" />
                            <span>ต้องสอบผ่านขั้นก่อนหน้า</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-slate-900">
                        {rank.titleThai}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {rank.descriptionThai}
                      </p>
                      <div className="pt-1 text-xs font-mono tabular-nums text-slate-500">
                        คลังบทเรียนไม่รู้จบ: {rank.totalCatalogSeeds.toLocaleString()}+ บท · เกณฑ์สอบผ่าน {rank.passingScore}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Endless Lesson Library for Selected Rank */}
            <section className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-700">
                      กำลังแสดงบทเรียนใน: {activeRankDef.titleThai}
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      บทเรียนพร้อมเรียนและตัวสร้างบทเรียนไม่รู้จบ
                    </h2>
                    <p className="text-xs text-slate-600">
                      เรียนบทเริ่มต้นด้านล่าง หรือกดสร้างบทเรียนใหม่ได้เรื่อยๆ ไม่จำกัดจำนวนจนกว่าคุณจะมั่นใจและสอบผ่าน
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingLesson}
                    onClick={() => handleGenerateNextInRank(selectedRankId)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isGeneratingLesson && generatingSeedNum === null ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังสร้างบทเรียนใหม่...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>สร้างบทเรียนถัดไปทันที</span>
                      </>
                    )}
                  </button>
                </div>

                {generationError && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {generationError}
                  </p>
                )}

                {/* Ready-to-open lessons in this Rank */}
                <div className="space-y-3 pt-2">
                  {lessonsInSelectedRank.map((lesson) => {
                    const tutor = TUTORS[lesson.tutorId];
                    const p = progress[lesson.id];
                    const doneCount = [
                      p?.listeningDone,
                      p?.speakingDone,
                      p?.readingDone,
                      p?.writingDone,
                    ].filter(Boolean).length;

                    return (
                      <div
                        key={lesson.id}
                        className="border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-blue-700">
                              บทที่ {lesson.number}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{lesson.topicCategory}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              ครู {tutor.name} ({tutor.city})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              {lesson.durationMinutes} นาที
                            </span>
                            {doneCount === 4 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 font-medium">
                                  ครบ 4 ทักษะแล้ว
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {lesson.titleThai}{" "}
                            <span className="text-slate-400 font-normal text-sm">
                              — {lesson.titleEn}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {lesson.summaryThai}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono tabular-nums text-slate-500">
                            {doneCount}/4 ทักษะ
                          </span>
                          <button
                            type="button"
                            onClick={() => openLesson(lesson.id, "listening")}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>เข้าเรียนบทนี้</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Procedural Endless Lesson Browser (1 - 2,000+ per Rank) */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        สำรวจคลังบทเรียนไม่รู้จบในระดับ {activeRankDef.cefr} (บทที่ 1 –{" "}
                        {activeRankDef.totalCatalogSeeds.toLocaleString()})
                      </h3>
                      <p className="text-xs text-slate-500">
                        เลือกหมวดหมู่หรือกรอกเลขบทเรียนที่ต้องการ (เช่น บทที่ 48 หรือ 1,250) เพื่อให้ครูสร้างบทเรียนครบ 4 ทักษะให้ทันที
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const num = Math.max(
                          1,
                          Math.min(
                            activeRankDef.totalCatalogSeeds,
                            parseInt(jumpNumberInput || "1", 10) || 1
                          )
                        );
                        setCatalogPageStart(num);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        min={1}
                        max={activeRankDef.totalCatalogSeeds}
                        value={jumpNumberInput}
                        onChange={(e) => setJumpNumberInput(e.target.value)}
                        aria-label="ไปที่บทเรียนหมายเลข"
                        className="w-24 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        ข้ามไปบทนี้
                      </button>
                    </form>
                  </div>

                  {/* Category Filters */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategoryFilter === "all"
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      ทุกหมวดหมู่
                    </button>
                    {rankCategories.map((cat) => (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.category)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          selectedCategoryFilter === cat.category
                            ? "bg-blue-700 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {cat.category}
                      </button>
                    ))}
                  </div>

                  {/* Procedural Seed Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {catalogSeeds.map((seed) => {
                      const alreadyGenerated = allLessons.find(
                        (l) =>
                          l.rankId === seed.rankId &&
                          l.sequenceNumber === seed.sequenceNumber
                      );
                      const isThisLoading =
                        isGeneratingLesson &&
                        generatingSeedNum === seed.sequenceNumber;
                      const tutor = TUTORS[seed.tutorId];

                      return (
                        <div
                          key={`${seed.rankId}-${seed.sequenceNumber}`}
                          className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 bg-slate-50/50"
                        >
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              บทที่ {seed.sequenceNumber} · {tutor.name} ·{" "}
                              {seed.topicCategory}
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                              {alreadyGenerated
                                ? alreadyGenerated.titleThai
                                : seed.scenarioTitle}
                            </h4>
                            <p className="text-xs text-slate-600">
                              บริบท: {seed.twist}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={isGeneratingLesson}
                            onClick={() =>
                              generateAndOpenLesson(
                                seed.rankId,
                                seed.sequenceNumber
                              )
                            }
                            className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800 disabled:opacity-50 text-xs font-medium text-slate-800 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isThisLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังสร้างบทเรียน...</span>
                              </>
                            ) : alreadyGenerated ? (
                              <span>เปิดเรียนบทที่ {seed.sequenceNumber}</span>
                            ) : (
                              <span>สร้างและเริ่มเรียนบทนี้</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Range Pager */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                      แสดงบทที่ {catalogPageStart}–
                      {Math.min(
                        catalogPageStart + 8,
                        activeRankDef.totalCatalogSeeds
                      )}{" "}
                      จาก {activeRankDef.totalCatalogSeeds.toLocaleString()} หัวข้อในระดับ {activeRankDef.cefr}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={catalogPageStart <= 1}
                        onClick={() =>
                          setCatalogPageStart((p) => Math.max(1, p - 9))
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        ชุดก่อนหน้า
                      </button>
                      <button
                        type="button"
                        disabled={
                          catalogPageStart + 9 > activeRankDef.totalCatalogSeeds
                        }
                        onClick={() =>
                          setCatalogPageStart((p) =>
                            Math.min(
                              activeRankDef.totalCatalogSeeds - 8,
                              p + 9
                            )
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        ดูบทถัดไปอีก
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Meet the Native Tutors */}
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-slate-900">
                  ทีมครูเจ้าของภาษาที่จะสอนคุณโดยตรง
                </h2>
                <p className="text-sm text-slate-600">
                  สลับเรียนรู้ทั้งสำเนียงอเมริกัน อังกฤษ และออสเตรเลียในทุกบทเรียน
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {(Object.keys(TUTORS) as TutorId[]).map((tid) => {
                  const t = TUTORS[tid];
                  return (
                    <div
                      key={t.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={t.avatarUrl}
                          alt={`ครู ${t.name}`}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {t.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {t.city} · {t.accentLabel}
                          </p>
                          <p className="text-xs font-medium text-blue-700 mt-0.5">
                            {t.specialtyThai}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t.bioThai}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === "classroom" && (
          <ClassroomView
            lesson={currentLesson}
            rankLessons={lessonsInCurrentLessonRank}
            activeSkill={activeSkill}
            progress={progress}
            savedPhrases={savedPhrases}
            isGeneratingLesson={isGeneratingLesson}
            generationError={generationError}
            onSelectLesson={(id) => {
              stopActiveAudio();
              setCurrentLessonId(id);
              setActiveSkill("listening");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSelectSkill={(skill) => {
              stopActiveAudio();
              setActiveSkill(skill);
            }}
            onMarkSkillComplete={handleMarkSkillComplete}
            onToggleSavePhrase={handleToggleSavePhrase}
            onGenerateNextLesson={() =>
              handleGenerateNextInRank(currentLesson.rankId)
            }
            onRegenerateLesson={() =>
              generateAndOpenLesson(
                currentLesson.rankId,
                currentLesson.sequenceNumber,
                currentLesson.topicCategory,
                true
              )
            }
            onGoToLiveStudio={() => navigateToTab("live")}
            onGoToExam={() => navigateToTab("exam")}
          />
        )}

        {activeTab === "live" && <LivePartnerStudio />}

        {activeTab === "exam" && (
          <PromotionExamView
            currentRankId={unlockedRankId}
            completedInRankCount={completedInUnlockedRank}
            onPromoted={handlePromoted}
            onBackToPractice={() => navigateToTab("overview")}
          />
        )}

        {activeTab === "progress" && (
          <ProgressView
            allLessons={allLessons}
            unlockedRankId={unlockedRankId}
            progress={progress}
            savedPhrases={savedPhrases}
            onOpenLessonSkill={openLesson}
            onRemovePhrase={(id) =>
              setSavedPhrases((prev) => prev.filter((p) => p.id !== id))
            }
            onGoToExam={() => navigateToTab("exam")}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            NativeBridge · เรียนภาษาอังกฤษ 4 ทักษะแบบไม่รู้จบตั้งแต่ A1 ถึง C2
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateToTab("classroom")}
              className="hover:text-slate-900 cursor-pointer"
            >
              ห้องเรียน
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("live")}
              className="hover:text-slate-900 cursor-pointer"
            >
              คุยสดกับครู
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("exam")}
              className="hover:text-slate-900 cursor-pointer"
            >
              สอบเลื่อนขั้น
            </button>
            <button
              type="button"
              onClick={() => navigateToTab("progress")}
              className="hover:text-slate-900 cursor-pointer"
            >
              สมุดสำนวนและความก้าวหน้า
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AccessGate>
      <NativeBridge />
    </AccessGate>
  );
}
