# 별일 (Byeolil) — 별일 관측국

하찮은 일을 쓸데없이 진지하게. 아무 일도 아닌 일을 관측하고, 속보로 보도하고,
하찮게 시상하는 운세 기록 미니앱입니다. **토스 앱인토스(apps-in-toss)** 로
배포됩니다.

## 기술 스택

- React 19 + TypeScript
- [vinext](https://github.com/cloudflare/vinext) (Next.js 호환, Cloudflare Workers) — 웹 빌드
- Vite + `@apps-in-toss/web-framework` — 토스 미니앱 빌드
- three.js / @react-three/fiber — 포춘볼·왁뿌 3D 씬
- 기록 저장은 localStorage(`byeolil-records-v2`) 기반 (서버 DB 없음)

기록과 도감 해금 상태는 같은 기록 데이터를 기준으로 계산합니다. 토스 계정 동기화가
아니므로 다른 기기·브라우저와 공유되지 않으며, 앱 데이터나 웹뷰 캐시를 지우면 함께
삭제됩니다. 첨부 사진은 1280px 이하 JPEG로 줄여 기록 안에 저장합니다.

## 시작하기

Node.js `>=22.13.0` 필요.

```bash
npm install
npm run dev            # 웹 로컬 개발 (vinext)
npm run dev:miniapp    # 토스 미니앱 로컬 개발 (vite)
```

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | vinext 웹 로컬 개발 서버 |
| `npm run build` | vinext 웹 빌드 (`dist/`) |
| `npm run dev:miniapp` | 미니앱 로컬 개발 서버 |
| `npm run build:miniapp` | 미니앱 빌드 + `ait build` (`miniapp-dist/`, `*.ait`) |
| `npm run deploy:miniapp` | `ait deploy` — 토스 인앱 배포 |
| `npm test` | 웹 빌드 후 SSR 스모크 테스트 |
| `npm run lint` | ESLint |

## 프로젝트 구조

```
app/                  앱 코드 (화면·데이터·3D 씬)
  page.tsx            메인 화면 (관측/예보/기록 탭)
  byeolil-data.ts     운세·문구·캐릭터 데이터
  byeolil-ui.tsx      공용 UI 컴포넌트 (아이콘, 마스코트, 말풍선 등)
  fortune-ball.tsx    포춘볼 3D 씬 (lazy load)
  wakppu-*            왁뿌 깨기 3D 씬
miniapp/              토스 미니앱 엔트리
worker/               Cloudflare Worker 엔트리 (웹 빌드용)
public/               정적 에셋 (마스코트, 3D 모델, 텍스처)
design/, artifacts/   Blender 디자인 소스·프리뷰
scripts/              Blender 에셋 생성 스크립트
tests/                SSR 렌더링 테스트
```

## 네이밍

프로젝트 로마자 표기는 **`byeolil`** 입니다 (~~byeoril~~ 아님). 파일명,
스토리지 키, 설정의 `appName` 모두 `byeolil`로 통일합니다.

## 기여 규칙

에이전트/개발 공통 작업 규칙은 [AGENTS.md](AGENTS.md)를 참고하세요.
빌드 산출물·로그·스크래치 파일은 커밋하지 말고 `.gitignore`에 등록합니다.
