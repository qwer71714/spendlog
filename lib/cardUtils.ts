import {
  ExpenseItem,
  PaymentMetrics,
  CardUsageSummary,
  PaymentMethodSummary,
  CreditCardCoaching,
} from '@/types/expense';

export interface CardCompanyInfo {
  code: string;
  name: string;
  aliases: (string | RegExp)[];
  color: string;
}

// 대한민국 주요 카드사 및 패밀리 카드 식별 목록
export const KNOWN_CARD_COMPANIES: CardCompanyInfo[] = [
  {
    code: 'shinhan',
    name: '신한카드',
    aliases: [/신한/, /shinhan/, /처음/, /deep/, /mr\.life/, /미스터라이프/, /더모아/],
    color: '#0046FF',
  },
  {
    code: 'samsung',
    name: '삼성카드',
    aliases: [/삼성/, /samsung/, /taptap/, /탭탭/, /id/],
    color: '#0C4DA2',
  },
  {
    code: 'hyundai',
    name: '현대카드',
    aliases: [/현대/, /hyundai/, /제로/, /zero/, /m포인트/, /m카드/, /x카드/],
    color: '#1E293B',
  },
  {
    code: 'kb',
    name: 'KB국민카드',
    aliases: [/국민/, /kb/, /kookmin/, /노리/, /톡톡/, /위시/, /다담/, /탄탄대로/],
    color: '#F59E0B',
  },
  {
    code: 'lotte',
    name: '롯데카드',
    aliases: [/롯데/, /lotte/, /loca/, /로카/, /likit/, /라이킷/],
    color: '#DC2626',
  },
  {
    code: 'woori',
    name: '우리카드',
    aliases: [/우리/, /woori/, /카드의정석/, /정석/],
    color: '#0284C7',
  },
  {
    code: 'hana',
    name: '하나카드',
    aliases: [/하나/, /hana/, /외환/, /원큐/, /1q/, /트래블로그/],
    color: '#0D9488',
  },
  {
    code: 'bc',
    name: 'BC카드',
    aliases: [/bc/, /비씨/, /페이북/],
    color: '#E11D48',
  },
  {
    code: 'nh',
    name: 'NH농협카드',
    aliases: [/nh/, /농협/, /nonghyup/, /올바른/, /zgm/],
    color: '#16A34A',
  },
  {
    code: 'ibk',
    name: 'IBK기업은행',
    aliases: [/ibk/, /기업은행/, /기업/, /참! 좋은/],
    color: '#1D4ED8',
  },
  {
    code: 'family',
    name: '가족/지정카드',
    aliases: [/아빠/, /엄마/, /가족/, /부모/, /배우자/, /남편/, /아내/],
    color: '#8B5CF6',
  },
  {
    code: 'kakao',
    name: '카카오뱅크/페이',
    aliases: [/카카오/, /kakao/],
    color: '#EAB308',
  },
  {
    code: 'toss',
    name: '토스뱅크',
    aliases: [/토스/, /toss/],
    color: '#2563EB',
  },
  {
    code: 'kbank',
    name: '케이뱅크',
    aliases: [/케이뱅크/, /kbank/],
    color: '#0F172A',
  },
];

export interface PaymentClassification {
  type: 'credit' | 'debit' | 'transfer' | 'cash' | 'easy_pay' | 'other';
  typeLabel: string;
  isCreditCard: boolean;
  cardName: string;
  cardCompany: string;
  color: string;
}

