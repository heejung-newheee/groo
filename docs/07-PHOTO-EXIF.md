# 07. 사진 업로드 & EXIF 파이프라인

실무에서 가장 많이 깨지는 부분이다. 순서와 폴백이 전부다.

## 파이프라인 — 순서가 중요하다

```
파일 선택 (input[type=file] / 드래그앤드롭)
   │
   ├─① 원본에서 EXIF 읽기          ← ★ 반드시 압축 "전"에
   │     exifr.parse(file, {...})
   │
   ├─② 촬영일시 결정 (폴백 체인)
   │     DateTimeOriginal → CreateDate → file.lastModified → now()
   │
   ├─③ GPS 확인 → 저장하지 않음     ← 개인정보 (09-SECURITY.md)
   │
   ├─④ 리사이즈 + WebP 인코딩       ← 이 시점에 EXIF 전부 소멸 (의도한 것)
   │     createImageBitmap → canvas → toBlob
   │     긴 변 1600px, quality 0.82
   │
   ├─⑤ Supabase Storage 업로드
   │     {user_id}/{plant_id}/{uuid}.webp
   │
   └─⑥ entries + photos row 저장
```

### ⚠️ 압축을 먼저 하면 EXIF가 날아간다

canvas로 다시 그리는 순간 메타데이터는 전부 사라진다.
**순서가 뒤집히면 날짜 추출 기능 자체가 동작하지 않는다.** 이게 이 문서의 핵심이다.

---

## EXIF 추출 구현

```ts
// src/lib/exif.ts
import exifr from 'exifr';

export type DateSource = 'exif' | 'file_mtime' | 'manual';

export interface PhotoMeta {
  takenAt: Date;
  dateSource: DateSource;
  hasGps: boolean;
}

export async function extractPhotoMeta(file: File): Promise<PhotoMeta> {
  let exif: Record<string, unknown> | null = null;

  try {
    exif = await exifr.parse(file, {
      pick: [
        'DateTimeOriginal',   // 촬영 시각 — 1순위
        'CreateDate',         // 디지털화 시각 — 2순위
        'GPSLatitude',
        'GPSLongitude',
      ],
    });
  } catch {
    // 손상 파일 / 미지원 포맷 — 조용히 폴백한다.
    // 여기서 throw 하면 업로드 전체가 막힌다.
  }

  const taken = (exif?.DateTimeOriginal ?? exif?.CreateDate) as Date | undefined;

  return {
    takenAt: taken ?? new Date(file.lastModified),
    dateSource: taken ? 'exif' : 'file_mtime',
    hasGps: exif?.GPSLatitude != null,   // 값 자체는 버린다
  };
}
```

`Orientation`은 뽑지 않는다 — `createImageBitmap`의 `imageOrientation: 'from-image'`가
자동으로 처리하기 때문이다 (아래 참고).

---

## 리사이즈 구현

```ts
// src/lib/image.ts   ※ 웹 전용
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function processImage(file: File): Promise<ProcessedImage> {
  // imageOrientation: 'from-image' 가 EXIF Orientation 을 자동 적용한다.
  // 이걸 빼면 아이폰 세로 사진이 눕는다.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 컨텍스트를 만들 수 없습니다');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITY });
  return { blob, width, height };
}
```

**효과**: 요즘 폰 사진 5~12MB → **200~400KB**. 약 25배 절감.
Storage 요금과 로딩 속도 양쪽에 직결된다.

---

## 알아둬야 할 현실 (중요)

### 1. EXIF가 아예 없는 사진이 많다

| 출처 | EXIF |
|---|---|
| 카메라 앱으로 직접 촬영 | ✅ 있음 |
| 카카오톡/인스타로 받은 사진 | ❌ 대부분 제거됨 |
| 스크린샷 | ❌ 없음 |
| 일부 갤러리 앱의 편집 후 저장 | ❌ 제거됨 |

**체감 30~40%는 날짜가 안 나온다.**

→ 자동 추출은 **"편의"지 "보장"이 아니다.**
날짜 입력칸을 항상 보여주고, 항상 수정 가능하게 하고, 출처를 문구로 밝힌다.

