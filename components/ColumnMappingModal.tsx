'use client';

import React, { useState } from 'react';
import { RawSheetData, ColumnMappingConfig, ExpenseItem } from '@/types/expense';
import { parseTableWithMapping } from '@/lib/dataParser';
import {
  X,
  Sparkles,
  Columns,
  CheckCircle2,
  Table,
  RefreshCw,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  rawSheet: RawSheetData | null;
  currentMapping: ColumnMappingConfig | null;
  onApplyMapping: (items: ExpenseItem[], newMapping: ColumnMappingConfig) => void;
  apiKey?: string;
}

export default function ColumnMappingModal({
  isOpen,
  onClose,
  rawSheet,
  currentMapping,
  onApplyMapping,
  apiKey,
}: Props) {
  const [mapping, setMapping] = useState<ColumnMappingConfig>(
    currentMapping || {
      dateCol: '',
      amountCol: '',
      itemCol: '',
      categoryCol: '',
      paymentCol: '',
      autoCategorizeWithAi: true,
    }
  );

  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  if (!isOpen || !rawSheet) return null;

  const { headers, rows, headerRowIndex, fileNameOrSource } = rawSheet;
  const previewRows = rows.slice(headerRowIndex + 1, headerRowIndex + 4);

  // Gemini AI에게 열 매핑 재분석 요청
  const handleAiAutoDetect = async () => {
    setIsAiAnalyzing(true);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/ai-map-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers,
          sampleRows: rows.slice(headerRowIndex + 1, headerRowIndex + 6),
          apiKey: apiKey || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.mapping) {
        setMapping((prev) => ({
          ...prev,
          dateCol: data.mapping.dateCol || prev.dateCol,
          amountCol: data.mapping.amountCol || prev.amountCol,
          itemCol: data.mapping.itemCol || prev.itemCol,
          categoryCol: data.mapping.categoryCol ?? prev.categoryCol,
          paymentCol: data.mapping.paymentCol ?? prev.paymentCol,
        }));
        setAiExplanation(data.explanation || 'AI가 파일의 구조를 분석하여 최적의 열을 찾았습니다.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!mapping.dateCol || !mapping.amountCol) {
      alert('날짜 열과 금액 열은 필수 선택 항목입니다.');
      return;
    }

    const newItems = parseTableWithMapping(rawSheet, mapping);
    if (newItems.length === 0) {
      alert('선택한 열로 유효한 지출 데이터를 추출하지 못했습니다. 열 선택을 다시 확인해주세요.');
      return;
    }

    onApplyMapping(newItems, mapping);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Columns className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                스마트 열(컬럼) 매핑 설정
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                양식이 다른 엑셀/구글 시트도 원하는 열을 지정하면 AI가 완벽히 분석 및 시각화합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 모달 바디 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* AI 자동 감지 바 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3.5 dark:border-violet-900/40 dark:bg-violet-950/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900 dark:text-violet-200">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Gemini AI 양식 자동 인식
              </div>
              <p className="text-[11px] text-violet-700 dark:text-violet-300">
                현재 데이터 소스: <strong className="font-semibold">{fileNameOrSource}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleAiAutoDetect}
              disabled={isAiAnalyzing}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
            >
              {isAiAnalyzing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI에게 열 자동 지정 맡기기
                </>
              )}
            </button>
          </div>

          {aiExplanation && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>{aiExplanation}</span>
            </div>
          )}

          {/* 컬럼 매핑 드롭다운 그리드 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1. 날짜 열 (필수) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                날짜 열 <span className="text-rose-500">*필수</span>
              </label>
              <select
                value={mapping.dateCol}
                onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- 날짜 열 선택 --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 지출 금액 열 (필수) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                지출 금액 열 <span className="text-rose-500">*필수</span>
                <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                  (입출 분리 시 '출금' 열)
                </span>
              </label>
              <select
                value={mapping.amountCol}
                onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- 금액 열 선택 --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. 항목/사용처 열 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                사용처 / 가맹점 / 내용 열
              </label>
              <select
                value={mapping.itemCol}
                onChange={(e) => setMapping({ ...mapping, itemCol: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- 항목 열 선택 --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. 카테고리 열 (선택) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                카테고리 / 업종 열 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <select
                value={mapping.categoryCol || ''}
                onChange={(e) => setMapping({ ...mapping, categoryCol: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- 없음 (내용으로 AI 자동 유추) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. 결제수단 열 (선택) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                결제수단 / 카드 / 적요 열 <span className="text-slate-400 font-normal">(선택)</span>
                <span className="text-[11px] font-normal text-indigo-500 ml-1.5">
                  (신용카드/체크카드/적요 등)
                </span>
              </label>
              <select
                value={mapping.paymentCol || ''}
                onChange={(e) => setMapping({ ...mapping, paymentCol: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- 기본값 (자동 인식) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. AI 자동 카테고리화 옵션 */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="autoCat"
                checked={mapping.autoCategorizeWithAi}
                onChange={(e) =>
                  setMapping({ ...mapping, autoCategorizeWithAi: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoCat" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                카테고리가 비어있거나 없으면 사용처로 자동 유추
              </label>
            </div>
          </div>

          {/* 원본 데이터 미리보기 */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Table className="h-4 w-4 text-slate-500" />
              업로드된 원본 데이터 미리보기 (상위 행)
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/40">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                    {headers.map((h) => {
                      const isDate = h === mapping.dateCol;
                      const isAmount = h === mapping.amountCol;
                      const isItem = h === mapping.itemCol;
                      return (
                        <th
                          key={h}
                          className={`py-1.5 px-2 font-semibold whitespace-nowrap ${
                            isDate
                              ? 'text-indigo-600 bg-indigo-50/80 rounded dark:bg-indigo-950'
                              : isAmount
                              ? 'text-emerald-600 bg-emerald-50/80 rounded dark:bg-emerald-950'
                              : isItem
                              ? 'text-violet-600 bg-violet-50/80 rounded dark:bg-violet-950'
                              : ''
                          }`}
                        >
                          {h}
                          {isDate && ' (날짜)'}
                          {isAmount && ' (금액)'}
                          {isItem && ' (항목)'}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((r, rIdx) => (
                    <tr key={rIdx}>
                      {headers.map((_, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap max-w-[150px] truncate">
                          {String(r[cIdx] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            헤더 행 위치: {headerRowIndex + 1}번째 행 감지됨
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              이 설정으로 시각화 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
