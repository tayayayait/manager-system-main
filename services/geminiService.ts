import { GoogleGenAI } from '@google/genai';
import { Activity, ChangeLogEntry, Company, Deal, DealStage } from '../types';

// Demo note: API keys live in the client bundle for this showcase only.
const geminiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const chatgptKey = (
  import.meta.env.VITE_CHATGPT_API_KEY ||
  import.meta.env.VITE_OPENAI_API_KEY ||
  ''
).trim();

const aiClient = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const openAIEndpoint = 'https://api.openai.com/v1/responses';

const buildContext = (
  companies: Company[],
  deals: Deal[],
  activities: Activity[],
  changeLogs: ChangeLogEntry[],
  ownerName?: string,
) => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const companyLines = companies
    .map(
      c =>
        `- 고객사: ${c.name} (담당: ${c.owner || c.repName || '미지정'})\n  상태: ${c.status}\n  최근 활동일: ${c.lastContact}\n  사업자번호: ${c.businessNumber || '미등록'}\n  비고/노트: ${c.notes || '-'}`
    )
    .join('\n\n');

  const companyIds = new Set(companies.map(c => c.id));
  const recentActivities = activities
    .filter(a => companyIds.has(a.companyId) && new Date(a.occurredAt) >= lastWeek)
    .map(a => `- ${a.occurredAt} / ${a.actor} / ${a.type} / ${a.summary}${a.nextStep ? ` (다음: ${a.nextStep})` : ''}`)
    .join('\n');

  const recentChanges = changeLogs
    .filter(c => companyIds.has(c.entityId) && new Date(c.changedAt) >= lastWeek)
    .map(c => `- ${c.changedAt} / ${c.entityType} ${c.entityId} / ${c.fieldName}: ${c.oldValue} -> ${c.newValue} (${c.changedBy})`)
    .join('\n');

  const relatedDeals = deals.filter(d => companyIds.has(d.companyId));
  const stageCounts = Object.values(DealStage).reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = relatedDeals.filter(d => d.stage === stage).length;
    return acc;
  }, {});
  const pipelineSummary = `총 ${relatedDeals.length}건 · 단계별: ${Object.entries(stageCounts)
    .map(([stage, cnt]) => `${stage}:${cnt}`)
    .join(', ')}`;

  return `
[담당자] ${ownerName || '미지정'}

[고객사 목록]
${companyLines}

[지난주 활동]
${recentActivities || '-'}

[지난주 필드 변경]
${recentChanges || '-'}

[파이프라인]
${pipelineSummary}
`;
};

const buildPrompt = (context: string) => `
당신은 B2B 영업 전문가이자 비서입니다. 아래 제공된 고객사 업데이트 데이터를 바탕으로 전문적인 '주간 영업 업무 보고서'를 한국어로 작성해주세요.

보고서는 다음 형식을 따라주세요 (Markdown 사용):

### 1. 주요 성과 및 현황 (High Priority)
- '협상', '계약' 단계에 있는 건들을 중심으로 진행 상황을 요약해주세요.

### 2. 활동 요약 (Activity Summary)
- 지난주(7일) 진행된 주요 미팅/이메일/콜을 시간순으로 요약하고, 다음 스텝이 필요한 항목은 강조해주세요.

### 3. 리스크 및 이슈 (Issues)
- 진행이 정체되거나 실주(Drop)한 건에 대한 원인 분석 또는 특이사항을 언급해주세요.

### 4. 전환율 & 파이프라인 변화
- 리드→제안→협상→계약 단계 전환율과, 지난주 대비 단계별 증가/감소를 간단히 언급해주세요.

### 5. 차주 계획 (Next Steps)
- 2-3개의 주요 고객사에 대해 다음 주에 취해야 할 구체적인 액션 아이템을 제안해주세요.

[데이터]
${context}

톤앤매너: 비즈니스 격식체 (합니다/했습니다), 명확하고 간결하게 작성.
`;

const extractOpenAIText = (payload: any): string => {
  const segments: string[] = [];

  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    segments.push(payload.output_text.trim());
  }

  const accumulateContent = (value: any) => {
    if (!value) return;
    if (typeof value === 'string') {
      segments.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => accumulateContent(item));
      return;
    }
    if (typeof value.text === 'string') {
      segments.push(value.text.trim());
      return;
    }
    if (value?.content) {
      accumulateContent(value.content);
    }
  };

  if (Array.isArray(payload?.output)) {
    payload.output.forEach((item: any) => accumulateContent(item?.content));
  }

  if (Array.isArray(payload?.choices)) {
    payload.choices.forEach((choice: any) => {
      if (choice?.message?.content) {
        accumulateContent(choice.message.content);
      } else if (choice?.content) {
        accumulateContent(choice.content);
      }
    });
  }

  return segments.join('\n\n').trim() || '응답이 생성되지 않았습니다.';
};

const generateOpenAIReport = async (prompt: string): Promise<string> => {
  const res = await fetch(openAIEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${chatgptKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ChatGPT API Error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return extractOpenAIText(data);
};

const generateGeminiReport = async (prompt: string): Promise<string> => {
  if (!aiClient) {
    throw new Error('Gemini API Key가 설정되지 않았습니다.');
  }
  const response = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text || '응답이 생성되지 않았습니다.';
};

export const generateWeeklyReport = async (
  companies: Company[],
  deals: Deal[],
  activities: Activity[],
  changeLogs: ChangeLogEntry[],
  ownerName?: string,
): Promise<string> => {
  if (companies.length === 0) {
    throw new Error('선택된 회사가 없습니다.');
  }
  const context = buildContext(companies, deals, activities, changeLogs, ownerName);
  const prompt = buildPrompt(context);

  if (chatgptKey) {
    try {
      return await generateOpenAIReport(prompt);
    } catch (error) {
      console.error('OpenAI 보고서 오류:', error);
      return '보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  if (!aiClient) {
    return '오류: AI API Key가 설정되지 않았습니다. VITE_CHATGPT_API_KEY 또는 VITE_GEMINI_API_KEY를 .env.local에서 확인하세요.';
  }

  try {
    return await generateGeminiReport(prompt);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return '보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
};
