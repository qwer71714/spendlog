'use client';

import React from 'react';
import { X, CheckCircle2, ExternalLink, Copy, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyDemoSheetUrl: (url: string) => void;
}

export default function GoogleSheetGuideModal({ isOpen, onClose, onApplyDemoSheetUrl }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 font-bold text-sm">
              G
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              구글 스프레드시트 1분 연동 가이드
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              구글 시트 공유 권한 설정 (핵심 2단계)
            </h4>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>
                사용할 구글 스프레드시트 화면 우측 상단의 <strong>[공유]</strong> 버튼을 누릅니다.
              </li>
              <li>
                <strong>일반 액세스</strong> 항목을 <span className="font-semibold text-emerald-600 dark:text-emerald-400">"링크가 있는 모든 사용자"</span> (뷰어)로 변경합니다.
              </li>
              <li>
                <strong>[링크 복사]</strong>를 누른 후 SpendLog에 붙여넣기만 하면 실시간 시각화가 완료됩니다!
              </li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
              권장 스프레드시트 컬럼 (열 제목)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              첫 번째 행(1행)에 아래 열 제목이 포함되어 있으면 한글/영문 모두 자동으로 스마트 인식합니다:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 bg-white dark:bg-slate-800">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">필수 열:</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  • <strong>날짜</strong> (또는 일자, Date)<br />
                  • <strong>금액</strong> (또는 지출금액, Amount)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 bg-white dark:bg-slate-800">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">권장/선택 열:</span>
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  • <strong>내용</strong> (사용처, 가맹점, 항목)<br />
                  • <strong>카테고리</strong> (비어있으면 자동 유추)<br />
                  • <strong>결제수단</strong> (카드, 현금 등)
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong>별도 API 키나 OAuth 로그인 불필요!</strong>
                <p className="mt-0.5">
                  링크 보기 권한만 열어두시면 복잡한 구글 콘솔 승인 없이도 안전하고 빠르게 데이터를 가져와 차트를 그립니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
