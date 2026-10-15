import * as XLSX from 'xlsx';
import {
  ExpenseItem,
  SpendingAnalysisMetrics,
  CategorySummary,
  DailySummary,
  RawSheetData,
  ColumnMappingConfig,
} from '@/types/expense';
import { calculatePaymentMetrics } from '@/lib/cardUtils';

export const CATEGORY_COLORS: Record<string, string> = {
  '식비': '#F59E0B',
  '카페/간식': '#EC4899',
  '쇼핑': '#8B5CF6',
  '교통비': '#3B82F6',
  '주거/통신': '#10B981',
  '문화/여가': '#06B6D4',
  '의료/건강': '#EF4444',
  '생활/마트': '#14B8A6',
  '교육': '#F97316',
  '금융/보험': '#6366F1',
  '기타': '#64748B',
};

// 키워드로 카테고리 자동 유추
export function inferCategory(item: string): string {
  const lower = item.toLowerCase();
  if (/스타벅스|카페|커피|투썸|이디야|메가커피|컴포즈|베이커리|빵집|디저트|공차|파리바게|뚜레쥬르/.test(lower)) return '카페/간식';
  if (/식당|밥|김밥|국밥|치킨|피자|배민|배달의민족|쿠팡이츠|요기요|버거킹|맥도날드|식사|점심|저녁|초밥|고기|라면|한식|중식|일식|분식/.test(lower)) return '식비';
  if (/지하철|버스|택시|카카오t|주유|gs칼텍스|sk에너지|s-oil|현대오일|하이패스|교통카드|기차|ktx|srt|티머니/.test(lower)) return '교통비';
  if (/쿠팡|네이버페이|스마트스토어|무신사|올리브영|다이소|옷|자라|유니클로|신발|쇼핑|지그재그|에이블리|백화점|아울렛/.test(lower)) return '쇼핑';
  if (/월세|관리비|한전|전기요금|가스비|수도세|통신비|skt|kt|lgu\+|인터넷|청약|도시가스/.test(lower)) return '주거/통신';
  if (/넷플릭스|유튜브|디즈니|영화|cgv|메가박스|롯데시네마|멜론|스포티파이|도서|교보문고|예스24|헬스|필라테스|전시|공연|골프|피트니스/.test(lower)) return '문화/여가';
  if (/병원|약국|치과|안과|이비인후과|내과|한의원|건강검진|영양제|정형외과|피부과/.test(lower)) return '의료/건강';
  if (/이마트|홈플러스|롯데마트|gs25|cu|세븐일레븐|편의점|마켓컬리|코스트코|트레이더스|슈퍼/.test(lower)) return '생활/마트';
  if (/학원|인강|클래스|도서관|수강료|교재|시험/.test(lower)) return '교육';
  if (/보험|적금|예금|이자|증권|투자|카드연회비/.test(lower)) return '금융/보험';
  return '기타';
}

