# 작업 규칙 (AI 에이전트 & 개발자 공통)

## 프로젝트 개요

"별일(byeolil)"은 토스 앱인토스로 배포되는 운세 기록 미니앱입니다.
웹 빌드(vinext/Cloudflare)와 미니앱 빌드(vite + ait) 두 갈래가 있습니다.
구조와 명령어는 [README.md](README.md) 참고.

## .gitignore 관리 — 중요

**작업 중 생기는 산출물·스크래치 파일은 절대 커밋하지 말고, 새 유형이
생기면 즉시 `.gitignore`에 패턴을 추가하세요.** 과거에 `.venv/`(860개
파일)가 통째로 커밋된 사고가 있었습니다. 커밋 전 `git status`로 의도하지
않은 파일이 스테이징되지 않았는지 반드시 확인하세요.

커밋 금지 대상 예시:

- 빌드 산출물: `dist/`, `miniapp-dist/`, `.next/`, `.vinext/`, `*.ait`, `*.tsbuildinfo`
- 의존성·가상환경: `node_modules/`, `.venv/`
- 로그·프로세스 파일: `*.log`, `*.pid`, `.wrangler/`
- 도구별 로컬 상태: `.claude/settings.local.json`, `.codex_tmp_*/`, `.vs/`
- Blender 백업(`*.blend1`)·임시 파일 (`*_temp.blend` 같은 이름의 파일)
- 일회성 스크린샷·검토용 이미지 — 필요하면 `design/` 아래 의미 있는
  이름으로 넣고, 아니면 커밋하지 않기

## 네이밍

- 로마자 표기는 **`byeolil`** (byeoril 아님). 파일명, import 경로,
  localStorage 키, `apps-in-toss.config.ts`의 `appName`, 컴포넌트 이름까지
  전부 통일.
- UI 문구는 한국어. "별일 관측국" 세계관(관측, 속보, 시상)의 톤을 유지.

## 코드 규칙

- 데이터(운세 문구, 캐릭터 정의)는 `app/byeolil-data.ts`, 공용 UI는
  `app/byeolil-ui.tsx`, 화면 로직은 `app/page.tsx`에 둡니다.
- 무거운 3D 씬(`fortune-ball.tsx` 등)은 `lazy()`로 지연 로드합니다.
- 서버 DB 없음 — 기록은 localStorage(`byeolil-records-v2`)에 저장.
  스토리지 키를 바꿀 때는 마이그레이션 코드와
  `tests/rendered-html.test.mjs`의 검증을 함께 갱신하세요.

## 검증

- `npm run lint` — ESLint
- `npm test` — 웹 빌드 후 SSR 스모크 테스트 (빌드 포함이라 다소 느림)
- 미니앱 확인은 `npm run dev:miniapp`