// 결제수단 및 카드 분류 엔진
export function classifyPaymentMethod(
  rawPayment: string,
  rawItem: string = '',
  rawNotes: string = ''
): PaymentClassification {
  const text = String(rawPayment || '').trim();
  const context = `${text} ${rawItem} ${rawNotes}`.trim();

  if (!text) {
    return {
      type: 'other',
      typeLabel: '기타/미분류',
      isCreditCard: false,
      cardName: '기타',
      cardCompany: '',
      color: '#94A3B8',
    };
  }

  // 1. 체크카드 판별
  if (/체크카드|체크|check/i.test(text)) {
    return {
      type: 'debit',
      typeLabel: '체크카드',
      isCreditCard: false,
      cardName: text,
      cardCompany: '체크카드',
      color: '#10B981',
    };
  }

  // 2. 계좌이체 / 송금 판별
  if (/계좌이체|이체|송금|무통장|자동이체/i.test(text)) {
    return {
      type: 'transfer',
      typeLabel: '계좌이체',
      isCreditCard: false,
      cardName: text,
      cardCompany: '계좌이체',
      color: '#3B82F6',
    };
  }

  // 3. 현금 판별
  if (/현금|cash|지폐|동전/i.test(text)) {
    return {
      type: 'cash',
      typeLabel: '현금',
      isCreditCard: false,
      cardName: text,
      cardCompany: '현금',
      color: '#F59E0B',
    };
  }

  // 4. 간편결제 판별 (페이 단독)
  if (/페이|pay|카카오페이|네이버페이|토스페이|제로페이|페이코/i.test(text) && !/카드/.test(text)) {
    return {
      type: 'easy_pay',
      typeLabel: '간편결제',
      isCreditCard: false,
      cardName: text,
      cardCompany: '간편결제',
      color: '#EC4899',
    };
  }

  // 5. 신용카드 판별 (신용카드 명시, 카드사 매칭, '카드' 단어, 가족카드 등)
  const isExplicitCredit = /신용카드|신용|credit/i.test(text);
  const matchedCompany = KNOWN_CARD_COMPANIES.find((c) =>
    c.aliases.some((pattern) => (typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)))
  );
  const isCardWord = /카드/i.test(text);

  if (isExplicitCredit || matchedCompany || isCardWord) {
    const cardCompany = matchedCompany ? matchedCompany.name : '신용카드';
    const color = matchedCompany ? matchedCompany.color : '#6366F1';

    return {
      type: 'credit',
      typeLabel: '신용카드',
      isCreditCard: true,
      cardName: text,
      cardCompany,
      color,
    };
  }

  return {
    type: 'other',
    typeLabel: text,
    isCreditCard: false,
    cardName: text,
    cardCompany: '기타',
    color: '#94A3B8',
  };
}

