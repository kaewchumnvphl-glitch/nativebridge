import { useState } from "react";
import { Check, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Lesson, TutorProfile, WritingEvaluation } from "../types/lesson";
import { speakNativeText } from "../utils/audio";
import { apiEvaluateWriting } from "../lib/gemini";

interface WritingLabProps {
  lesson: Lesson;
  tutor: TutorProfile;
  isCompleted: boolean;
  onComplete: (score: number) => void;
}

export function WritingLab({
  lesson,
  tutor,
  isCompleted,
  onComplete,
}: WritingLabProps) {
  const { writing } = lesson;
  const [draft, setDraft] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wordCount = draft
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const insertExpression = (expr: string) => {
    setDraft((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return expr;
      return `${trimmed} ${expr}`;
    });
  };

  const handleEvaluate = async () => {
    if (!draft.trim() || isEvaluating) return;
    setError(null);
    setIsEvaluating(true);
    try {
      const parsed = await apiEvaluateWriting({
        promptTitle: writing.promptTitle,
        promptInstruction: writing.promptInstructionEn,
        userText: draft,
        targetExpressions: writing.targetExpressions,
      });
      setEvaluation(parsed);
      onComplete(parsed.naturalnessScore ?? 85);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจงานเขียน"
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Writing Brief & Editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-700">
              ภารกิจฝึกเขียนแบบเจ้าของภาษา
            </p>
            <h3 className="text-xl font-semibold text-slate-900">
              {writing.promptTitle}
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {writing.promptInstructionThai}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check className="w-4 h-4" />
              <span>ส่งตรวจงานเขียนแล้ว</span>
            </div>
          )}
        </div>

        {/* Clickable Target Native Expressions */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-slate-500">
            คลิกเพื่อแทรกสำนวนแนะนำจากบทเรียนนี้ลงในงานเขียน:
          </p>
          <div className="flex flex-wrap gap-2">
            {writing.targetExpressions.map((expr) => (
              <button
                key={expr}
                type="button"
                onClick={() => insertExpression(expr)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
              >
                + {expr}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`เริ่มเขียนภาษาอังกฤษของคุณที่นี่... (เช่น ${writing.sampleStarter})`}
            className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-blue-600 resize-y"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="tabular-nums">
                จำนวนคำ: <strong className="text-slate-900">{wordCount}</strong>{" "}
                / แนะนำ {writing.minWords}+ คำ
              </span>
              <button
                type="button"
                onClick={() => setDraft(writing.sampleStarter)}
                className="text-blue-700 hover:underline font-medium cursor-pointer"
              >
                ใช้ประโยคขึ้นต้นตัวอย่าง
              </button>
            </div>

            <button
              type="button"
              onClick={handleEvaluate}
              disabled={wordCount < 5 || isEvaluating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ครู {tutor.name} กำลังตรวจสำนวน...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ให้ครู {tutor.name} ตรวจและเกลาสำนวน</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Native Editor Evaluation Result */}
      {evaluation && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                ผลการตรวจจากครู {tutor.name} ({tutor.city})
              </p>
              <h4 className="text-lg font-semibold text-slate-900">
                คำแนะนำและเวอร์ชันเจ้าของภาษา
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">
                ระดับความเป็นธรรมชาติ
              </span>
              <span className="text-2xl font-bold font-mono tabular-nums text-blue-700">
                {evaluation.naturalnessScore}/100
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-800">
              จุดที่ทำได้ดีแล้ว
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {evaluation.strengthsThai}
            </p>
          </div>

          {/* Two Native Register Rewrites */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  แบบ Casual Native (คุยกับเพื่อน/แชท)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    speakNativeText({
                      text: evaluation.casualNativeRewrite,
                      voiceName: tutor.voiceName,
                      style: tutor.stylePrompt,
                    }).catch(() => {})
                  }
                  aria-label="ฟังเสียงเวอร์ชัน Casual"
                  className="p-1.5 rounded-md bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-slate-900 leading-relaxed">
                {evaluation.casualNativeRewrite}
              </p>
            </div>

            <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-blue-900">
                  แบบ Polished Native (สุภาพ สละสลวย)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    speakNativeText({
                      text: evaluation.polishedNativeRewrite,
                      voiceName: tutor.voiceName,
                      style: tutor.stylePrompt,
                    }).catch(() => {})
                  }
                  aria-label="ฟังเสียงเวอร์ชัน Polished"
                  className="p-1.5 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm text-slate-900 leading-relaxed">
                {evaluation.polishedNativeRewrite}
              </p>
            </div>
          </div>

          {/* Phrase Upgrades */}
          {evaluation.keyUpgrades && evaluation.keyUpgrades.length > 0 && (
            <div className="space-y-3 pt-2">
              <h5 className="text-sm font-semibold text-slate-900">
                จุดปรับสำนวนให้ดูเป็นเจ้าของภาษามากขึ้น
              </h5>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                {evaluation.keyUpgrades.map((up, idx) => (
                  <div key={idx} className="p-4 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="line-through text-slate-400">
                        {up.original}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        →
                      </span>
                      <span className="font-semibold text-blue-800">
                        {up.improved}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {up.explanationThai}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900">สรุปเคล็ดลับ: </span>
            {evaluation.grammarAndToneTipThai}
          </div>
        </div>
      )}
    </div>
  );
}
