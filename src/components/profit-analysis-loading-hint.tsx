'use client';

import { useEffect, useState } from 'react';

type LoadStage = 'idle' | 'shell' | 'core' | 'full';

/** 动态省略号（0～3 个点循环） */
export function AnimatedEllipsis({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 450);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={className} aria-hidden>
      {'.'.repeat(step)}
    </span>
  );
}

function resolveMessage(
  stage: LoadStage,
  provisional?: boolean,
  focusMonthLabel?: string
): string {
  const monthHint = focusMonthLabel ? `，完成后默认展示${focusMonthLabel}` : '，完成后默认展示最近月份';
  if (stage === 'idle') return '正在连接并准备利润数据';
  if (provisional || stage === 'shell') {
    return `正在全量核算材料成本（LIFO）${monthHint}`;
  }
  if (stage === 'core') return '精确数据已就绪，正在加载成品对比分析';
  return '正在加载';
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `已等待 ${seconds} 秒`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `已等待 ${m} 分 ${s} 秒`;
}

/** 利润分析页加载中的弱提示：顶部细进度条 + 底部浮动文案 */
export function ProfitAnalysisLoadingHint({
  stage,
  provisional,
  focusMonthLabel,
  loadStartedAt,
}: {
  stage: LoadStage;
  provisional?: boolean;
  /** 如「6月」，用于说明默认展示哪个月 */
  focusMonthLabel?: string;
  loadStartedAt?: number;
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const visible = stage !== 'full' || !!provisional;

  useEffect(() => {
    if (!visible || !loadStartedAt) return;
    const tick = () => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - loadStartedAt) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, loadStartedAt]);

  if (!visible) return null;

  const message = resolveMessage(stage, provisional, focusMonthLabel);

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-[2px] overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div className="h-full w-full bg-blue-400/20 dark:bg-blue-500/15">
          <div className="profit-analysis-load-bar h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent dark:via-blue-400/50" />
        </div>
      </div>
      <div
        className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 pointer-events-none max-w-[min(92vw,32rem)]"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-0.5 rounded-full border border-gray-200/70 bg-white/88 px-3.5 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-600/60 dark:bg-gray-900/88 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400"
              aria-hidden
            />
            <span className="leading-snug">
              {message}
              <AnimatedEllipsis />
            </span>
          </div>
          {loadStartedAt != null && elapsedSec >= 3 && (
            <span className="pl-5 text-[10px] text-gray-400 dark:text-gray-500">
              {formatElapsed(elapsedSec)}（全量 LIFO 核算约需 20～40 秒，请稍候）
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/** 图表区域在粗算阶段的弱遮罩 */
export function ProfitChartLoadingVeil({ show, label }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex items-start justify-center pt-3 pointer-events-none"
      aria-hidden
    >
      <span className="rounded-full border border-gray-200/80 bg-white/75 px-2.5 py-0.5 text-[11px] text-gray-500 backdrop-blur-[2px] dark:border-gray-600/70 dark:bg-gray-900/75 dark:text-gray-400">
        {label ?? '利润数据精确计算中'}
        <AnimatedEllipsis />
      </span>
    </div>
  );
}

/** 表格空态：全量核算中的行内提示 */
export function ProfitTableComputingHint({
  monthLabel,
}: {
  monthLabel?: string;
}) {
  return (
    <span className="inline-flex items-center justify-center gap-0.5 text-sm text-gray-500 dark:text-gray-400">
      {monthLabel
        ? `正在全量核算销售明细（LIFO），${monthLabel}将优先展示`
        : '正在全量核算销售明细（LIFO），最近月份将优先展示'}
      <AnimatedEllipsis />
    </span>
  );
}
