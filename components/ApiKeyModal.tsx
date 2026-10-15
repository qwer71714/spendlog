'use client';

import React, { useState } from 'react';
import { X, Key, Check, ExternalLink, ShieldCheck, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveApiKey }: Props) {
  const [inputVal, setInputVal] = useState(apiKey);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!inputVal.trim()) {
      setTestResult({ valid: false, message: '테스트할 API 키를 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputVal.trim() }),
      });

      const data = await res.json();
      if (data.valid) {
        setTestResult({
          valid: true,
          message: `정상 연결 확인! (지원 모델: ${data.models?.slice(0, 3).join(', ') || 'Gemini Flash'})`,
        });
      } else {
        setTestResult({
          valid: false,
          message: data.error || 'API 키 검증에 실패했습니다. 키를 다시 확인해주세요.',
        });
      }
    } catch {
      setTestResult({ valid: false, message: '검증 서버와 통신하지 못했습니다.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveApiKey(inputVal.trim());
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setInputVal('');
    onSaveApiKey('');
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <Key className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Gemini AI API 설정 및 테스트
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Google AI Studio에서 발급받은 <strong>Gemini API Key</strong>를 입력하세요. (보통 <code>AIzaSy...</code> 형태로 시작합니다)
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setTestResult(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 font-mono"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting || !inputVal.trim()}
                className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300 transition"
              >
                {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : '연결 테스트'}
              </button>
            </div>
          </div>

          {/* 테스트 결과 표시 */}
          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs border ${
                testResult.valid
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              무료 API 키 발급받기 (Google AI Studio)
              <ExternalLink className="h-3 w-3" />
            </a>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-rose-500 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                키 삭제
              </button>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 flex items-start gap-2 border border-slate-200/50 dark:border-slate-700/50">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
            <div>
              <span>API 키는 사용자 브라우저에만 저장되며 외부 서버에 수집되지 않습니다.</span>
              <p className="mt-1 text-[11px] text-slate-400">
                * 키가 없거나 오류가 나도 '내장 스마트 분석 엔진(Demo)'으로 모든 분석 리포트를 즉시 이용하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            {showSavedMsg ? (
              <>
                <Check className="h-4 w-4" />
                저장 완료!
              </>
            ) : (
              '저장하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
