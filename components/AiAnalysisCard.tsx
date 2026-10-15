'use client';

import React, { useState } from 'react';
import { SpendingAnalysisMetrics, ExpenseItem, AiAnalysisResult } from '@/types/expense';
import {
  Sparkles,
  Bot,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign,
  RefreshCw,
  Lightbulb,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';

interface Props {
  metrics: SpendingAnalysisMetrics;
  items: ExpenseItem[];
  apiKey: string;
  onOpenApiKeyModal: () => void;
}

export default function AiAnalysisCard({
  metrics,
  items,
  apiKey,
  onOpenApiKeyModal,
}: Props) {
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cachedFallback, setCachedFallback] = useState<AiAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMockResult, setIsMockResult] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    if (items.length === 0) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          metrics,
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.fallbackData) {
          setCachedFallback(data.fallbackData);
        }
        throw new Error(data.error || 'AI 분석에 실패했습니다.');
      }

      setAnalysisResult(data.data);
      setIsMockResult(Boolean(data.isMock));
      setNoticeMsg(data.notice || null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-violet-50/20 to-indigo-50/30 p-5 shadow-sm dark:border-violet-900/40 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/90 dark:to-violet-950/20 sm:p-6">
      {/* 카드 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4 dark:border-violet-900/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Gemini AI 지출 코칭 리포트
              </h3>
              {analysisResult && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isMockResult
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                }`}>
                  {isMockResult ? '스마트 시뮬레이션 엔진' : 'Gemini 3.8 Flash (생각 깊이: 보통)'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              소비 패턴 진단, 과소비 감지 및 실천 가능한 카테고리별 절약 플랜 (Gemini 3.8 심층 추론 엔진)
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {!apiKey && (
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="text-xs text-violet-600 hover:underline dark:text-violet-400 font-medium"
            >
              + 내 Gemini API 키 등록
            </button>
          )}

          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || items.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Gemini 3.8 분석 생성 중...
              </>
            ) : analysisResult ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                다시 분석하기
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5" />
                Gemini 3.8 AI 분석 시작
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-800 dark:text-rose-200">{errorMsg}</p>
              <p className="mt-0.5 text-[11px] text-rose-600 dark:text-rose-400">
                AI Studio에서 발급받은 키가 맞는지 확인하시거나, 아래 내장 분석 엔진으로 즉시 리포트를 확인하실 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 transition"
            >
              키 다시 설정
            </button>
            <button
              type="button"
              onClick={() => {
                if (cachedFallback) {
                  setAnalysisResult(cachedFallback);
                  setIsMockResult(true);
                  setErrorMsg(null);
                } else {
                  setIsAnalyzing(true);
                  setErrorMsg(null);
                  fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items, metrics, apiKey: '' }),
                  })
                    .then((r) => r.json())
                    .then((d) => {
                      if (d.success) {
                        setAnalysisResult(d.data);
                        setIsMockResult(true);
                      }
                    })
                    .finally(() => setIsAnalyzing(false));
                }
              }}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs text-white font-semibold shadow hover:bg-rose-700 transition"
            >
              내장 분석으로 즉시 보기
            </button>
          </div>
        </div>
      )}

      {/* 분석 전 안내 상태 */}
      {!analysisResult && !isAnalyzing && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
            <Bot className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">
            소비 기록을 분석할 준비가 되었습니다
          </h4>
          <p className="mt-1 mx-auto max-w-md text-xs text-slate-500 dark:text-slate-400">
            상단의 <strong>&apos;Gemini AI 분석 시작&apos;</strong> 버튼을 누르면 AI가 소비 건전성 점수를 매기고,
            낭비 요소를 짚어내며 현실적인 절약 팁을 제안합니다.
          </p>
        </div>
      )}

      {/* 분석 중 로딩 스켈레톤 */}
      {isAnalyzing && (
        <div className="py-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400 animate-bounce">
            <Sparkles className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Gemini AI가 소비 데이터를 정밀 분석하고 있습니다...
          </p>
          <p className="text-xs text-slate-400">
            소비 패턴 추출 → 절약 여력 계산 → 맞춤형 피드백 생성
          </p>
        </div>
      )}

      {/* 분석 완료 결과 화면 */}
      {analysisResult && !isAnalyzing && (
        <div className="mt-5 space-y-5">
          {/* 폴백 알림 배너 */}
          {noticeMsg && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{noticeMsg}</span>
              </div>
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="font-bold underline shrink-0 hover:text-amber-950 ml-auto"
              >
                API 키 다시 설정
              </button>
            </div>
          )}

          {/* 점수 & 총평 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-center rounded-xl bg-white p-4 shadow-sm border border-slate-100 dark:border-slate-800 dark:bg-slate-800/80">
            {/* 점수 게이지 */}
            <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-4 dark:border-slate-700 md:col-span-3">
              <span className="text-[11px] font-semibold text-slate-400">소비 건전성 점수</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-black tracking-tight text-violet-600 dark:text-violet-400">
                  {analysisResult.score}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 100점</span>
              </div>
              <div className="mt-2 h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                  style={{ width: `${analysisResult.score}%` }}
                />
              </div>
            </div>

            {/* 총평 */}
            <div className="md:col-span-9">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                AI 종합 진단
              </h4>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {analysisResult.overview}
              </p>
            </div>
          </div>

          {/* 신용카드 및 결제수단 AI 맞춤 코칭 (NEW) */}
          {analysisResult.creditCardCoaching && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50/60 p-4 shadow-sm dark:border-indigo-900/40 dark:bg-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5 dark:border-indigo-900/30">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    신용카드 &amp; 결제수단 맞춤 진단
                  </h4>
                </div>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  실제 사용 카드 기반 맞춤 분석
                </span>
              </div>

              {/* 총평 */}
              <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysisResult.creditCardCoaching.summary}
              </p>

              {/* 카드별 맞춤 조언 목록 */}
              {analysisResult.creditCardCoaching.cardSpecificAdvice &&
                analysisResult.creditCardCoaching.cardSpecificAdvice.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                      💳 보유 카드별 맞춤 실적·혜택 가이드
                    </span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {analysisResult.creditCardCoaching.cardSpecificAdvice.map((cardAdvice, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-indigo-100 bg-white/90 p-2.5 text-xs shadow-xs dark:border-indigo-900/40 dark:bg-slate-900/90"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                            <span>{cardAdvice.cardName}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                            {cardAdvice.advice}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* 주의사항/팁 */}
              {analysisResult.creditCardCoaching.debtWarningOrTip && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-indigo-100/60 p-2.5 text-[11px] text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-indigo-600 mt-0.5" />
                  <span>{analysisResult.creditCardCoaching.debtWarningOrTip}</span>
                </div>
              )}
            </div>
          )}

          {/* 소비 패턴 진단 카드들 */}
          {analysisResult.patterns && analysisResult.patterns.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                포착된 소비 패턴 및 주의점
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {analysisResult.patterns.map((p, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 text-xs transition ${
                      p.type === 'warning'
                        ? 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20'
                        : p.type === 'positive'
                        ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                        : 'border-blue-200/80 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {p.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                      {p.type === 'positive' && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                      {p.type === 'info' && <Info className="h-3.5 w-3.5 text-blue-600" />}
                      <span className="text-slate-900 dark:text-slate-100">{p.title}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-normal">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리별 절약 추천안 */}
          {analysisResult.savingRecommendations && analysisResult.savingRecommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
                AI 추천 절약 실천 액션
              </h4>
              <div className="space-y-2">
                {analysisResult.savingRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div className="space-y-0.5">
                      <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {rec.category} 절약
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                        {rec.advice}
                      </p>
                    </div>
                    {rec.potentialSaving > 0 && (
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-slate-400 block">월 예상 절약액</span>
                        <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          + 약 {rec.potentialSaving.toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 다음 달 예산 가이드라인 */}
          {analysisResult.budgetAdvice && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-200">
              <span className="font-bold flex items-center gap-1.5 mb-1">
                <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                다음 달 추천 예산 플랜
              </span>
              <p className="leading-relaxed">{analysisResult.budgetAdvice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
