import { NextRequest, NextResponse } from 'next/server';
import { validateGeminiKey } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'API 키를 입력해주세요.' }, { status: 400 });
    }

    const result = await validateGeminiKey(apiKey);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Validate key error:', error);
    return NextResponse.json(
      { valid: false, error: '검증 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