// 결제수단 및 신용카드 종합 통계 집계
export function calculatePaymentMetrics(items: ExpenseItem[]): PaymentMetrics {
  let totalCreditAmount = 0;
  let totalCreditCount = 0;
  let totalDebitAmount = 0;
  let totalDebitCount = 0;
  let totalTransferAmount = 0;
  let totalTransferCount = 0;
  let totalCashAmount = 0;
  let totalCashCount = 0;
  let totalEasyPayAmount = 0;
  let totalEasyPayCount = 0;
  let totalOtherAmount = 0;
  let totalOtherCount = 0;

  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);

  // 카드별 집계 (신용카드 전용)
  const creditCardMap = new Map<
    string,
    {
      cardName: string;
      cardCompany: string;
      total: number;
      count: number;
      color: string;
    }
  >();

  items.forEach((item) => {
    const classification = classifyPaymentMethod(item.paymentMethod || '', item.item, item.notes);
    const amount = item.amount;

    switch (classification.type) {
      case 'credit':
        totalCreditAmount += amount;
        totalCreditCount += 1;
        const cur = creditCardMap.get(classification.cardName) || {
          cardName: classification.cardName,
          cardCompany: classification.cardCompany,
          total: 0,
          count: 0,
          color: classification.color,
        };
        cur.total += amount;
        cur.count += 1;
        creditCardMap.set(classification.cardName, cur);
        break;

      case 'debit':
        totalDebitAmount += amount;
        totalDebitCount += 1;
        break;

      case 'transfer':
        totalTransferAmount += amount;
        totalTransferCount += 1;
        break;

      case 'cash':
        totalCashAmount += amount;
        totalCashCount += 1;
        break;

      case 'easy_pay':
        totalEasyPayAmount += amount;
        totalEasyPayCount += 1;
        break;

      default:
        totalOtherAmount += amount;
        totalOtherCount += 1;
        break;
    }
  });

  // 신용카드별 통계 정렬
  const distinctCreditCards: CardUsageSummary[] = Array.from(creditCardMap.values())
    .map((c) => ({
      cardName: c.cardName,
      cardCompany: c.cardCompany,
      isCredit: true,
      total: c.total,
      count: c.count,
      percentageOfCredit: totalCreditAmount > 0 ? Math.round((c.total / totalCreditAmount) * 1000) / 10 : 0,
      percentageOfTotal: totalAmount > 0 ? Math.round((c.total / totalAmount) * 1000) / 10 : 0,
      color: c.color,
    }))
    .sort((a, b) => b.total - a.total);

  // 전체 결제수단별 요약 (차트 및 뱃지용)
  const methodSummaries: PaymentMethodSummary[] = [];

  if (totalCreditAmount > 0 || totalCreditCount > 0) {
    methodSummaries.push({
      name: '신용카드',
      type: 'credit',
      total: totalCreditAmount,
      count: totalCreditCount,
      percentage: totalAmount > 0 ? Math.round((totalCreditAmount / totalAmount) * 1000) / 10 : 0,
      color: '#6366F1', // indigo
    });
  }

  if (totalDebitAmount > 0 || totalDebitCount > 0) {
    methodSummaries.push({
      name: '체크카드',
      type: 'debit',
      total: totalDebitAmount,
      count: totalDebitCount,
      percentage: totalAmount > 0 ? Math.round((totalDebitAmount / totalAmount) * 1000) / 10 : 0,
      color: '#10B981', // emerald
    });
  }

  if (totalTransferAmount > 0 || totalTransferCount > 0) {
    methodSummaries.push({
      name: '계좌이체',
      type: 'transfer',
      total: totalTransferAmount,
      count: totalTransferCount,
      percentage: totalAmount > 0 ? Math.round((totalTransferAmount / totalAmount) * 1000) / 10 : 0,
      color: '#3B82F6', // blue
    });
  }

  if (totalEasyPayAmount > 0 || totalEasyPayCount > 0) {
    methodSummaries.push({
      name: '간편결제',
      type: 'easy_pay',
      total: totalEasyPayAmount,
      count: totalEasyPayCount,
      percentage: totalAmount > 0 ? Math.round((totalEasyPayAmount / totalAmount) * 1000) / 10 : 0,
      color: '#EC4899', // pink
    });
  }

  if (totalCashAmount > 0 || totalCashCount > 0) {
    methodSummaries.push({
      name: '현금',
      type: 'cash',
      total: totalCashAmount,
      count: totalCashCount,
      percentage: totalAmount > 0 ? Math.round((totalCashAmount / totalAmount) * 1000) / 10 : 0,
      color: '#F59E0B', // amber
    });
  }

  if (totalOtherAmount > 0 || totalOtherCount > 0) {
    methodSummaries.push({
      name: '기타/미분류',
      type: 'other',
      total: totalOtherAmount,
      count: totalOtherCount,
      percentage: totalAmount > 0 ? Math.round((totalOtherAmount / totalAmount) * 1000) / 10 : 0,
      color: '#94A3B8', // slate
    });
  }

  // 비중 높은 순 정렬
  methodSummaries.sort((a, b) => b.total - a.total);

  return {
    totalCreditAmount,
    totalCreditCount,
    creditPercentage: totalAmount > 0 ? Math.round((totalCreditAmount / totalAmount) * 1000) / 10 : 0,
    totalDebitAmount,
    totalDebitCount,
    debitPercentage: totalAmount > 0 ? Math.round((totalDebitAmount / totalAmount) * 1000) / 10 : 0,
    totalTransferAmount,
    totalTransferCount,
    totalCashAmount,
    totalCashCount,
    totalEasyPayAmount,
    totalEasyPayCount,
    totalOtherAmount,
    totalOtherCount,
    distinctCreditCards,
    methodSummaries,
  };
}

// ★ 토큰 절약형 AI 프롬프트 생성기: 실제 데이터에 등장한 카드/수단만 정확하게 압축 전달
export function buildCreditCardPromptSummary(pm?: PaymentMetrics): string {
  if (!pm) return '';

  const cardLines = pm.distinctCreditCards.map(
    (c) => `  * [${c.cardCompany}] ${c.cardName}: ${c.total.toLocaleString()}원 (${c.count}건, 신용카드 중 ${c.percentageOfCredit}%)`
  );

  return `[결제수단 및 신용카드 사용 통계 (실제 사용자 데이터 기반 요약)]:
- 신용카드 지출: ${pm.totalCreditAmount.toLocaleString()}원 (${pm.totalCreditCount}건, 전체 지출의 ${pm.creditPercentage}%)
${cardLines.length > 0 ? `  [실제 감지된 신용카드 목록]:\n${cardLines.join('\n')}` : '  (등록된 신용카드 없음)'}
- 체크카드 지출: ${pm.totalDebitAmount.toLocaleString()}원 (${pm.totalDebitCount}건, 전체 지출의 ${pm.debitPercentage}%)
- 계좌이체/현금/기타: ${(pm.totalTransferAmount + pm.totalCashAmount + pm.totalOtherAmount).toLocaleString()}원 (${pm.totalTransferCount + pm.totalCashCount + pm.totalOtherCount}건)`;
}

