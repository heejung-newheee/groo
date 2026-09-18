# 그루(Groo) 기획 문서

식물 성장 기록 다이어리. 웹(반응형) 먼저, 이후 React Native.

## 문서 목록

| 파일 | 내용 |
|---|---|
| [00-OVERVIEW.md](./00-OVERVIEW.md) | 서비스 개요, 타겟, 핵심 가치 |
| [01-NAMING.md](./01-NAMING.md) | 네이밍 검토, 대안, 카피 |
| [02-FEATURES.md](./02-FEATURES.md) | 기능 기획안 (MVP / v1.1 / v2) |
| [03-SCREENS.md](./03-SCREENS.md) | 화면 설계, 와이어프레임, 반응형 레이아웃 |
| [04-DESIGN-SYSTEM.md](./04-DESIGN-SYSTEM.md) | 디자인 토큰, 컬러, 타이포, 컴포넌트 규칙 |
| [05-ARCHITECTURE.md](./05-ARCHITECTURE.md) | 서비스 아키텍처, 폴더 구조, 스택 선정 근거 |
| [06-DATABASE.md](./06-DATABASE.md) | DB 스키마, RLS, Storage 정책 |
| [07-PHOTO-EXIF.md](./07-PHOTO-EXIF.md) | 사진 업로드 & EXIF 추출 파이프라인 |
| [08-AI-PIPELINE.md](./08-AI-PIPELINE.md) | AI 진단 파이프라인, 프롬프트, 쿼터 |
| [09-SECURITY.md](./09-SECURITY.md) | 보안 · 안전성 체크리스트 |
| [11-COST.md](./11-COST.md) | 인프라 / AI 비용 분석 |
| [12-ROADMAP.md](./12-ROADMAP.md) | 개발 로드맵 |
| [13-CLI.md](./13-CLI.md) | 프로젝트 생성에 사용한 CLI 전체 기록 |

## 확정된 결정사항 (2026-09-16)

- **AI 비용 모델**: 전원 무료 (일일 쿼터로 통제)
- **소셜 로그인**: Google + Apple + **Kakao**
- **AI 실행 방식**: **버튼 방식** (자동 실행 안 함) — 토큰 비용 통제
- **백엔드**: Supabase (직접 서버 개발 안 함 — 근거는 11-COST.md)
