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
import { PieChart as PieIcon, TrendingUp, Award } from 'lucide-react';

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

      {/* 2열: 상위 고액 지출 TOP 5 */}
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