// 오프라인 / Mock 및 내장 분석 엔진용 신용카드 스마트 코칭 생성기
export function generateSmartCardCoaching(pm?: PaymentMetrics): CreditCardCoaching {
  if (!pm || (pm.totalCreditAmount === 0 && pm.distinctCreditCards.length === 0)) {
    return {
      summary: '신용카드 사용 내역이 감지되지 않았으며, 체크카드 및 계좌이체 위주의 건전한 현금 흐름을 유지하고 계십니다.',
      cardSpecificAdvice: [],
      debtWarningOrTip: '체크카드 사용 비중이 높아 연말정산 소득공제율(30%) 측면에서 매우 유리한 소비 패턴입니다.',
    };
  }

  const cardSpecificAdvice: { cardName: string; advice: string }[] = [];

  pm.distinctCreditCards.forEach((c) => {
    let advice = '';
    if (/처음/.test(c.cardName) || /처음/.test(c.cardCompany)) {
      advice = `'신한카드 처음'은 사회초년생 맞춤 생활 할인 카드입니다. 편의점, 커피, 대중교통 등 일상 영역에서 전월 실적(30만원)을 달성할 수 있도록 계획적으로 결제 분배를 권장합니다.`;
    } else if (/아빠|엄마|가족/.test(c.cardName)) {
      advice = `'${c.cardName}' 사용액(${c.total.toLocaleString()}원)은 가족 지원 지출이므로, 본인 순수 소비 예산과 분리하여 가계부 결산 시 별도 항목으로 관리하는 것이 좋습니다.`;
    } else if (/신한/.test(c.cardCompany) || /신한/.test(c.cardName)) {
      advice = `'${c.cardName}' 결제액은 마이신한포인트 적립처 및 카드별 혜택 가맹점을 우선 확인하여 활용도를 극대화하세요.`;
    } else if (/삼성/.test(c.cardCompany) || /삼성/.test(c.cardName)) {
      advice = `'${c.cardName}' 링크(LINK) 혜택을 매월 초 삼성카드 앱에서 사전 등록해두면 추가 결제일 할인을 챙길 수 있습니다.`;
    } else if (/현대/.test(c.cardCompany) || /현대/.test(c.cardName)) {
      advice = `'${c.cardName}' M포인트 또는 캐시백 적립 구간을 체크하여 무이자할부 시 포인트 미적립 여부를 확인하세요.`;
    } else if (/국민|kb/.test(c.cardCompany) || /국민|kb/.test(c.cardName)) {
      advice = `'${c.cardName}' 국민카드 스타샵 가맹점 및 건당 결제한도 혜택 구간을 점검하세요.`;
    } else {
      advice = `'${c.cardName}'으로 총 ${c.total.toLocaleString()}원 (${c.count}건)이 지출되었습니다. 주요 혜택 영역에만 집중 사용하고 일반 지출은 체크카드를 병행하세요.`;
    }

    cardSpecificAdvice.push({
      cardName: c.cardName,
      advice,
    });
  });

  let summary = '';
  if (pm.creditPercentage < 25) {
    summary = `신용카드 지출 비중이 ${pm.creditPercentage}% (${pm.totalCreditAmount.toLocaleString()}원)로 매우 건전하며, 체크카드(${pm.debitPercentage}%) 위주의 계획적인 소비가 돋보입니다.`;
  } else if (pm.creditPercentage < 60) {
    summary = `신용카드(${pm.creditPercentage}%)와 체크카드(${pm.debitPercentage}%)가 균형 있게 활용되고 있습니다. 카드 실적과 혜택을 알뜰히 챙기되 과도한 할부는 유의하세요.`;
  } else {
    summary = `전체 소비의 ${pm.creditPercentage}% (${pm.totalCreditAmount.toLocaleString()}원)가 신용카드로 결제되고 있어 다음 달 결제일에 큰 부담이 될 수 있습니다.`;
  }

  let debtWarningOrTip = '';
  if (pm.creditPercentage > 50) {
    debtWarningOrTip = `신용카드 대금 결제일 3~5일 전 계좌 잔고를 미리 확인하고, 고정비 외의 일상 변동 지출은 체크카드로 전환하여 소비 통제력을 높이세요.`;
  } else {
    debtWarningOrTip = `신용카드 혜택과 체크카드 소득공제(30%) 혜택을 황금 비율로 챙길 수 있는 이상적인 결제 구조입니다.`;
  }

  return {
    summary,
    cardSpecificAdvice,
    debtWarningOrTip,
  };
}
