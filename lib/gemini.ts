// Gemini API 연동 및 Gemini 3.8 / 3.x 우선 탐색 & 보통 생각 깊이(Thinking Budget) 엔진

export interface GeminiCallResult {
  success: boolean;
  text?: string;
  modelUsed?: string;
  error?: string;
}

export interface ModelValidationResult {
  valid: boolean;
  models?: string[];
  error?: string;
}

interface GoogleModelItem {
  name: string;
  supportedGenerationMethods?: string[];
}

// 1. Google API에서 사용 가능한 모델 목록 동적 조회
export async function getAvailableGeminiModels(apiKey: string): Promise<{
  version: string;
  models: GoogleModelItem[];
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  const versions = ['v1beta', 'v1'];
  let lastError = '';

  for (const ver of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${cleanKey}`;
      const res = await fetch(url, { cache: 'no-store' });

      if (res.ok) {
        const data = await res.json();
        const models: GoogleModelItem[] = (data.models || []).filter(
          (m: GoogleModelItem) => m.supportedGenerationMethods?.includes('generateContent')
        );

        console.log(`[Gemini] ${ver} ListModels 성공: 총 ${models.length}개 모델 발견`);
        if (models.length > 0) {
          return { version: ver, models };
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        console.warn(`[Gemini] ${ver} ListModels 실패 (${res.status}):`, errMsg);
        lastError = errMsg;

        if (res.status === 400 && (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID'))) {
          return {
            version: ver,
            models: [],
            error: '입력하신 Gemini API 키가 올바르지 않습니다. Google AI Studio에서 올바른 키인지 확인해주세요.',
          };
        }
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return { version: 'v1beta', models: [], error: lastError };
}

// 2. 키 유효성 검증 (UI 모달 테스트용)
export async function validateGeminiKey(apiKey: string): Promise<ModelValidationResult> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'API 키가 비어있습니다.' };
  }

  const { models, error } = await getAvailableGeminiModels(apiKey);

  if (models.length > 0) {
    return {
      valid: true,
      models: models.map((m) => m.name.replace('models/', '')),
    };
  }

  return {
    valid: false,
    error: error || '사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키를 확인해주세요.',
  };
}

// 3. Gemini 3.8 / 최신 모델 우선 호출 및 '보통' 생각 깊이(Thinking Budget: 1024) 적용
export async function callGeminiGenerate(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<GeminiCallResult> {
  const cleanKey = apiKey.trim();

  // 1단계: Google API에서 현재 키로 호출 가능한 모델 목록 조회
  const { version, models, error } = await getAvailableGeminiModels(cleanKey);

  const sortedModels: string[] = [];

  if (models.length > 0) {
    const allNames = models.map((m) => m.name);

    // ★ 0순위: Gemini 3.8 / 3.x 계열 모델 최우선 선택 (항상 3.8을 1순위로 시도)
    const gemini38Models = allNames
      .filter((n) => /3\.8|3\.|3-/.test(n) && !n.includes('omni'))
      .sort((a, b) => b.localeCompare(a));

    // 만약 API 목록에 3.8이 아직 명시되지 않았더라도 3.8 모델 호출을 최우선으로 시도하도록 보장
    if (!gemini38Models.some((n) => n.includes('3.8'))) {
      gemini38Models.unshift('models/gemini-3.8-flash', 'models/gemini-3.8-pro');
    }

    // 1순위: 안정적인 범용 Flash 최신 모델
    const stableFlash = allNames
      .filter((n) => n.includes('flash') && !/3\.8|3\.|3-/.test(n) && !n.includes('omni') && !n.includes('preview'))
      .sort((a, b) => {
        if (a.includes('gemini-flash-latest')) return -1;
        if (b.includes('gemini-flash-latest')) return 1;
        if (a.includes('lite')) return -1;
        return b.localeCompare(a);
      });

    // 2순위: 기타 Flash 모델
    const otherFlash = allNames
      .filter((n) => n.includes('flash') && (n.includes('omni') || n.includes('preview')));

    // 3순위: Pro 모델
    const proModels = allNames
      .filter((n) => n.includes('pro') && !n.includes('flash') && !n.includes('omni'))
      .sort((a, b) => b.localeCompare(a));

    const others = allNames.filter(
      (n) => !gemini38Models.includes(n) && !stableFlash.includes(n) && !otherFlash.includes(n) && !proModels.includes(n)
    );

    sortedModels.push(...gemini38Models, ...stableFlash, ...otherFlash, ...proModels, ...others);
  }

  // 폴백 목록: 3.8 모델 최우선
  if (sortedModels.length === 0) {
    sortedModels.push(
      'models/gemini-3.8-flash',
      'models/gemini-3.8-pro',
      'models/gemini-flash-latest',
      'models/gemini-flash-lite-latest'
    );
  }

  console.log('[Gemini] 호출 시도할 모델 순서 (3.8 우선):', sortedModels.slice(0, 5));

  let lastErrMsg = error || '';

  // 정렬된 모델 순서대로 generateContent 호출
  for (const modelPath of sortedModels) {
    const url = `https://generativelanguage.googleapis.com/${version}/${modelPath}:generateContent?key=${cleanKey}`;

    // 생각 깊이: '보통' (Moderate reasoning depth - 1024 토큰)
    const thinkingBudget = 1024;

    const bodyWithThinking = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        thinkingConfig: {
          thinkingBudget: thinkingBudget, // 보통 깊이 고정
        },
      },
    };

    const bodyWithoutThinking = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    // 1차 시도: thinkingConfig(보통 깊이) 포함 전송
    try {
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithThinking),
      });

      // 만약 모델이 thinkingConfig 필드를 미지원하는 경우(400 에러) thinkingConfig 제외하고 재시도
      if (!res.ok && res.status === 400) {
        const errJson = await res.clone().json().catch(() => null);
        const errMsg = errJson?.error?.message || '';
        if (errMsg.includes('thinkingConfig') || errMsg.includes('thinking_budget')) {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithoutThinking),
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleanModelName = modelPath.replace('models/', '');
          console.log(`[Gemini] 모델 호출 성공: ${cleanModelName} (생각 깊이: 보통)`);
          return {
            success: true,
            text,
            modelUsed: `${cleanModelName} (생각 깊이: 보통)`,
          };
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
        lastErrMsg = errMsg;
        console.warn(`[Gemini] ${modelPath} 호출 실패:`, errMsg);

        if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
          return {
            success: false,
            error: '입력하신 Gemini API 키가 올바르지 않습니다. Google AI Studio에서 올바른 키인지 확인해주세요.',
          };
        }
      }
    } catch (err: unknown) {
      lastErrMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    success: false,
    error: lastErrMsg || 'Gemini 모델을 호출할 수 없습니다. API 키 상태를 확인해주세요.',
  };
}