### 2. HEIC (아이폰 기본 포맷)

- Chrome/Android는 HEIC를 디코딩하지 못해 **미리보기가 깨진다**
- `exifr`은 HEIC의 EXIF는 읽을 수 있다 (디코딩과 별개)

**대응 (MVP)**

```html
<input type="file" accept="image/jpeg,image/png,image/webp" multiple />
```

`accept`에 HEIC를 넣지 않으면 **iOS Safari가 선택 시 자동으로 JPEG로 변환**해준다.
그래도 HEIC가 들어오면 감지해서 안내한다:

```ts
const isHeic = /\.hei[cf]$/i.test(file.name) || file.type.includes('hei');
if (isHeic) {
  // "이 사진은 HEIC 형식이라 미리보기가 안 보일 수 있어요.
  //  아이폰 설정 > 카메라 > 포맷 > '높은 호환성'으로 바꾸면 해결됩니다."
}
```

wasm HEIC 디코더는 번들이 2MB 이상 늘어난다. **MVP에서는 넣지 않는다.**

### 3. 타임존

EXIF `DateTimeOriginal`은 **타임존 정보가 없다.** `"2026:09:14 15:22:31"` 같은 로컬 시각 문자열일 뿐이다.

→ `profiles.timezone`(기본 `Asia/Seoul`) 기준으로 해석해 `timestamptz`로 저장한다.
해외에서 찍은 사진은 시각이 어긋날 수 있다. 사용자가 수정 가능하므로 허용 가능한 오차다.

### 4. 파일 크기 / 개수 제한

| 항목 | 제한 | 검증 위치 |
|---|---|---|
| 파일당 크기 | 10MB | 클라이언트 + Storage 버킷 설정 |
| 일지당 장수 | 5장 | 클라이언트 |
| 허용 MIME | jpeg / png / webp | 클라이언트 + 버킷 `allowed_mime_types` |

**클라이언트 검증만으로는 부족하다.** 버킷 설정에서도 막아야 우회가 불가능하다.

---

## 업로드 실패 처리

모바일 웹은 네트워크가 자주 끊긴다.

```ts
// src/stores/uploadStore.ts (Zustand)
interface UploadTask {
  id: string;
  file: File;
  entryDraft: EntryDraft;
  status: 'queued' | 'uploading' | 'failed' | 'done';
  progress: number;
  retries: number;
}
```

- 실패 시 큐에 남기고 배너로 "나중에 다시 시도" 노출
- 재시도는 **최대 3회, 지수 백오프** (1s → 4s → 16s)
- 3회 실패 시 사용자에게 명시적으로 알림 (조용히 버리지 않는다)
- 업로드 중 페이지 이탈 시 `beforeunload` 경고

---

## 테스트 케이스 (W3 완료 기준)

| # | 입력 | 기대 |
|---|---|---|
| 1 | EXIF 있는 JPEG | `dateSource='exif'`, 촬영일 정확, "사진에서 가져왔어요" 표시 |
| 2 | EXIF 없는 PNG | `dateSource='file_mtime'`, "파일 날짜를 썼어요" 표시 |
| 3 | 아이폰 HEIC | EXIF 읽기 성공, 안내 메시지 노출, 업로드는 진행됨 |
| 4 | 12MB 사진 | 400KB 이하로 압축, 업로드 성공 |
| 5 | 세로로 찍은 아이폰 사진 | 업로드 후에도 **세로로 표시** (Orientation 보정) |
| 6 | GPS 있는 사진 | Storage 파일에 GPS **없음** (`exiftool`로 확인) |
| 7 | 손상된 파일 | 에러 없이 폴백, 업로드 진행 |
| 8 | 업로드 중 네트워크 끊김 | 큐에 남고 재시도 가능 |

### 6번 검증 방법

```bash
# 업로드된 파일을 내려받아 확인
npx exiftool downloaded.webp | grep -i gps
# → 아무것도 출력되지 않아야 통과
```
