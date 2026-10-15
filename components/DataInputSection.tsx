'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Link2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Calendar,
  Layers,
} from 'lucide-react';
import { parseExcelBuffer, parseCsvText, parseMultiMonthCsvs, getSampleExpenseData } from '@/lib/dataParser';
import { ExpenseItem, RawSheetData, ColumnMappingConfig, SheetTabInfo } from '@/types/expense';

interface Props {
  onDataLoaded: (
    items: ExpenseItem[],
    sourceName: string,
    raw?: RawSheetData,
    mapping?: ColumnMappingConfig
  ) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  currentSource: string;
  onOpenMappingModal: () => void;
  hasRawData: boolean;
}

export default function DataInputSection({
  onDataLoaded,
  isLoading,
  setIsLoading,
  currentSource,
  onOpenMappingModal,
  hasRawData,
}: Props) {
  const [activeTab, setActiveTab] = useState<'sheet' | 'excel' | 'demo'>('sheet');
  const [sheetUrl, setSheetUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [availableTabs, setAvailableTabs] = useState<SheetTabInfo[]>([]);
  const [selectedGid, setSelectedGid] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 엑셀/CSV 파일 파싱
  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAvailableTabs([]);
    setIsLoading(true);

    try {
      const fileName = file.name;
      const buffer = await file.arrayBuffer();

      let parsed: { items: ExpenseItem[]; raw: RawSheetData; mapping: ColumnMappingConfig };
      if (fileName.endsWith('.csv')) {
        const text = new TextDecoder('utf-8').decode(buffer);
        parsed = parseCsvText(text, `파일: ${fileName}`);
      } else {
        parsed = parseExcelBuffer(buffer, `파일: ${fileName}`);
      }

      if (parsed.items.length === 0) {
        setErrorMsg('표준 양식의 날짜/금액 열을 찾지 못했습니다. 아래 [양식 열 매핑 / AI 재인식] 버튼을 눌러 열을 지정해주세요.');
        onDataLoaded([], `파일: ${fileName}`, parsed.raw, parsed.mapping);
        onOpenMappingModal();
      } else {
        setSuccessMsg(`"${fileName}"에서 ${parsed.items.length}건의 지출 내역을 불러왔습니다.`);
        onDataLoaded(parsed.items, `파일: ${fileName}`, parsed.raw, parsed.mapping);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('파일을 파싱하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 2. 구글 스프레드시트 URL 불러오기 (특정 tab 또는 자동)
  const handleFetchSheet = async (targetGid?: string, fetchAllMonths: boolean = false) => {
    if (!sheetUrl.trim()) {
      setErrorMsg('구글 스프레드시트 링크를 입력해주세요.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          targetGid: targetGid || undefined,
          fetchAllMonths,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '스프레드시트를 불러오는 데 실패했습니다.');
      }

      if (data.availableTabs && data.availableTabs.length > 0) {
        setAvailableTabs(data.availableTabs);
      }
      setSelectedGid(data.gid || targetGid || '');

      // 전월 통합 분석인 경우
      if (data.isMultiMonth && data.multiCsvs) {
        const parsedMulti = parseMultiMonthCsvs(data.multiCsvs, data.selectedTabName);
        setSuccessMsg(`${data.selectedTabName}에서 총 ${parsedMulti.items.length}건의 전체 소비 내역을 성공적으로 통합했습니다!`);
        onDataLoaded(parsedMulti.items, `구글 시트: ${data.selectedTabName}`, parsedMulti.raw, parsedMulti.mapping);
        return;
      }

      // 개별 시트 파싱
      const parsed = parseCsvText(data.csvText, `구글 시트: ${data.selectedTabName}`);

      if (parsed.items.length === 0) {
        setErrorMsg(`"${data.selectedTabName}" 시트에서 유효한 지출 행을 찾지 못했습니다. 열 매핑을 확인하거나 다른 월 탭을 선택해주세요.`);
        onDataLoaded([], `구글 시트: ${data.selectedTabName}`, parsed.raw, parsed.mapping);
        onOpenMappingModal();
      } else {
        setSuccessMsg(`"${data.selectedTabName}" 시트에서 총 ${parsed.items.length}건의 소비 내역을 성공적으로 동기화했습니다!`);
        onDataLoaded(parsed.items, `구글 시트: ${data.selectedTabName}`, parsed.raw, parsed.mapping);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '구글 시트를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 샘플 데이터 불러오기
  const handleLoadSample = () => {
    setErrorMsg(null);
    setAvailableTabs([]);
    setIsLoading(true);
    setTimeout(() => {
      const sample = getSampleExpenseData();
      setSuccessMsg('체험용 3월 가계부 샘플 데이터(28건)를 불러왔습니다.');
      onDataLoaded(sample, '샘플 가계부 데이터');
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
      {/* 탭 네비게이션 & 우측 컨트롤 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${activeTab === 'sheet'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            구글 스프레드시트 링크
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${activeTab === 'excel'
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel / CSV 파일 업로드
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${activeTab === 'demo'
                ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            샘플 데모 체험
          </button>
        </div>

        {/* 열 매핑 버튼 & 데이터 소스 표시 */}
        <div className="flex items-center gap-2">
          {hasRawData && (
            <button
              type="button"
              onClick={onOpenMappingModal}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>양식 열 매핑 / AI 재인식</span>
            </button>
          )}

          {currentSource && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="text-slate-800 dark:text-slate-200">{currentSource}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 탭 1: 구글 스프레드시트 링크 */}
      {activeTab === 'sheet' && (
        <div className="mt-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              월별 캘린더나 여러 시트 탭(10월, 9월, 8월, 7월...)이 있는 스프레드시트 링크를 입력하면 자동으로 탭 목록을 감지하여 월별로 선택해 분석할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchSheet()}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={() => handleFetchSheet()}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  동기화 중...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  시트 탭 목록 &amp; 데이터 불러오기
                </>
              )}
            </button>
          </div>

          {/* 발견된 월별 탭(시트) 선택기 */}
          {availableTabs.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-900/30 dark:bg-indigo-950/20 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>스프레드시트 내 월별 시트 탭 ({availableTabs.length}개 발견)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchSheet(undefined, true)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-sm ${selectedGid === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300'
                    }`}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>🌐 전월 통합 분석 (7~10월 전체)</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {availableTabs.map((tab) => {
                  const isSelected = selectedGid === tab.gid;
                  const isMonthly = /월/.test(tab.name);
                  return (
                    <button
                      key={tab.gid}
                      type="button"
                      onClick={() => handleFetchSheet(tab.gid)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isMonthly
                            ? 'border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100/70 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-200'
                            : 'border border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
                        }`}
                    >
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 탭 2: 엑셀 파일 업로드 */}
      {activeTab === 'excel' && (
        <div className="mt-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer dark:border-slate-700 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-950/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 mb-3 shadow-inner">
              <Upload className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              엑셀(.xlsx) 또는 CSV 파일을 이곳에 드래그하거나 클릭하세요
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              카드사 명세서, 가계부 템플릿, 은행 거래내역 등 어떤 양식이라도 스마트 인식합니다
            </p>
          </div>
        </div>
      )}

      {/* 탭 3: 샘플 데모 체험 */}
      {activeTab === 'demo' && (
        <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50/50 p-6 text-center dark:border-violet-900/30 dark:bg-violet-950/20">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/60 dark:text-violet-300 mb-3">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            아직 준비된 엑셀이나 구글 시트가 없으신가요?
          </h4>
          <p className="mt-1 max-w-md text-xs text-slate-600 dark:text-slate-300">
            실제 한 달 동안 발생한 28건의 식비, 쇼핑, 카페, 공과금 지출 데이터가 담긴 샘플 가계부를 원클릭으로 불러와 모든 시각화 차트와 AI 분석을 바로 경험해보세요!
          </p>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isLoading}
            className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:bg-violet-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            샘플 가계부로 즉시 시각화하기
          </button>
        </div>
      )}

      {/* 피드백 메시지 */}
      {errorMsg && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          {hasRawData && (
            <button
              type="button"
              onClick={onOpenMappingModal}
              className="ml-2 font-bold underline hover:text-rose-900"
            >
              열 매핑 열기
            </button>
          )}
        </div>
      )}
      {successMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
