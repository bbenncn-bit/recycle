type LoadStage = 'idle' | 'shell' | 'core' | 'full';

function resolveMessage(stage: LoadStage, provisional?: boolean): string {
  if (stage === 'idle') return '正在连接并准备利润数据…';
  if (provisional || stage === 'shell') {
    return '正在逐单核算材料成本与利润，图表与明细稍后更新…';
  }
  if (stage === 'core') return '正在加载成品对比分析…';
  return '正在加载…';
}

/** 利润分析页加载中的弱提示：顶部细进度条 + 底部浮动文案 */
export function ProfitAnalysisLoadingHint({
  stage,
  provisional,
}: {
  stage: LoadStage;
  provisional?: boolean;
}) {
  const visible = stage !== 'full' || !!provisional;
  if (!visible) return null;

  const message = resolveMessage(stage, provisional);

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
        className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 pointer-events-none max-w-[min(92vw,28rem)]"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-full border border-gray-200/70 bg-white/88 px-3.5 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm dark:border-gray-600/60 dark:bg-gray-900/88 dark:text-gray-300">
          <span
            className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-gray-300 border-t-blue-500 dark:border-gray-600 dark:border-t-blue-400"
            aria-hidden
          />
          <span className="leading-snug">{message}</span>
        </div>
      </div>
    </>
  );
}

/** 图表区域在粗算阶段的弱遮罩 */
export function ProfitChartLoadingVeil({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex items-start justify-center pt-3 pointer-events-none"
      aria-hidden
    >
      <span className="rounded-full border border-gray-200/80 bg-white/75 px-2.5 py-0.5 text-[11px] text-gray-500 backdrop-blur-[2px] dark:border-gray-600/70 dark:bg-gray-900/75 dark:text-gray-400">
        利润数据精确计算中
      </span>
    </div>
  );
}
