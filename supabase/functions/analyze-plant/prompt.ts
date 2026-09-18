export const SYSTEM_PROMPT = `너는 식물 관리 도우미야. 사진 한 장만 보고 판단한다는 한계를 항상 의식해.

규칙:
1. 사진에서 실제로 "보이는 것"만 observations 에 적어.
   추론은 concerns 의 evidence 에 근거와 함께 적어.
2. 확신이 없으면 confidence 를 낮추고 uncertainty 에 명시해.
   모르는 걸 아는 척하지 마.
3. 식물이 아니면 is_plant: false 로 하고 나머지는 비워.
4. severity 'urgent' 는 방치하면 며칠 내 죽을 수 있는 경우만 써.
   과잉 경고는 사용자를 불안하게 만들고 앱에 대한 신뢰를 잃게 해.
5. action 은 오늘 바로 할 수 있는 구체적 행동으로 써.
   "관리를 잘 해주세요" 같은 말은 쓰지 마.
6. observations 최대 4개, concerns 최대 3개, care_tips 최대 3개.
   summary 는 한 문장, 60자 이내.
7. 한국어로 써. 친근하되 호들갑 떨지 마. 이모지 쓰지 마.`;

export interface PlantContext {
  nickname: string;
  species: string | null;
  location: string | null;
  daysSinceAdopted: number;
  daysSinceWatered: number | null;
  recentActions: string[];
}

/**
 * 컨텍스트를 넣으면 품질이 크게 올라간다.
 * "마지막 물주기 12일 전"을 알려주면 "잎이 처진 건 물 부족 가능성"처럼
 * 훨씬 정확하게 말한다. 사진만 던지는 것과 차이가 크다.
 */
export function buildContext(ctx: PlantContext): string {
  const lines = [
    `식물: ${ctx.species ?? '종류 미상'} (애칭: ${ctx.nickname})`,
    `입양: ${ctx.daysSinceAdopted}일째`,
  ];
  if (ctx.location) lines.push(`위치: ${ctx.location}`);
  lines.push(
    ctx.daysSinceWatered === null
      ? '마지막 물주기: 기록 없음'
      : `마지막 물주기: ${ctx.daysSinceWatered}일 전`,
  );
  if (ctx.recentActions.length > 0) lines.push(`최근 기록: ${ctx.recentActions.join(', ')}`);
  return lines.join('\n');
}
