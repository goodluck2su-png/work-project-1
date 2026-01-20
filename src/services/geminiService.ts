const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

export const analyzeExcelWithAI = async (
  headers: string[],
  sampleData: (string | number | null)[][],
  targetFormat: string
): Promise<{ columnMapping: Record<string, string>; suggestions: string[] }> => {
  const prompt = `
엑셀 데이터를 분석해주세요.

현재 헤더: ${headers.join(', ')}
샘플 데이터 (처음 3행):
${sampleData.slice(0, 3).map((row) => row.join(' | ')).join('\n')}

목표 서식: ${targetFormat}

다음 형식의 JSON으로 응답해주세요:
{
  "columnMapping": {
    "목표컬럼명1": "현재컬럼명1",
    "목표컬럼명2": "현재컬럼명2"
  },
  "suggestions": ["제안1", "제안2"]
}

컬럼 매핑과 데이터 변환에 대한 제안을 포함해주세요.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('AI 분석 요청 실패');
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { columnMapping: {}, suggestions: ['AI 응답을 파싱할 수 없습니다.'] };
  } catch (error) {
    console.error('AI 분석 오류:', error);
    return { columnMapping: {}, suggestions: ['AI 분석 중 오류가 발생했습니다.'] };
  }
};

export const generateExcelTemplate = async (
  description: string
): Promise<{ headers: string[]; sampleRow: string[] }> => {
  const prompt = `
사용자가 원하는 엑셀 서식을 생성해주세요.

요청: ${description}

다음 형식의 JSON으로 응답해주세요:
{
  "headers": ["컬럼1", "컬럼2", "컬럼3"],
  "sampleRow": ["샘플값1", "샘플값2", "샘플값3"]
}

실무에서 자주 사용되는 적절한 컬럼명과 샘플 데이터를 포함해주세요.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('템플릿 생성 요청 실패');
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { headers: [], sampleRow: [] };
  } catch (error) {
    console.error('템플릿 생성 오류:', error);
    return { headers: [], sampleRow: [] };
  }
};
