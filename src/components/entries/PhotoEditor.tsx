import { RotateCw } from 'lucide-react';
import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { cropImage } from '../../lib/image';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

/** 'original' 은 사진 원래 비율. 돌리면 가로세로가 뒤집힌다. */
type Aspect = 'original' | number;

const ASPECTS: { label: string; value: Aspect }[] = [
  { label: '원본', value: 'original' },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
];

/**
 * 앨범에서 고른 사진을 회전·크롭한다.
 * 크롭 박스는 비율 고정이고, 사진을 핀치 줌·드래그해서 맞춘다 (react-easy-crop 방식).
 */
export function PhotoEditor({
  src,
  onCancel,
  onDone,
}: {
  /** objectURL 또는 서명 URL. 둘 다 fetch 로 원본을 다시 받을 수 있다. */
  src: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<Aspect>('original');
  const [natural, setNatural] = useState<number | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const turned = (rotation / 90) % 2 === 1;
  const originalAspect = natural === null ? 4 / 3 : turned ? 1 / natural : natural;
  const resolvedAspect = aspect === 'original' ? originalAspect : aspect;

  async function handleDone() {
    if (!area) return;
    setSaving(true);
    try {
      const source = await (await fetch(src)).blob();
      onDone(await cropImage(source, area, rotation));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal aria-label="사진 편집" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={resolvedAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
          onMediaLoaded={(m) => setNatural(m.naturalWidth / m.naturalHeight)}
        />
      </div>

      <div className="flex flex-col gap-3 p-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setAspect(a.value)}
                aria-pressed={aspect === a.value}
                className={cn(
                  'min-h-[44px] rounded-input px-3 text-sm',
                  aspect === a.value ? 'bg-white text-black' : 'bg-white/10',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            aria-label="오른쪽으로 90도 회전"
            className="flex size-11 items-center justify-center rounded-input bg-white/10"
          >
            <RotateCw className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 text-white hover:bg-white/10" onClick={onCancel}>
            취소
          </Button>
          <Button className="flex-1" disabled={!area || saving} onClick={() => void handleDone()}>
            {saving ? '적용 중…' : '완료'}
          </Button>
        </div>
      </div>
    </div>
  );
}
