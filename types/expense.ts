export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  item: string; // 항목명/내용
  amount: number; // 금액 (원)
  category: string; // 카테고리 (식비, 교통, 쇼핑 등)
  paymentMethod?: string; // 카드, 현금, 계좌이체 등
  notes?: string; // 비고
}

export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface DailySummary {
  date: string;
  amount: number;
  count: number;
}

export interface CardUsageSummary {
  cardName: string;
  cardCompany: string;
  isCredit: boolean;
  total: number;
  count: number;
  percentageOfCredit: number; // 신용카드 내 비중 (%)
  percentageOfTotal: number; // 전체 지출 중 비중 (%)
  color: string;
}

export interface PaymentMethodSummary {
  name: string;
  type: 'credit' | 'debit' | 'transfer' | 'cash' | 'easy_pay' | 'other';
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface PaymentMetrics {
  totalCreditAmount: number;
  totalCreditCount: number;
  creditPercentage: number;
  totalDebitAmount: number;
  totalDebitCount: number;
  debitPercentage: number;
  totalTransferAmount: number;
  totalTransferCount: number;
  totalCashAmount: number;
  totalCashCount: number;
  totalEasyPayAmount: number;
  totalEasyPayCount: number;
  totalOtherAmount: number;
  totalOtherCount: number;
  distinctCreditCards: CardUsageSummary[]; // 실제 발견된 신용카드 목록 (토큰 절약형)
  methodSummaries: PaymentMethodSummary[];
}

export interface CreditCardCoaching {
  summary: string;
  cardSpecificAdvice: {
    cardName: string;
    advice: string;
  }[];
  debtWarningOrTip: string;
}

export interface SpendingAnalysisMetrics {
  totalAmount: number;
  totalCount: number;
  dailyAverage: number;
  highestExpense: {
    item: string;
    amount: number;
    date: string;
    category: string;
  } | null;
  categorySummaries: CategorySummary[];
  dailyTrends: DailySummary[];
  startDate: string;
  endDate: string;
  paymentMetrics?: PaymentMetrics;
}

export interface AiAnalysisResult {
  overview: string;
  score: number; // 1-100
  creditCardCoaching?: CreditCardCoaching;
  patterns: {
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'info';
  }[];
  savingRecommendations: {
    category: string;
    potentialSaving: number;
    advice: string;
  }[];
  budgetAdvice: string;
  generatedAt: string;
}

// 원본 시트/엑셀 2D 데이터 구조
export interface RawSheetData {
  headers: string[];
  rows: (string | number | null | undefined)[][];
  headerRowIndex: number;
  fileNameOrSource: string;
}

// 열 매핑 설정
export interface ColumnMappingConfig {
  dateCol: string; // 예: "거래일자" 또는 "열 A"
  amountCol: string; // 예: "출금액" 또는 "승인금액"
  itemCol: string; // 예: "가맹점명" 또는 "적요"
  categoryCol?: string; // 예: "업종" 또는 빈 값
  paymentCol?: string; // 예: "결제방법" 또는 빈 값
  notesCol?: string;
  autoCategorizeWithAi: boolean; // 카테고리 없거나 부족할 때 AI/스마트 유추 적용 여부
}

// 구글 스프레드시트 개별 탭(월별 가계부) 메타데이터
export interface SheetTabInfo {
  name: string;
  gid: string;
  index: string;
}
