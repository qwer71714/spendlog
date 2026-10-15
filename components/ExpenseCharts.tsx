'use client';

import React, { useState, useEffect } from 'react';
import { SpendingAnalysisMetrics, ExpenseItem } from '@/types/expense';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { PieChart as PieIcon, TrendingUp, Award, CreditCard, Wallet, Percent, ShieldCheck } from 'lucide-react';

interface Props {
  metrics: SpendingAnalysisMetrics;
  items: ExpenseItem[];
}

export default function ExpenseCharts({ metrics, items }: Props) {
  const [mounted, setMounted] = useState(false);
  const [trendType, setTrendType] = useState<'bar' | 'area'>('area');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || metrics.totalAmount === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900/90">
        시각화할 소비 데이터가 없습니다.
      </div>
    );
  }

  // 상위 지출 TOP 5 아이템
  const top5Items = [...items]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // 일자별 차트 데이터 포맷팅 (MM/DD)
  const chartDailyData = metrics.dailyTrends.map((d) => ({
    displayDate: d.date.length >= 10 ? d.date.slice(5) : d.date,
    amount: d.amount,
    count: d.count,
  }));

  // 도넛 차트 커스텀 툴팁
  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { category: string; total: number; percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{data.category}</p>
          <p className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {data.total.toLocaleString()}원
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            전체의 {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // 추이 차트 커스텀 툴팁
  const CustomTrendTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { count: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          <p className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {payload[0].value.toLocaleString()}원
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            지출 건수: {payload[0].payload.count}건
          </p>
        </div>
      );
    }
    return null;
  };

  // 결제수단 커스텀 툴팁
  const CustomPaymentTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { name: string; total: number; percentage: number; count: number } }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{data.name}</p>
          <p className="mt-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {data.total.toLocaleString()}원
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            건수: {data.count}건 ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const pm = metrics.paymentMetrics;

  return (
    <div className="space-y-6">
      {/* 1열: 카테고리 도넛 차트 & 일자별 지출 추이 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 카테고리별 비중 도넛 차트 (5 cols) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                카테고리별 지출 비중
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              총 {metrics.categorySummaries.length}개 분류
            </span>
          </div>

          <div className="relative mt-2 flex h-56 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.categorySummaries}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {metrics.categorySummaries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-medium text-slate-400">총 지출</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {(Math.round(metrics.totalAmount / 10000)).toLocaleString()}만원
              </span>
            </div>
          </div>

          {/* 카테고리 리스트 */}
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
            {metrics.categorySummaries.map((cat, idx) => (
              <div
                key={`${cat.category}-${idx}`}
                className="flex items-center justify-between text-xs rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cat.category}
                  </span>
                  <span className="text-slate-400">({cat.count}건)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {cat.total.toLocaleString()}원
                  </span>
                  <span className="w-10 text-right font-medium text-slate-500">
                    {cat.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 일자별 지출 추이 차트 (7 cols) */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                일자별 지출 추이
              </h3>
            </div>
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setTrendType('area')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  trendType === 'area'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                영역 차트
              </button>
              <button
                type="button"
                onClick={() => setTrendType('bar')}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  trendType === 'bar'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                막대 차트
              </button>
            </div>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {trendType === 'area' ? (
                <AreaChart
                  data={chartDailyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${Math.round(val / 10000)}만`}
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={chartDailyData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${Math.round(val / 10000)}만`}
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2열: 결제수단 및 신용카드 정밀 분석 (NEW) */}
      {pm && (pm.methodSummaries.length > 0 || pm.distinctCreditCards.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 1) 결제수단별 지출 비중 도넛 차트 (5 cols) */}
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  결제수단별 지출 비중
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                신용 vs 체크 vs 이체
              </span>
            </div>

            <div className="relative mt-2 flex h-52 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pm.methodSummaries}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {pm.methodSummaries.map((entry, index) => (
                      <Cell key={`pm-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPaymentTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium text-slate-400">신용카드 비중</span>
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {pm.creditPercentage}%
                </span>
              </div>
            </div>

            {/* 결제수단 범례 리스트 */}
            <div className="mt-2 space-y-2">
              {pm.methodSummaries.map((method, idx) => (
                <div
                  key={`${method.name}-${idx}`}
                  className="flex items-center justify-between rounded-lg p-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: method.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {method.name}
                    </span>
                    <span className="text-slate-400">({method.count}건)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {method.total.toLocaleString()}원
                    </span>
                    <span className="w-10 text-right font-medium text-slate-500">
                      {method.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2) 신용카드별 실 사용 현황 및 카드사 분석 (7 cols) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    보유 카드사 및 신용카드별 지출 현황
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    신용 총 {pm.totalCreditCount}건 · {pm.totalCreditAmount.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 신용카드별 상세 카드 목록 */}
              <div className="mt-4 space-y-3">
                {pm.distinctCreditCards.length > 0 ? (
                  pm.distinctCreditCards.map((card, idx) => (
                    <div
                      key={`${card.cardName}-${idx}`}
                      className="rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50/70 to-indigo-50/30 p-3.5 transition hover:border-indigo-300 dark:border-slate-800 dark:from-slate-800/40 dark:to-indigo-950/20"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: card.color || '#6366F1' }}
                          >
                            {card.cardCompany}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {card.cardName}
                          </span>
                          <span className="text-[11px] text-slate-400">({card.count}건)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            {card.total.toLocaleString()}원
                          </span>
                          <span className="ml-1.5 text-[11px] font-medium text-slate-500">
                            (신용 지출의 {card.percentageOfCredit}%)
                          </span>
                        </div>
                      </div>

                      {/* 비율 프로그레스 바 */}
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(5, card.percentageOfCredit))}%`,
                            backgroundColor: card.color || '#6366F1',
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 text-center dark:border-slate-800">
                    <ShieldCheck className="h-8 w-8 text-emerald-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      신용카드 사용 내역이 없습니다
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      체크카드 및 계좌이체 위주의 소비로 결제일 부채 위험이 전혀 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 하단: 체크카드 vs 신용카드 소비 황금 비율 바 */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/50">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  체크카드 {pm.debitPercentage}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  신용카드 {pm.creditPercentage}%
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pm.debitPercentage}%` }}
                  title={`체크카드 ${pm.debitPercentage}%`}
                />
                <div
                  className="bg-indigo-600 transition-all duration-500"
                  style={{ width: `${pm.creditPercentage}%` }}
                  title={`신용카드 ${pm.creditPercentage}%`}
                />
                <div
                  className="bg-slate-400 transition-all duration-500 flex-1"
                  title="기타 결제"
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400 leading-tight">
                💡 <strong>소득공제 팁</strong>: 총 급여의 25%까지는 혜택이 좋은 신용카드를 쓰고, 초과분은 공제율이 2배 높은 체크카드(30%)를 쓰는 것이 가장 이상적입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3열: 상위 고액 지출 TOP 5 */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              상위 단일 지출 TOP 5
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            가장 큰 지출 항목 분석
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {top5Items.map((item, idx) => {
            const pct = Math.round((item.amount / metrics.totalAmount) * 100);
            return (
              <div
                key={item.id}
                className="relative flex flex-col justify-between rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-700"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {idx + 1}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    {item.category}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="truncate text-xs font-semibold text-slate-900 dark:text-white" title={item.item}>
                    {item.item}
                  </h4>
                  <div className="mt-1 text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                    {item.amount.toLocaleString()}
                    <span className="text-xs font-normal text-slate-500">원</span>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200/60 pt-2 text-[11px] text-slate-400 flex items-center justify-between dark:border-slate-700/60">
                  <span>{item.date}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">전체의 {pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
