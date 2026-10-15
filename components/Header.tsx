'use client';

import React from 'react';
import { Sparkles, FileSpreadsheet, Key, HelpCircle, BarChart3 } from 'lucide-react';

interface HeaderProps {
  onOpenApiKeyModal: () => void;
  onOpenGuideModal: () => void;
  hasApiKey: boolean;
}

export default function Header({
  onOpenApiKeyModal,
  onOpenGuideModal,
  hasApiKey,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 text-white shadow-md shadow-indigo-500/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                SpendLog<span className="text-indigo-600 dark:text-indigo-400">.ai</span>
              </span>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                소비 기록 분석
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              구글 스프레드시트 & 엑셀 실시간 연동 × Gemini AI 소비 코칭
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 구글 시트 연동 가이드 버튼 */}
          <button
            type="button"
            onClick={onOpenGuideModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <HelpCircle className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">구글 시트 연동법</span>
            <span className="sm:hidden">시트 연동</span>
          </button>

          {/* Gemini API Key 버튼 */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition shadow-sm ${
              hasApiKey
                ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Key className="h-4 w-4 text-violet-500" />
            <span className="hidden sm:inline">
              {hasApiKey ? 'Gemini API 연결됨' : 'Gemini API 설정'}
            </span>
            <span className="sm:hidden">API 키</span>
            {hasApiKey && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
