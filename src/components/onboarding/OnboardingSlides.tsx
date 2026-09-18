import { Bot, Camera, Droplet, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { Carousel } from '../ui/Carousel';

/**
 * 랜딩의 앱 소개 슬라이드. 스와이프·점·화살표는 공용 Carousel 이 맡는다.
 */
const SLIDES = [
  {
    Icon: Camera,
    title: '사진 한 장이면 돼요',
    body: '올린 사진에서 촬영한 날짜를 자동으로 가져와요. 며칠 전에 찍어둔 사진도 그날로 기록됩니다.',
    Visual: PhotoVisual,
  },
  {
    Icon: Droplet,
    title: '물주기를 놓치지 않게',
    body: '주기를 정해두면 홈에서 오늘 물 줄 아이를 먼저 보여줘요. 다 주고 나면 탭 한 번으로 기록됩니다.',
    Visual: WateringVisual,
  },
  {
    Icon: Sprout,
    title: '자라는 게 눈에 보여요',
    body: '기록이 쌓이면 타임라인이 됩니다. 한 달 전 잎과 오늘 잎을 나란히 볼 수 있어요.',
    Visual: TimelineVisual,
  },
  {
    Icon: Bot,
    title: '이상하면 물어보세요',
    body: '잎이 누레졌을 때, 식물 정보를 정리한 질문 문구를 만들어드려요. 복사해서 AI에게 그대로 물어보면 됩니다.',
    Visual: AskVisual,
  },
] as const;

export function OnboardingSlides() {
  return (
    <Carousel
      label="앱 사용 방법"
      slides={SLIDES.map(({ Icon, title, body, Visual }) => (
        <div key={title} className="flex flex-col items-center gap-4 px-2 text-center">
          <Visual />
          <div className="flex flex-col items-center gap-2">
            <Icon className="size-6 text-leaf-500" aria-hidden />
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {body}
            </p>
          </div>
        </div>
      ))}
    />
  );
}

/* ── 슬라이드별 미니 목업 ──────────────────────────────
   실제 스크린샷이 없어도 화면이 어떻게 생겼는지 감을 주기 위한 장식이다.
   정보는 전부 위의 title/body 에 글로도 있으므로 aria-hidden 처리한다. */

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="flex h-44 w-full max-w-64 flex-col justify-center gap-2 rounded-card border p-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      {children}
    </div>
  );
}

function PhotoVisual() {
  return (
    <Frame>
      <div className="flex-1 rounded-input bg-leaf-100" />
      <div className="rounded-input bg-leaf-50 px-2 py-1.5 text-left text-[10px] text-leaf-700">
        📅 2026-09-14 15:22
        <br />
        <span className="opacity-70">ⓘ 사진에서 촬영일을 가져왔어요</span>
      </div>
    </Frame>
  );
}

function WateringVisual() {
  return (
    <Frame>
      <span className="text-left text-[11px] font-semibold">☀️ 오늘 할 일</span>
      {['몬스테라', '산세베리아'].map((name) => (
        <div key={name} className="flex items-center justify-between gap-2">
          <span className="text-[11px]">💧 {name}</span>
          <span className="rounded-chip bg-leaf-100 px-2 py-1 text-[10px] font-semibold text-leaf-700">
            물줬어요
          </span>
        </div>
      ))}
    </Frame>
  );
}

function TimelineVisual() {
  return (
    <Frame>
      {['09/14', '09/07', '08/28'].map((date, i) => (
        <div key={date} className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-leaf-500" />
          <span className="w-9 shrink-0 text-left text-[10px] tabular-nums opacity-70">{date}</span>
          <span
            className="h-7 flex-1 rounded"
            style={{ background: 'var(--color-leaf-100)', opacity: 1 - i * 0.25 }}
          />
        </div>
      ))}
    </Frame>
  );
}

function AskVisual() {
  return (
    <Frame>
      <span className="text-left text-[11px] font-semibold">🤖 AI에게 물어보기</span>
      <div
        className="flex-1 rounded-input p-2 text-left text-[9px] leading-snug"
        style={{ background: 'var(--bg-elevated)' }}
      >
        식물: 몬스테라
        <br />
        함께한 지: 182일째
        <br />
        마지막 물주기: 12일 전
      </div>
      <span className="rounded-input bg-leaf-500 py-1 text-[10px] font-semibold text-white">
        문구 복사
      </span>
    </Frame>
  );
}
