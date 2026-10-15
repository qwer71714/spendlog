'use client';

import React, { useState, useMemo } from 'react';
import { ExpenseItem } from '@/types/expense';
import { Search, Filter, Download, ArrowUpDown, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { classifyPaymentMethod } from '@/lib/cardUtils';
import * as XLSX from 'xlsx';

interface Props {
  items: ExpenseItem[];
}

export default function ExpenseTable({ items }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // 전체 카테고리 목록 추출
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [items]);

  // 전체 결제수단 및 카드 목록 추출
  const paymentOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.paymentMethod) set.add(item.paymentMethod);
    });
    return Array.from(set);
  }, [items]);

  // 필터링 및 정렬
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory =
          selectedCategory === 'ALL' || item.category === selectedCategory;

        let matchesPayment = true;
        if (selectedPayment === 'CREDIT_ONLY') {
          const c = classifyPaymentMethod(item.paymentMethod || '', item.item, item.notes);
          matchesPayment = c.isCreditCard;
        } else if (selectedPayment !== 'ALL') {
          matchesPayment = item.paymentMethod === selectedPayment;
        }

        return matchesSearch && matchesCategory && matchesPayment;
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          return sortOrder === 'desc'
            ? b.date.localeCompare(a.date)
            : a.date.localeCompare(b.date);
        } else {
          return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        }
      });
  }, [items, searchTerm, selectedCategory, selectedPayment, sortField, sortOrder]);

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // 엑셀 다운로드
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item, idx) => ({
      번호: idx + 1,
      날짜: item.date,
      항목명: item.item,
      금액: item.amount,
      카테고리: item.category,
      결제수단: item.paymentMethod || '카드',
      메모: item.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '소비기록');
    XLSX.writeFile(workbook, `SpendLog_소비기록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
      {/* 테이블 컨트롤 헤더 */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            상세 소비 내역 목록
          </h3>
          <p className="text-xs text-slate-400">
            총 {filteredItems.length}건 / {items.length}건
          </p>
        </div>

        {/* 검색 & 필터 & 다운로드 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 검색창 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="항목 또는 메모 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* 카테고리 필터 */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="ALL">모든 카테고리</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 결제수단 / 카드 필터 */}
          <div className="relative">
            <select
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="ALL">모든 결제수단</option>
              <option value="CREDIT_ONLY">💳 신용카드 전체</option>
              {paymentOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 신용카드만 보기 퀵 버튼 */}
          <button
            type="button"
            onClick={() => {
              setSelectedPayment((prev) => (prev === 'CREDIT_ONLY' ? 'ALL' : 'CREDIT_ONLY'));
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
              selectedPayment === 'CREDIT_ONLY'
                ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                : 'border border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>신용카드만</span>
          </button>

          {/* 엑셀 다운로드 버튼 */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="현재 내역을 엑셀(.xlsx) 파일로 내보내기"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">엑셀 다운로드</span>
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/60 text-slate-400 dark:border-slate-700/60">
              <th
                onClick={() => toggleSort('date')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  날짜
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold">항목명 / 사용처</th>
              <th className="py-3 px-3 font-semibold">카테고리</th>
              <th
                onClick={() => toggleSort('amount')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  지출금액
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold hidden md:table-cell">결제수단 / 카드</th>
              <th className="py-3 px-3 font-semibold hidden sm:table-cell">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  조건에 일치하는 소비 내역이 없습니다.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {item.date}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate">
                    {item.item}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {item.amount.toLocaleString()}원
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell whitespace-nowrap">
                    {(() => {
                      const info = classifyPaymentMethod(item.paymentMethod || '', item.item, item.notes);
                      if (info.isCreditCard) {
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: info.color || '#6366F1' }}
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>{item.paymentMethod || '신용카드'}</span>
                          </span>
                        );
                      }
                      if (info.type === 'debit') {
                        return (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                            {item.paymentMethod || '체크카드'}
                          </span>
                        );
                      }
                      if (info.type === 'transfer') {
                        return (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                            {item.paymentMethod || '계좌이체'}
                          </span>
                        );
                      }
                      if (info.type === 'cash') {
                        return (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                            {item.paymentMethod || '현금'}
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {item.paymentMethod || '기타'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3 text-slate-400 max-w-[150px] truncate hidden sm:table-cell">
                    {item.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 컨트롤 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            페이지 {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
