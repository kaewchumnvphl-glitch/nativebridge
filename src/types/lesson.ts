export type SkillKey = "listening" | "speaking" | "reading" | "writing";

export type TutorId = "maya" | "liam" | "oliver";

export type RankId = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface RankDefinition {
  id: RankId;
  rankNumber: number;
  cefr: RankId;
  titleThai: string;
  titleEn: string;
  difficultyLabelThai: string;
  descriptionThai: string;
  passingScore: number;
  totalCatalogSeeds: number;
}

export interface TutorProfile {
  id: TutorId;
  name: string;
  city: string;
  accentLabel: string;
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  stylePrompt: string;
  avatarUrl: string;
  bioThai: string;
  specialtyThai: string;
}

export interface ConnectedSpeechNote {
  phrase: string;
  soundsLike: string;
  explanationThai: string;
}

export interface DialogueLine {
  id: string;
  speaker: string;
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
  style: string;
  english: string;
  thai: string;
  connectedNotes?: ConnectedSpeechNote[];
}

export interface ComprehensionQuestion {
  id: string;
  questionThai: string;
  options: string[];
  correctIndex: number;
  explanationThai: string;
}

export interface ShadowingPhrase {
  id: string;
  english: string;
  stressGuide: string;
  ipa: string;
  thaiMeaning: string;
  nativeTipThai: string;
}

export interface NativeExpression {
  id: string;
  phrase: string;
  ipa: string;
  register: "Casual" | "Neutral" | "Workplace" | "Idiomatic";
  meaningThai: string;
  example: string;
}

export interface Lesson {
  id: string;
  rankId: RankId;
  sequenceNumber: number;
  number: string;
  topicCategory: string;
  isGenerated?: boolean;
  titleEn: string;
  titleThai: string;
  levelLabel: string;
  durationMinutes: number;
  tutorId: TutorId;
  summaryThai: string;
  culturalInsightThai: string;
  listening: {
    sceneTitleThai: string;
    contextThai: string;
    partnerName: string;
    partnerVoice: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
    dialogue: DialogueLine[];
    questions: ComprehensionQuestion[];
  };
  speaking: {
    shadowingPhrases: ShadowingPhrase[];
    roleplayTitle: string;
    roleplayContextThai: string;
    roleplayScenarioPrompt: string;
    openingLineEn: string;
    openingLineThai: string;
    goalTurns: number;
  };
  reading: {
    formatLabel: string;
    headline: string;
    authorMeta: string;
    paragraphs: string[];
    expressions: NativeExpression[];
    questions: ComprehensionQuestion[];
  };
  writing: {
    promptTitle: string;
    promptInstructionThai: string;
    promptInstructionEn: string;
    targetExpressions: string[];
    minWords: number;
    sampleStarter: string;
  };
}

export interface LessonProgress {
  listeningDone: boolean;
  speakingDone: boolean;
  readingDone: boolean;
  writingDone: boolean;
  bestSpeakingScore?: number;
  bestWritingScore?: number;
}

export interface SavedPhrase {
  id: string;
  english: string;
  thai: string;
  ipa?: string;
  sourceLesson: string;
  voiceName: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
}

export interface RoleplayTurn {
  id: string;
  role: "tutor" | "user";
  text: string;
  thai?: string;
  upgrade?: {
    isAlreadyNatural: boolean;
    naturalVersion: string;
    whyThai: string;
  };
  suggestedReplies?: string[];
}

export interface WritingEvaluation {
  naturalnessScore: number;
  strengthsThai: string;
  casualNativeRewrite: string;
  polishedNativeRewrite: string;
  keyUpgrades: Array<{
    original: string;
    improved: string;
    explanationThai: string;
  }>;
  grammarAndToneTipThai: string;
}

export interface PromotionExam {
  rankId: RankId;
  examinerTutorId: TutorId;
  listening: {
    contextThai: string;
    script: string;
    questions: ComprehensionQuestion[];
  };
  reading: {
    headline: string;
    passage: string;
    questions: ComprehensionQuestion[];
  };
  speaking: {
    promptEn: string;
    promptThai: string;
    guidanceThai: string;
  };
  writing: {
    promptEn: string;
    promptThai: string;
    minWords: number;
  };
}

export interface PromotionExamResult {
  passed: boolean;
  overallScore: number;
  passingScore: number;
  skillScores: {
    listening: number;
    speaking: number;
    reading: number;
    writing: number;
  };
  spokenTranscript: string;
  verdictThai: string;
  speakingFeedbackThai: string;
  writingFeedbackThai: string;
  nextStepsThai: string;
}
