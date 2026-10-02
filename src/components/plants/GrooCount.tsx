import { BRAND } from '../../lib/constants';

/**
 * "My N Groo" — 워드마크와 같은 폰트로. 숫자와 Groo 는 로고 색까지 맞춘다.
 * 크기는 em 이라 쓰는 곳(Home h2, 내 식물 h1)의 제목보다 살짝 크게 나온다.
 */
export function GrooCount({ count }: { count: number }) {
  return (
    <span className="font-brand text-[1.15em]">
      My{' '}
      <span className="tabular text-leaf-500">
        {count} {BRAND.wordmark}
      </span>
    </span>
  );
}
