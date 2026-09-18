import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CARE_ACTIONS, type CareAction } from './constants';
import { daysSinceAdopted } from './dday';
import type { EntryPlant } from './../types/models';

function actionLabels(actions: CareAction[]): string {
  return actions
    .map((a) => CARE_ACTIONS.find((meta) => meta.value === a)?.label)
    .filter((l) => l !== undefined)
    .join(', ');
}

/**
 * 웹 AI(ChatGPT / Claude 등)에 그대로 붙여넣을 질문 문구를 만든다.
 *
 * API 호출 대신 사용자가 직접 물어보는 방식이라 비용이 0이다.
 * 대신 사진은 링크로 줄 수 없다 — 웹 AI 는 페이지를 텍스트로만 읽고,
 * 그루는 SPA 라 크롤러에게는 빈 HTML 로 보인다. 파일로 첨부해야 한다.
 *
 * 출력 형식 지시는 Edge Function 의 SYSTEM_PROMPT 를 사람이 읽을 형태로 옮긴 것이다.
 */
export function buildAskPrompt(
  plant: EntryPlant | null,
  entry: { recorded_at: string; actions: CareAction[]; note: string | null },
): string {
  const lines: string[] = ['아래 사진 속 식물 상태를 봐주세요.', ''];

  if (plant) {
    lines.push(`식물: ${plant.species ?? '종류 미상'} (애칭: ${plant.nickname})`);
    lines.push(`함께한 지: ${daysSinceAdopted(parseISO(plant.adopted_at))}일째`);
    if (plant.location) lines.push(`위치: ${plant.location}`);
    lines.push(
      plant.last_watered_at
        ? `마지막 물주기: ${differenceInCalendarDays(new Date(), parseISO(plant.last_watered_at))}일 전`
        : '마지막 물주기: 기록 없음',
    );
  }

  const actions = actionLabels(entry.actions);
  if (actions) lines.push(`이 날 한 일: ${actions}`);
  if (entry.note) lines.push(`메모: ${entry.note}`);

  lines.push(
    '',
    '다음 형식으로 답해주세요.',
    '1. 한 줄 요약',
    '2. 사진에서 보이는 것 — 추측 말고 사실만, 최대 4개',
    '3. 걱정되는 점 — 증상 / 그렇게 본 근거 / 오늘 바로 할 수 있는 조치',
    '4. 관리 팁 — 최대 3개',
    '5. 사진만으로는 알 수 없는 것',
    '',
    '사진 한 장으로 판단하는 한계를 감안해주세요. 확신이 없으면 없다고 말해주시고,',
    '"관리를 잘 해주세요" 같은 막연한 조언 대신 구체적인 행동으로 알려주세요.',
  );

  return lines.join('\n');
}
