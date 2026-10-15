import { NextRequest, NextResponse } from 'next/server';
import { ExpenseItem, SpendingAnalysisMetrics, AiAnalysisResult } from '@/types/expense';
import { callGeminiGenerate } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  let items: ExpenseItem[] = [];
  let metrics: SpendingAnalysisMetrics | null = null;

  try {
    const body = await req.json() as {
      items: ExpenseItem[];
      metrics: SpendingAnalysisMetrics;
      apiKey?: string;
    };
    items = body.items || [];
    metrics = body.metrics;
    const userApiKey = body.apiKey;

    if (!items || items.length === 0 || !metrics) {
      return NextResponse.json(
        { error: '분석할 소비 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    // API Key가 없는 경우: 스마트 룰 기반 로컬 분석(Mock Analysis) 제공
    if (!apiKey) {
      const mockResult = generateLocalAnalysis(metrics, items);
      return NextResponse.json({
        success: true,
        isMock: true,
        data: mockResult,
        message: 'Gemini API 키가 입력되지 않아 사전 내장된 분석 엔진으로 결과를 생성했습니다.',
      });
    }

    // Gemini API 호출 프롬프트 준비
    const categorySummaryText = metrics.categorySummaries
      .map((c) => `- ${c.category}: ${c.total.toLocaleString()}원 (${c.percentage}%, 총 ${c.count}건)`)
      .join('\n');

    const top5Items = [...items]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((item, idx) => `${idx + 1}. [${item.category}] ${item.item} - ${item.amount.toLocaleString()}원 (${item.date})`)
      .join('\n');

    const systemPrompt = `당신은 대한민국 최고의 공인 개인 재무/자산관리 전문가이자 따뜻하지만 날카로운 소비 습관 코칭 AI입니다.
사용자가 제공한 실제 가계부/소비 기록 데이터를 분석하여 직관적이고 실천 가능한 분석 보고서를 작성하세요.

반드시 아래 JSON 형식으로만 응답해야 합니다. 마크다운 코드블록(\`\`\`json ... \`\`\`) 없이 순수 JSON 문자열만 반환하세요.

JSON 형식:
{
  "overview": "전체적인 소비 상태에 대한 2~3줄의 핵심 평가 및 총평",
  "score": 78,
  "patterns": [
    {
      "title": "패턴 요약 제목 (예: 잦은 카페/간식 소비 습관)",
      "description": "구체적인 원인 및 영향에 대한 설명",
      "type": "warning"
    }
  ],
  "savingRecommendations": [
    {
      "category": "카테고리명 (예: 식비)",
      "potentialSaving": 80000,
      "advice": "구체적이고 실천 가능한 절약 팁과 대안"
    }
  ],
  "budgetAdvice": "다음 달을 위한 현실적인 예산 및 지출 가이드라인 (2~3문장)"
}`;

    const userPrompt = `[소비 분석 데이터]
- 분석 기간: ${metrics.startDate} ~ ${metrics.endDate}
- 총 지출액: ${metrics.totalAmount.toLocaleString()}원
- 총 지출 건수: ${metrics.totalCount}건
- 일평균 지출: ${metrics.dailyAverage.toLocaleString()}원
- 카테고리별 비중:
${categorySummaryText}

- 상위 고액 지출 TOP 5:
${top5Items}

위 데이터를 정밀 분석하여 정확한 JSON 포맷으로 응답해주세요.`;

    // 1. Google API에 동적 모델 탐색을 통해 호출
    const result = await callGeminiGenerate(apiKey, systemPrompt, userPrompt);

    // 2. 만약 Google 호출이 실패하면 (키 권한, 모델 404 등), 즉시 내장 스마트 분석 엔진으로 대체
    if (!result.success || !result.text) {
      console.warn('Gemini generate failed, smoothly falling back to smart local analysis:', result.error);
      const fallbackData = generateLocalAnalysis(metrics, items);
      return NextResponse.json({
        success: true,
        isMock: true,
        data: fallbackData,
        notice: `Google Gemini API 연결에 실패하여(${result.error || '모델 오류'}) 내장 스마트 분석 엔진으로 리포트를 생성했습니다.`,
      });
    }

    const parsedResult = extractJson(result.text);

    return NextResponse.json({
      success: true,
      isMock: false,
      modelUsed: result.modelUsed,
      data: {
        ...parsedResult,
        generatedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      },
    });

  } catch (error: unknown) {
    console.error('AI Analysis error:', error);
    if (metrics && items.length > 0) {
      const fallbackData = generateLocalAnalysis(metrics, items);
      return NextResponse.json({
        success: true,
        isMock: true,
        data: fallbackData,
        notice: '서버 분석 중 일시적 오류가 발생하여 내장 스마트 분석 엔진으로 결과를 생성했습니다.',
      });
    }
    return NextResponse.json(
      { error: '소비 기록을 분석하는 중 예기치 않은 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// JSON 파싱 도우미 (마크다운 백틱 제거 등)
function extractJson(rawText?: string): Partial<AiAnalysisResult> {
  if (!rawText) return {};
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    console.warn('JSON parsing error from Gemini, using fallback:', e);
    return {
      overview: '지출 데이터 분석이 완료되었습니다. 주요 지출 항목을 점검해보세요.',
      score: 75,
      patterns: [],
      savingRecommendations: [],
      budgetAdvice: '지출 비중이 높은 항목부터 10% 절감을 목표로 계획을 세워보세요.',
    };
  }
}

// API 키가 없거나 실패했을 때 동작하는 똑똑한 로컬 분석기
export function generateLocalAnalysis(metrics: SpendingAnalysisMetrics, items: ExpenseItem[]): AiAnalysisResult {
  const topCategory = metrics.categorySummaries[0];
  const secondCategory = metrics.categorySummaries[1];
  const total = metrics.totalAmount;

  const patterns: AiAnalysisResult['patterns'] = [];
  const savingRecommendations: AiAnalysisResult['savingRecommendations'] = [];

  // 1. 최대 지출 카테고리 분석
  if (topCategory) {
    if (topCategory.percentage >= 35) {
      patterns.push({
        title: `'${topCategory.category}' 지출 과다 집중 현상`,
        description: `전체 소비의 ${topCategory.percentage}% (${topCategory.total.toLocaleString()}원)가 '${topCategory.category}'에 집중되어 있습니다. 특정 카테고리의 쏠림 현상이 재정 유연성을 낮출 수 있습니다.`,
        type: 'warning',
      });
      savingRecommendations.push({
        category: topCategory.category,
        potentialSaving: Math.round((topCategory.total * 0.15) / 1000) * 1000,
        advice: `다음 달에는 ${topCategory.category} 예산을 약 15% 정도 사전 한도로 묶어두고 주차별로 나누어 소비해보세요.`,
      });
    } else {
      patterns.push({
        title: `균형 잡힌 카테고리별 지출 배분`,
        description: `1위 카테고리('${topCategory.category}')가 전체의 ${topCategory.percentage}%로 특정 영역에 과도하게 치우치지 않고 비교적 고른 소비를 보이고 있습니다.`,
        type: 'positive',
      });
    }
  }

  // 2. 카페/간식 분석
  const cafeStats = metrics.categorySummaries.find((c) => c.category === '카페/간식');
  if (cafeStats && cafeStats.count >= 5) {
    patterns.push({
      title: '잦은 소액 소비 (라떼 팩터) 포착',
      description: `카페/간식 건수가 총 ${cafeStats.count}회 (${cafeStats.total.toLocaleString()}원)로 집계되었습니다. 건당 금액은 작지만 누적되면 큰 비중을 차지합니다.`,
      type: 'info',
    });
    savingRecommendations.push({
      category: '카페/간식',
      potentialSaving: Math.round((cafeStats.total * 0.3) / 1000) * 1000,
      advice: '텀블러 할인 혜택을 이용하거나 주 2회는 회사나 집에서 커피를 직접 챙기면 월 30%를 쉽게 절약할 수 있습니다.',
    });
  }

  // 3. 고액 지출 항목
  if (metrics.highestExpense && metrics.highestExpense.amount > total * 0.2) {
    patterns.push({
      title: `단일 대형 지출 (${metrics.highestExpense.item})`,
      description: `'${metrics.highestExpense.item}' 1건이 전체 소비의 ${Math.round((metrics.highestExpense.amount / total) * 100)}% (${metrics.highestExpense.amount.toLocaleString()}원)를 차지했습니다.`,
      type: 'warning',
    });
  }

  // 4. 쇼핑 권고
  const shoppingStats = metrics.categorySummaries.find((c) => c.category === '쇼핑');
  if (shoppingStats && shoppingStats.percentage >= 20) {
    savingRecommendations.push({
      category: '쇼핑',
      potentialSaving: Math.round((shoppingStats.total * 0.2) / 1000) * 1000,
      advice: '장바구니에 담은 후 48시간 동안 보류하는 "쿨다운 규칙"을 적용하면 충동구매의 20%를 줄일 수 있습니다.',
    });
  }

  // 기본 권고 추가
  if (savingRecommendations.length === 0 && secondCategory) {
    savingRecommendations.push({
      category: secondCategory.category,
      potentialSaving: Math.round((secondCategory.total * 0.1) / 1000) * 1000,
      advice: `${secondCategory.category} 항목에서 불필요한 고정 지출이나 구독료가 없는지 점검해보세요.`,
    });
  }

  const score = Math.max(50, Math.min(95, Math.round(100 - (topCategory?.percentage || 30) * 0.8)));

  return {
    overview: `총 ${metrics.totalCount}건 동안 ${metrics.totalAmount.toLocaleString()}원을 지출하셨으며, 일평균 지출액은 ${metrics.dailyAverage.toLocaleString()}원입니다. '${topCategory?.category || '주요 지출'}'이 가장 큰 비중을 차지하고 있어 해당 항목의 최적화가 전체 절약의 핵심입니다.`,
    score,
    patterns,
    savingRecommendations,
    budgetAdvice: `다음 달 권장 총 지출액은 현재보다 약 10% 절감된 ${(Math.round(total * 0.9 / 10000) * 10000).toLocaleString()}원입니다. 매주 일요일 지출 현황을 점검하는 루틴을 만들어보세요.`,
    generatedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
}
