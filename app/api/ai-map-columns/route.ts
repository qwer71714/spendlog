import { NextRequest, NextResponse } from 'next/server';
import { callGeminiGenerate } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { headers, sampleRows, apiKey: userApiKey } = await req.json() as {
      headers: string[];
      sampleRows: (string | number | null | undefined)[][];
      apiKey?: string;
    };

    if (!headers || headers.length === 0) {
      return NextResponse.json({ error: '분석할 열(헤더) 정보가 없습니다.' }, { status: 400 });
    }

    const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

    // AI API 키가 없는 경우: 스마트 룰 기반 감지 응답 반환
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        isAi: false,
        mapping: heuristicMap(headers, sampleRows),
        explanation: '내장된 스마트 규칙으로 열을 자동 매핑했습니다.',
      });
    }

    const systemPrompt = `
      당신은 데이터 엔지니어링 및 가계부 데이터 분석 전문가입니다.
      사용자가 제공한 스프레드시트의 열(헤더) 이름 목록과 상위 샘플 데이터 행들을 분석하여,
      소비 기록 시각화에 필요한 4가지 핵심 열(날짜, 지출 금액, 내용/가맹점, 카테고리)을 정확히 찾아 매핑하세요.

      주의사항:
      1. '금액' 관련 열이 '입금'과 '출금'으로 나뉘어 있다면, 소비/지출 분석이므로 반드시 '출금' 또는 '지출' 열을 amountCol로 선택해야 합니다.
      2. '내용'/'가맹점'과 '적요'가 함께 있다면, 상호명이 들어있는 열을 itemCol로, 결제수단(체크카드, 신용카드, 계좌이체 등)이 들어있는 '적요' 또는 '사용카드' 열을 paymentCol로 선택하세요.
      3. 반환하는 컬럼 이름은 반드시 제공된 [열 목록]에 정확히 일치하는 문자열이어야 합니다.
      4. 카테고리나 결제수단 열이 마땅치 않다면 빈 문자열("")로 지정하세요.
      5. 반드시 아래 JSON 형식으로만 응답하세요. 마크다운 백틱 없이 순수 JSON 문자열만 반환하세요:

    {
      "dateCol": "선택한 날짜 열 이름",
      "amountCol": "선택한 지출금액 열 이름",
      "itemCol": "선택한 내용/사용처 열 이름",
      "categoryCol": "선택한 카테고리/분류 열 이름 (없으면 "")",
      "paymentCol": "선택한 결제수단/카드 열 이름 (없으면 "")",
      "explanation": "해당 양식을 어떻게 분석하여 매핑했는지 1~2줄 한국어 설명"
    }`;

    const userPrompt = `[열 목록 (Headers)]:
${JSON.stringify(headers)}

[상위 샘플 데이터 행 (Sample Rows)]:
${JSON.stringify(sampleRows.slice(0, 5))}`;

    const result = await callGeminiGenerate(apiKey, systemPrompt, userPrompt);

    if (!result.success || !result.text) {
      return NextResponse.json({
        success: true,
        isAi: false,
        mapping: heuristicMap(headers, sampleRows),
        explanation: 'Gemini 응답 실패로 내장 규칙을 적용했습니다.',
      });
    }

    const parsed = extractJson(result.text);

    return NextResponse.json({
      success: true,
      isAi: true,
      mapping: parsed,
      explanation: parsed.explanation || 'Gemini AI가 양식을 성공적으로 분석했습니다.',
    });
  } catch (error: unknown) {
    console.error('AI map columns error:', error);
    return NextResponse.json(
      { error: '열 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function extractJson(rawText?: string) {
  if (!rawText) return {};
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

function heuristicMap(headers: string[], sampleRows: (string | number | null | undefined)[][]) {
  const findCol = (patterns: RegExp[]): string => {
    return headers.find((h) => patterns.some((p) => p.test(h.toLowerCase().trim()))) || '';
  };

  const dateCol = findCol([/날짜/, /일자/, /거래일/, /승인일/, /이용일/, /date/]) || headers[0] || '';
  const amountCol = findCol([/출금/, /지출/, /승인금액/, /이용금액/, /결제금액/, /금액/, /amount/, /price/]) || headers[headers.length - 1] || '';
  let itemCol = findCol([/내용/, /항목/, /가맹점/, /사용처/, /상호/, /item/, /merchant/, /title/]);
  if (!itemCol) {
    itemCol = findCol([/적요/, /구분/]) || (headers.length > 1 ? headers[1] : '');
  }
  const categoryCol = findCol([/카테고리/, /분류/, /업종/, /종류/, /category/]);
  let paymentCol = findCol([/결제수단/, /사용카드/, /카드/, /수단/, /payment/]);

  if (!paymentCol && sampleRows && sampleRows.length > 0) {
    const candidateHeaders = headers.filter(
      (h) => h && h !== dateCol && h !== amountCol && h !== itemCol && h !== categoryCol
    );
    for (const cand of candidateHeaders) {
      const colIdx = headers.indexOf(cand);
      const isPaymentKeyword = /적요|결제|수단|구분|카드/.test(cand);
      const hasPaymentValues = sampleRows.some((r) => {
        const val = String(r[colIdx] || '').trim();
        return /카드|체크|신용|이체|현금|페이|pay|card/i.test(val);
      });
      if (isPaymentKeyword || hasPaymentValues) {
        paymentCol = cand;
        break;
      }
    }
  }

  return {
    dateCol,
    amountCol,
    itemCol,
    categoryCol,
    paymentCol,
  };
}
