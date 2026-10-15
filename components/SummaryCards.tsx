'use client';

import React from 'react';
import { SpendingAnalysisMetrics } from '@/types/expense';
import { Wallet, Calendar, PieChart, ArrowUpRight, CreditCard } from 'lucide-react';

interface Props {
  metrics: SpendingAnalysisMetrics;
}

export default function SummaryCards({ metrics }: Props) {
  const topCategory = metrics.categorySummaries[0];
  const pm = metrics.paymentMetrics;
  const topCreditCard = pm?.distinctCreditCards?.[0];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* 1. 총 지출액 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            총 지출 금액
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {metrics.totalAmount.toLocaleString()}
            <span className="ml-1 text-base font-medium text-slate-500">원</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
              총 {metrics.totalCount}건
            </span>
            <span>전체 집계</span>
          </div>
        </div>
      </div>

      {/* 2. 신용카드 총 지출액 (NEW) */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/30 p-5 shadow-sm transition hover:shadow-md dark:border-indigo-900/50 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
            신용카드 사용액
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold tracking-tight text-indigo-950 dark:text-white">
            {(pm?.totalCreditAmount || 0).toLocaleString()}
            <span className="ml-1 text-base font-medium text-slate-500">원</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {pm && pm.totalCreditAmount > 0 ? (
              <>
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                  비중 {pm.creditPercentage}% ({pm.totalCreditCount}건)
                </span>
                {topCreditCard && (
                  <span className="truncate text-slate-500" title={topCreditCard.cardName}>
                    {topCreditCard.cardName}
                  </span>
                )}
              </>
            ) : (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                체크/현금 위주 소비
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. 하루 평균 지출 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            하루 평균 지출
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {metrics.dailyAverage.toLocaleString()}
            <span className="ml-1 text-base font-medium text-slate-500">원/일</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {metrics.startDate && metrics.endDate
              ? `${metrics.startDate.slice(5)} ~ ${metrics.endDate.slice(5)}`
              : '일자 기준 집계'}
          </div>
        </div>
      </div>

      {/* 4. 최대 지출 카테고리 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            최다 지출 카테고리
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400">
            <PieChart className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              {topCategory?.category || '-'}
            </span>
            {topCategory && (
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                {topCategory.percentage}%
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {topCategory
              ? `${topCategory.total.toLocaleString()}원 (${topCategory.count}건)`
              : '데이터 없음'}
          </div>
        </div>
      </div>

      {/* 5. 최고액 단일 지출 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            단일 최고 지출
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {metrics.highestExpense
              ? metrics.highestExpense.amount.toLocaleString()
              : '0'}
            <span className="ml-1 text-base font-medium text-slate-500">원</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            {metrics.highestExpense
              ? `${metrics.highestExpense.item} (${metrics.highestExpense.category})`
              : '내역 없음'}
          </div>
        </div>
      </div>
    </div>
  );
}
