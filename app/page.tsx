'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import DataInputSection from '@/components/DataInputSection';
import SummaryCards from '@/components/SummaryCards';
import ExpenseCharts from '@/components/ExpenseCharts';
import AiAnalysisCard from '@/components/AiAnalysisCard';
import ExpenseTable from '@/components/ExpenseTable';
import ApiKeyModal from '@/components/ApiKeyModal';
import GoogleSheetGuideModal from '@/components/GoogleSheetGuideModal';
import ColumnMappingModal from '@/components/ColumnMappingModal';
import { ExpenseItem, RawSheetData, ColumnMappingConfig } from '@/types/expense';
import { calculateMetrics, getSampleExpenseData, parseCsvText } from '@/lib/dataParser';
import { Sparkles, FileSpreadsheet, ArrowRight, ShieldCheck, Zap, SlidersHorizontal } from 'lucide-react';

export default function Home() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [sourceName, setSourceName] = useState<string>('샘플 가계부 데이터 (데모)');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  // 현재 로드된 시트 원본 및 매핑 설정
  const [rawSheet, setRawSheet] = useState<RawSheetData | null>(null);
  const [currentMapping, setCurrentMapping] = useState<ColumnMappingConfig | null>(null);

  // 초기 로드 시 localStorage에서 API 키 로드 및 기본 샘플 데이터 표시
  useEffect(() => {
    const savedKey = localStorage.getItem('spendlog_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }

    // 기본 샘플 소비 데이터로 안전하게 초기화
    const sample = getSampleExpenseData();
    setItems(sample);
    setSourceName('데모 샘플 데이터');
    setIsLoading(false);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('spendlog_gemini_api_key', key);
    } else {
      localStorage.removeItem('spendlog_gemini_api_key');
    }
  };

  const handleDataLoaded = (
    newItems: ExpenseItem[],
    source: string,
    raw?: RawSheetData,
    mapping?: ColumnMappingConfig
  ) => {
    setItems(newItems);
    setSourceName(source);
    if (raw) setRawSheet(raw);
    if (mapping) setCurrentMapping(mapping);
  };

  const handleApplyMapping = (newItems: ExpenseItem[], newMapping: ColumnMappingConfig) => {
    setItems(newItems);
    setCurrentMapping(newMapping);
  };

  const metrics = useMemo(() => calculateMetrics(items), [items]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        hasApiKey={Boolean(apiKey)}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* 상단 인트로 배너 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-violet-950 p-6 sm:p-8 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              <span>월별 다중 시트 자동 인식 × Gemini 3.8 Flash (생각 깊이: 보통)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              10월, 9월, 8월, 7월... 어떤 월별 시트든,
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-300 bg-clip-text text-transparent">
                Gemini 3.8 AI가 정밀 분석하고 시각화
              </span>
              합니다.
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              캘린더 달력이나 다양한 월별 가계부 탭이 있어도 AI가 원하는 월의 지출 시트를 자동으로 읽어옵니다.
              <strong> Gemini 3.8 모델</strong>과 <strong>보통(Moderate) 생각 깊이</strong>를 통해 깊이 있는 소비 습관 진단과 맞춤형 절약 리포트를 제공합니다.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
                <span>스마트 다중 양식 &amp; 열 매핑 지원</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>AI 소비 패턴 &amp; 절약 코칭</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>카테고리 자동 유추 &amp; 안전 처리</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. 데이터 소스 업로드/연동 섹션 */}
        <section>
          <DataInputSection
            onDataLoaded={handleDataLoaded}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            currentSource={sourceName}
            onOpenMappingModal={() => setIsMappingModalOpen(true)}
            hasRawData={Boolean(rawSheet)}
          />
        </section>

        {/* 2. 핵심 지표 요약 카드 */}
        <section>
          <SummaryCards metrics={metrics} />
        </section>

        {/* 3. Gemini AI 정밀 분석 카드 */}
        <section>
          <AiAnalysisCard
            metrics={metrics}
            items={items}
            apiKey={apiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        </section>

        {/* 4. 시각화 차트 대시보드 */}
        <section>
          <ExpenseCharts metrics={metrics} items={items} />
        </section>

        {/* 5. 상세 거래 내역 테이블 */}
        <section>
          <ExpenseTable items={items} />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">SpendLog.ai</span>
            <span>—</span>
            <span>다양한 양식의 구글 스프레드시트 및 엑셀 연동 소비 기록 분석</span>
          </div>
          <div>Powered by Google Sheets &amp; Google Gemini AI</div>
        </div>
      </footer>

      {/* 모달 창들 */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <GoogleSheetGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onApplyDemoSheetUrl={() => { }}
      />

      <ColumnMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        rawSheet={rawSheet}
        currentMapping={currentMapping}
        onApplyMapping={handleApplyMapping}
        apiKey={apiKey}
      />
    </div>
  );
}