// 엑셀 일련번호 및 다양한 날짜 문자열 정규화 (YYYY-MM-DD)
export function normalizeDate(dateVal: unknown): string {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return new Date().toISOString().split('T')[0];
  }

  // 1. JS Date 객체
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return new Date().toISOString().split('T')[0];
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. 엑셀 숫자 시리얼 (예: 45351)
  if (typeof dateVal === 'number' && dateVal > 25000 && dateVal < 70000) {
    const jsDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(dateVal).trim();

  // 3. 2026.03.15, 2026-03-15, 2026/03/15
  const matches = str.match(/(\d{4})[-./년]\s*(\d{1,2})[-./월]\s*(\d{1,2})/);
  if (matches) {
    const y = matches[1];
    const m = matches[2].padStart(2, '0');
    const d = matches[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. 2-digit 연도: 26.03.15, 26-3-15
  const shortYearMatches = str.match(/^(\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  if (shortYearMatches) {
    const y = `20${shortYearMatches[1]}`;
    const m = shortYearMatches[2].padStart(2, '0');
    const d = shortYearMatches[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 5. 8자리 숫자: 20260315
  const digitMatches = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (digitMatches) {
    return `${digitMatches[1]}-${digitMatches[2]}-${digitMatches[3]}`;
  }

  // 6. US 형태: 03/15/2026
  const usMatches = str.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (usMatches) {
    const m = usMatches[1].padStart(2, '0');
    const d = usMatches[2].padStart(2, '0');
    const y = usMatches[3];
    return `${y}-${m}-${d}`;
  }

  // 7. 기본 폴백: 앞 10자리 슬라이스
  return str.slice(0, 10);
}

// 금액 파싱 (문자열 내 콤마, 원, ₩, 회계용 괄호 등 제거)
export function parseAmount(val: unknown): number {
  if (typeof val === 'number') return Math.abs(val);
  if (!val) return 0;

  const str = String(val).trim();
  // 회계상 (15,000) 형태는 음수/지출을 의미
  const isBracketNegative = /^\(.*\)$/.test(str);
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;

  return Math.abs(parsed);
}

// 2D 테이블에서 가장 유력한 헤더 행(0~12행 탐색) 찾기
export function findBestHeaderRowIndex(rows: (string | number | null | undefined)[][]): number {
  if (!rows || rows.length === 0) return 0;

  let bestIndex = 0;
  let highestScore = -1;

  const headerKeywords = [
    /날짜/, /일자/, /거래일/, /승인일/, /결제일/, /일시/, /date/, /time/,
    /내용/, /항목/, /사용처/, /가맹점/, /적요/, /상호/, /내역/, /item/, /merchant/, /title/, /desc/,
    /금액/, /지출/, /결제금액/, /출금/, /승인금액/, /이용금액/, /amount/, /price/, /cost/,
    /카테고리/, /분류/, /구분/, /업종/, /종류/, /category/,
    /결제수단/, /카드/, /수단/, /payment/
  ];

  const maxRowsToCheck = Math.min(12, rows.length);

  for (let r = 0; r < maxRowsToCheck; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    let score = 0;
    const nonEmpties = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '');

    // 행에 유효한 셀이 너무 적으면 스킵
    if (nonEmpties.length < 2) continue;

    for (const cell of nonEmpties) {
      const cellText = String(cell).toLowerCase().trim();
      for (const kw of headerKeywords) {
        if (kw.test(cellText)) {
          score += 2;
          break;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIndex = r;
    }
  }

  return bestIndex;
}

// 엑셀 Buffer를 RawSheetData (2D 배열)로 파싱
export function extractRawSheetFromExcel(buffer: ArrayBuffer, fileName: string): RawSheetData {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
    header: 1,
    defval: '',
  });

  const headerRowIndex = findBestHeaderRowIndex(rows);
  const rawHeaders = (rows[headerRowIndex] || []).map((h, i) => {
    const s = String(h || '').trim();
    return s || `열 ${i + 1}`;
  });

  return {
    headers: rawHeaders,
    rows,
    headerRowIndex,
    fileNameOrSource: fileName,
  };
}

// CSV 텍스트를 RawSheetData (2D 배열)로 파싱
export function extractRawSheetFromCsv(csvText: string, sourceName: string): RawSheetData {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
    header: 1,
    defval: '',
  });

  const headerRowIndex = findBestHeaderRowIndex(rows);
  const rawHeaders = (rows[headerRowIndex] || []).map((h, i) => {
    const s = String(h || '').trim();
    return s || `열 ${i + 1}`;
  });

  return {
    headers: rawHeaders,
    rows,
    headerRowIndex,
    fileNameOrSource: sourceName,
  };
}

// 헤더와 샘플 데이터를 바탕으로 최적의 열 매핑 자동 탐색 (규칙 기반)
export function autoDetectColumnMapping(raw: RawSheetData): ColumnMappingConfig {
  const { headers, rows, headerRowIndex } = raw;

  const findCol = (patterns: RegExp[]): string => {
    const matched = headers.find((h) => {
      const lower = h.toLowerCase().trim();
      return patterns.some((p) => p.test(lower));
    });
    return matched || '';
  };

  // 1. 헤더 키워드 우선 탐색
  let dateCol = findCol([/날짜/, /일자/, /거래일/, /승인일/, /이용일/, /결제일/, /일시/, /date/, /time/]);
  // 내용, 가맹점, 상호 우선 (적요는 paymentCol 후보가 될 수 있으므로 우선순위 분리)
  let itemCol = findCol([/내용/, /항목/, /가맹점/, /사용처/, /상호/, /내역/, /item/, /merchant/, /title/, /desc/]);
  // 금액 열: '출금액' 또는 '지출'이 '입금액'보다 우선순위
  let amountCol = findCol([/출금/, /지출/, /승인금액/, /이용금액/, /결제금액/, /금액/, /amount/, /price/, /cost/]);
  let categoryCol = findCol([/카테고리/, /분류/, /업종/, /종류/, /category/, /tag/]);
  let paymentCol = findCol([/결제수단/, /사용카드/, /카드/, /수단/, /결제방법/, /payment/, /method/]);
  let notesCol = findCol([/메모/, /비고/, /note/, /remark/]);

  const dataRows = rows.slice(headerRowIndex + 1, headerRowIndex + 8);

  // 만약 itemCol이 아직 감지되지 않았으면 '적요' 또는 '구분' 탐색
  if (!itemCol) {
    itemCol = findCol([/적요/, /구분/]);
  }

  // 만약 paymentCol이 비어있다면, 남은 열(예: '적요', '사용카드') 중 결제/카드 데이터가 들어있는 열 자동 탐색
  if (!paymentCol && dataRows.length > 0) {
    const candidateHeaders = headers.filter(
      (h) => h && h !== dateCol && h !== amountCol && h !== itemCol && h !== categoryCol && h !== notesCol
    );
    for (const cand of candidateHeaders) {
      const colIdx = headers.indexOf(cand);
      const isPaymentKeyword = /적요|결제|수단|구분|카드/.test(cand);
      const hasPaymentValues = dataRows.some((r) => {
        const val = String(r[colIdx] || '').trim();
        return /카드|체크|신용|이체|현금|페이|pay|card/i.test(val);
      });
      if (isPaymentKeyword || hasPaymentValues) {
        paymentCol = cand;
        break;
      }
    }
  }

  // 2. 만약 헤더 이름으로 감지가 안 된 경우, 실제 행 값의 데이터 타입 패턴 검사
  if (dataRows.length > 0) {
    headers.forEach((header, colIdx) => {
      if (!dateCol) {
        // 날짜 형식인지 체크
        const isDatePattern = dataRows.some((r) => {
          const val = String(r[colIdx] || '');
          return /\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(val) || /^\d{8}$/.test(val) || (r[colIdx] as unknown) instanceof Date;
        });
        if (isDatePattern) dateCol = header;
      }

      if (!amountCol) {
        // 숫자인지 체크
        const isNumPattern = dataRows.every((r) => {
          const val = r[colIdx];
          return typeof val === 'number' || (typeof val === 'string' && /^[0-9,₩\s]+$/.test(val.trim()));
        });
        if (isNumPattern) amountCol = header;
      }
    });
  }

  // 기본값 fallback
  if (!dateCol && headers.length > 0) dateCol = headers[0];
  if (!itemCol && headers.length > 1) itemCol = headers[1];
  if (!amountCol && headers.length > 2) amountCol = headers[2];

  return {
    dateCol,
    amountCol,
    itemCol,
    categoryCol,
    paymentCol,
    notesCol,
    autoCategorizeWithAi: true,
  };
}

// 열 매핑 설정에 따라 2D 테이블을 ExpenseItem 배열로 변환
export function parseTableWithMapping(
  raw: RawSheetData,
  mapping: ColumnMappingConfig
): ExpenseItem[] {
  const { headers, rows, headerRowIndex } = raw;
  const items: ExpenseItem[] = [];

  const dateIdx = headers.indexOf(mapping.dateCol);
  const amountIdx = headers.indexOf(mapping.amountCol);
  const itemIdx = headers.indexOf(mapping.itemCol);
  const categoryIdx = mapping.categoryCol ? headers.indexOf(mapping.categoryCol) : -1;
  const paymentIdx = mapping.paymentCol ? headers.indexOf(mapping.paymentCol) : -1;
  const notesIdx = mapping.notesCol ? headers.indexOf(mapping.notesCol) : -1;

  const dataRows = rows.slice(headerRowIndex + 1);

  dataRows.forEach((row, index) => {
    if (!row || row.length === 0) return;

    // 금액 파싱
    const rawAmount = amountIdx >= 0 ? row[amountIdx] : 0;
    const amount = parseAmount(rawAmount);
    if (amount <= 0) return; // 0원이거나 빈 행 제외

    // 항목명
    const rawItem = itemIdx >= 0 && row[itemIdx] ? String(row[itemIdx]).trim() : `지출 ${index + 1}`;

    // 날짜
    const rawDate = dateIdx >= 0 ? row[dateIdx] : new Date();
    const date = normalizeDate(rawDate);

    // 카테고리
    let category = categoryIdx >= 0 && row[categoryIdx] ? String(row[categoryIdx]).trim() : '';
    if ((!category || category === 'undefined' || category === 'null') && mapping.autoCategorizeWithAi) {
      category = inferCategory(rawItem);
    } else if (!category) {
      category = '기타';
    }

    // 결제수단 및 메모
    let paymentMethod = paymentIdx >= 0 && row[paymentIdx] ? String(row[paymentIdx]).trim() : '';
    if (!paymentMethod) {
      if (/이체|송금|입금/.test(rawItem)) paymentMethod = '계좌이체';
      else if (/현금/.test(rawItem)) paymentMethod = '현금';
      else paymentMethod = '카드';
    }
    const notes = notesIdx >= 0 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

    items.push({
      id: `expense-${index + 1}-${Date.now()}`,
      date,
      item: rawItem,
      amount,
      category,
      paymentMethod,
      notes,
    });
  });

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

// 엑셀 파일 ArrayBuffer 빠른 기본 파싱
export function parseExcelBuffer(buffer: ArrayBuffer, fileName: string = 'excel.xlsx'): { items: ExpenseItem[]; raw: RawSheetData; mapping: ColumnMappingConfig } {
  const raw = extractRawSheetFromExcel(buffer, fileName);
  const mapping = autoDetectColumnMapping(raw);
  const items = parseTableWithMapping(raw, mapping);
  return { items, raw, mapping };
}

// CSV 텍스트 빠른 기본 파싱
export function parseCsvText(csvText: string, sourceName: string = 'csv'): { items: ExpenseItem[]; raw: RawSheetData; mapping: ColumnMappingConfig } {
  const raw = extractRawSheetFromCsv(csvText, sourceName);
  const mapping = autoDetectColumnMapping(raw);
  const items = parseTableWithMapping(raw, mapping);
  return { items, raw, mapping };
}

// 여러 월(탭)의 CSV 텍스트를 하나로 결합하여 종합 파싱
export function parseMultiMonthCsvs(
  csvList: string[],
  title: string = '전월 통합'
): { items: ExpenseItem[]; raw: RawSheetData; mapping: ColumnMappingConfig } {
  let allItems: ExpenseItem[] = [];
  let combinedRaw: RawSheetData | null = null;
  let defaultMapping: ColumnMappingConfig | null = null;

  csvList.forEach((csv, idx) => {
    const { items, raw, mapping } = parseCsvText(csv, `시트 ${idx + 1}`);
    allItems = allItems.concat(items);
    if (!combinedRaw) {
      combinedRaw = raw;
      defaultMapping = mapping;
    }
  });

  // 날짜 역순 정렬
  allItems.sort((a, b) => b.date.localeCompare(a.date));

  return {
    items: allItems,
    raw: combinedRaw || extractRawSheetFromCsv('', title),
    mapping: defaultMapping || {
      dateCol: '날짜',
      amountCol: '지출 금액',
      itemCol: '내용',
      autoCategorizeWithAi: true,
    },
  };
}

// 종합 메트릭 및 집계 계산
export function calculateMetrics(items: ExpenseItem[]): SpendingAnalysisMetrics {
  if (items.length === 0) {
    return {
      totalAmount: 0,
      totalCount: 0,
      dailyAverage: 0,
      highestExpense: null,
      categorySummaries: [],
      dailyTrends: [],
      startDate: '',
      endDate: '',
    };
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = items.length;

  // 카테고리별 집계
  const categoryMap = new Map<string, { total: number; count: number }>();
  items.forEach((item) => {
    const cur = categoryMap.get(item.category) || { total: 0, count: 0 };
    cur.total += item.amount;
    cur.count += 1;
    categoryMap.set(item.category, cur);
  });

  const categorySummaries: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      total: stats.total,
      count: stats.count,
      percentage: totalAmount > 0 ? Math.round((stats.total / totalAmount) * 1000) / 10 : 0,
      color: CATEGORY_COLORS[category] || '#94A3B8',
    }))
    .sort((a, b) => b.total - a.total);

  // 일자별 집계 (오름차순)
  const dailyMap = new Map<string, { amount: number; count: number }>();
  items.forEach((item) => {
    const cur = dailyMap.get(item.date) || { amount: 0, count: 0 };
    cur.amount += item.amount;
    cur.count += 1;
    dailyMap.set(item.date, cur);
  });

  const sortedDates = Array.from(dailyMap.keys()).sort();
  const dailyTrends: DailySummary[] = sortedDates.map((date) => ({
    date,
    amount: dailyMap.get(date)!.amount,
    count: dailyMap.get(date)!.count,
  }));

  const startDate = sortedDates[0] || '';
  const endDate = sortedDates[sortedDates.length - 1] || '';

  const uniqueDays = Math.max(1, dailyMap.size);
  const dailyAverage = Math.round(totalAmount / uniqueDays);

  let highestExpense = null;
  if (items.length > 0) {
    const sortedByAmount = [...items].sort((a, b) => b.amount - a.amount);
    highestExpense = {
      item: sortedByAmount[0].item,
      amount: sortedByAmount[0].amount,
      date: sortedByAmount[0].date,
      category: sortedByAmount[0].category,
    };
  }

  const paymentMetrics = calculatePaymentMetrics(items);

  return {
    totalAmount,
    totalCount,
    dailyAverage,
    highestExpense,
    categorySummaries,
    dailyTrends,
    startDate,
    endDate,
    paymentMetrics,
  };
}

// 현실감 있는 데모 샘플 데이터 (다양한 신용카드 및 결제수단 포함)
export function getSampleExpenseData(): ExpenseItem[] {
  const sampleRaw: { date: string; item: string; amount: number; category: string; paymentMethod: string; notes: string }[] = [
    { date: '2026-03-01', item: 'CU 편의점 도시락 & 음료', amount: 8500, category: '식비', paymentMethod: '신용카드 처음', notes: '점심 식사' },
    { date: '2026-03-01', item: '스타벅스 아메리카노 Grande', amount: 5000, category: '카페/간식', paymentMethod: '신용카드 처음', notes: '개인 작업' },
    { date: '2026-03-02', item: '지하철 후불교통비 충전', amount: 55000, category: '교통비', paymentMethod: '체크카드', notes: '월 정기 대중교통' },
    { date: '2026-03-03', item: '쿠팡 로켓프레시 장보기', amount: 48900, category: '생활/마트', paymentMethod: '카카오페이', notes: '식재료 및 계란' },
    { date: '2026-03-03', item: '동네 순대국밥', amount: 10000, category: '식비', paymentMethod: '체크카드', notes: '저녁' },
    { date: '2026-03-04', item: '메가MGC커피 바닐라라떼', amount: 3700, category: '카페/간식', paymentMethod: '신용카드 처음', notes: '' },
    { date: '2026-03-05', item: '통신비 (SKT 5G 요금)', amount: 69000, category: '주거/통신', paymentMethod: '계좌이체', notes: '월 정기 납부' },
    { date: '2026-03-06', item: '팀 회식 2차 부담금', amount: 35000, category: '식비', paymentMethod: '카카오페이', notes: '이자카야' },
    { date: '2026-03-07', item: '무신사 봄 자켓 구매', amount: 129000, category: '쇼핑', paymentMethod: '현대카드 ZERO', notes: '환절기 아우터' },
    { date: '2026-03-08', item: '넷플릭스 프리미엄 구독료', amount: 17000, category: '문화/여가', paymentMethod: '신용카드 처음', notes: '월 정기 구독' },
    { date: '2026-03-09', item: '카카오T 택시 (야근 귀가)', amount: 18400, category: '교통비', paymentMethod: '카카오페이', notes: '회사 야근 택시비' },
    { date: '2026-03-10', item: '약국 종합감기약 & 비타민', amount: 12000, category: '의료/건강', paymentMethod: '체크카드', notes: '환절기 감기' },
    { date: '2026-03-11', item: '배달의민족 삼겹살 1인세트', amount: 24500, category: '식비', paymentMethod: '체크카드', notes: '저녁 배달' },
    { date: '2026-03-12', item: '투썸플레이스 케이크 & 커피', amount: 13200, category: '카페/간식', paymentMethod: '아빠카드', notes: '친구 미팅' },
    { date: '2026-03-13', item: '올리브영 스킨케어 & 폼클렌징', amount: 34500, category: '쇼핑', paymentMethod: '신용카드 처음', notes: '세일 기간 구매' },
    { date: '2026-03-14', item: 'CGV 영화 관람 (듄2)', amount: 15000, category: '문화/여가', paymentMethod: '삼성카드 taptap', notes: '주말 문화생활' },
    { date: '2026-03-15', item: '이마트 주말 장보기', amount: 82300, category: '생활/마트', paymentMethod: '삼성카드 taptap', notes: '생필품 및 과일' },
    { date: '2026-03-17', item: '회사 근처 돈까스 정식', amount: 12000, category: '식비', paymentMethod: '체크카드', notes: '점심' },
    { date: '2026-03-18', item: '교보문고 개발 서적 2권', amount: 56000, category: '문화/여가', paymentMethod: '현대카드 ZERO', notes: '자기계발' },
    { date: '2026-03-20', item: '치과 정기 스케일링', amount: 16800, category: '의료/건강', paymentMethod: '체크카드', notes: '연 1회 보험 스케일링' },
    { date: '2026-03-22', item: '다이소 생활용품 수납함', amount: 9000, category: '생활/마트', paymentMethod: '현금', notes: '방 정리' },
    { date: '2026-03-23', item: '주말 외식 패밀리 레스토랑', amount: 88000, category: '식비', paymentMethod: '아빠카드', notes: '가족 외식' },
    { date: '2026-03-25', item: '유튜브 프리미엄 정기결제', amount: 14900, category: '문화/여가', paymentMethod: '신용카드 처음', notes: '구독' },
    { date: '2026-03-26', item: '맥도날드 빅맥 세트', amount: 7200, category: '식비', paymentMethod: '체크카드', notes: '점심' },
    { date: '2026-03-27', item: '쿠팡 와우 회원권', amount: 4990, category: '쇼핑', paymentMethod: '계좌이체', notes: '멤버십' },
    { date: '2026-03-28', item: '나이키 런닝화 구매', amount: 149000, category: '쇼핑', paymentMethod: '현대카드 ZERO', notes: '봄 운동용' },
    { date: '2026-03-29', item: '아파트 관리비 & 수도세', amount: 185000, category: '주거/통신', paymentMethod: '계좌이체', notes: '관리비 고지서' },
    { date: '2026-03-30', item: '동네 정육점 한우 소고기', amount: 42000, category: '식비', paymentMethod: '신용카드 처음', notes: '저녁 요리' },
  ];

  return sampleRaw.map((r, i) => ({
    id: `sample-${i + 1}`,
    ...r,
  }));
}
