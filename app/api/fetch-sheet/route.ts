import { NextRequest, NextResponse } from 'next/server';
import { SheetTabInfo } from '@/types/expense';

export async function POST(req: NextRequest) {
  try {
    const { url, targetGid, fetchAllMonths } = await req.json() as {
      url: string;
      targetGid?: string;
      fetchAllMonths?: boolean;
    };

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '유효한 구글 스프레드시트 링크를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. Sheet ID 추출
    const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : (url.length > 20 && !url.includes('/') ? url.trim() : null);

    if (!sheetId) {
      return NextResponse.json(
        { error: '구글 스프레드시트 ID 또는 URL 형식이 올바르지 않습니다. (예: https://docs.google.com/spreadsheets/d/...)' },
        { status: 400 }
      );
    }

    // URL에 포함된 gid 파싱
    const urlGidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const urlGid = urlGidMatch ? urlGidMatch[1] : null;

    // 2. 스프레드시트 메타데이터(모든 탭/시트 목록) 추출
    const viewUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing`;
    let availableTabs: SheetTabInfo[] = [];

    try {
      const htmlRes = await fetch(viewUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();

        // 비공개 시트인 경우
        if (html.includes('accounts.google.com') && !html.includes('docs-sheet-tab-caption')) {
          return NextResponse.json(
            {
              error: '시트가 비공개 상태입니다. 구글 시트 우측 상단 [공유] 버튼 > [일반 액세스]를 "링크가 있는 모든 사용자"로 변경해주세요.',
            },
            { status: 403 }
          );
        }

        // 구글 시트 HTML 내 탭 정보 정규식 파싱
        // e.g. [3,0,\"1513923779\",[{\"1\":[[0,0,\"지출/수입 내역 10월\"
        const tabRegex = /\[(\d+),0,\\"([0-9]+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"/g;
        let match;
        while ((match = tabRegex.exec(html)) !== null) {
          availableTabs.push({
            index: match[1],
            gid: match[2],
            name: match[3],
          });
        }

        // 첫 번째 탭(gid: 0)이 목록에 없으면 캡션 태그에서 추가
        const firstTabMatch = /<div class="[^"]*docs-sheet-tab-caption">([^<]+)<\/div>/.exec(html);
        if (firstTabMatch && !availableTabs.find((t) => t.name === firstTabMatch[1])) {
          availableTabs.unshift({
            index: '0',
            gid: '0',
            name: firstTabMatch[1],
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse sheet tabs from HTML:', e);
    }

    // 기본 시트(gid) 결정:
    // 1) 클라이언트가 특정 targetGid를 요청한 경우
    // 2) URL 파라미터에 gid가 명시된 경우
    // 3) 자동으로 월별 내역 탭 탐색 (예: '지출/수입 내역 10월', '10월' 등)
    // 4) 기본값 '0'
    let selectedGid = targetGid || urlGid;
    let selectedTabName = '';

    if (!selectedGid) {
      // 캘린더나 첫 탭 대신 실제 월별 지출 내역 탭을 우선 선택
      const expenseTab = availableTabs.find((t) =>
        /지출.*내역|가계부.*내역|10월|9월|8월|7월/.test(t.name)
      );
      if (expenseTab) {
        selectedGid = expenseTab.gid;
        selectedTabName = expenseTab.name;
      } else {
        selectedGid = availableTabs[0]?.gid || '0';
        selectedTabName = availableTabs[0]?.name || '기본 시트';
      }
    } else {
      selectedTabName = availableTabs.find((t) => t.gid === selectedGid)?.name || `시트 (GID: ${selectedGid})`;
    }

    // 3. 만약 '전월(전체) 통합 분석' 요청인 경우: 월별 탭(10월, 9월, 8월, 7월...)의 CSV를 모두 수집하여 합침
    if (fetchAllMonths && availableTabs.length > 0) {
      const monthlyTabs = availableTabs.filter((t) => /월/.test(t.name) && !/캘린더|할부/.test(t.name));
      if (monthlyTabs.length > 0) {
        const csvResults: string[] = [];
        for (const tab of monthlyTabs) {
          const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${tab.gid}`;
          const r = await fetch(exportUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            cache: 'no-store',
          });
          if (r.ok) {
            const text = await r.text();
            csvResults.push(text);
          }
        }

        if (csvResults.length > 0) {
          return NextResponse.json({
            success: true,
            isMultiMonth: true,
            multiCsvs: csvResults,
            selectedGid: 'ALL',
            selectedTabName: `전월 통합 분석 (${monthlyTabs.map((m) => m.name.match(/\d+월/)?.[0] || m.name).join(', ')})`,
            availableTabs,
            sheetId,
          });
        }
      }
    }

    // 4. 개별 시트 탭 CSV 다운로드
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${selectedGid}`;
    const altExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${selectedGid}`;

    let response = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) {
      response = await fetch(altExportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        redirect: 'follow',
        cache: 'no-store',
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `스프레드시트를 불러오는 데 실패했습니다 (HTTP ${response.status}). 시트 권한을 확인해주세요.` },
        { status: response.status }
      );
    }

    const csvText = await response.text();

    return NextResponse.json({
      success: true,
      csvText,
      sheetId,
      gid: selectedGid,
      selectedTabName,
      availableTabs,
    });
  } catch (error: unknown) {
    console.error('Fetch sheet error:', error);
    return NextResponse.json(
      { error: '스프레드시트를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
