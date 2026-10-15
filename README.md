# 시간 여행 도덕 수업

학생이 미래의 세 장면(환경 · 빈곤 · 평화)을 여행하며 딜레마에 답하고, 선택한 이유와 성찰을 남기는 도덕·세계시민 수업용 웹 게임입니다.
결과는 선생님의 구글 드라이브에 **문제집별 · 반별 폴더**로 저장됩니다.

## 주요 기능

| 학생 | 교사 |
|---|---|
| 수업 코드 · 학번(예: 30215) · 이름으로 입장 | 문제집 만들기 · 고치기 · 복제 · 가져오기/내보내기 |
| 한국어 · English · 中文 · Русский (오른쪽 위에서 선택) | 한국어로 쓰면 영·중·러 자동 번역 후 검수 |
| 캐릭터 꾸미기, 마법사 안내, 생각 도움말 | 차시마다 수업 코드 발급, 입장 열기/닫기, 배경음악 켜기/끄기 |
| 선택마다 이유 쓰기, 스테이지마다 성찰 쓰기 | 실시간 현황판: 진행/제출 현황, 딜레마별 선택 비율과 이유, 성찰 모아보기 |
| 장면별 배경음악 · 효과음 · 읽어 주기 · 글자 크기 | 학생이 외국어로 쓴 글은 한국어 번역 + 원문으로 저장 |
| 새로고침·인터넷 끊김에도 진행·제출 내용 보존 | 학생별 PDF + 반별 요약 스프레드시트 |
| | 교사 화면 **결과** 탭: 모든 결과를 문제집·차시·반·이름으로 찾고, 학생별 선택·이유·성찰을 바로 확인 |

선택지 순서는 학생마다 섞이고, `ㅋㅋㅋㅋ`처럼 성의 없는 답은 넘어가지 않습니다.

## 구성

```
src/            웹 게임 (React + Vite)
  student/      학생 화면
  teacher/      교사 화면 (주소 뒤에 #/teacher)
  data/         기본 문제집과 문제집 구조
functions/api.js     /api: 비밀번호 확인 · Apps Script 전달 (Pages Function)
worker/index.js      Workers 로 배포할 때의 진입점 (같은 /api 코드 사용)
wrangler.jsonc       Cloudflare 배포 설정
apps-script/    구글 드라이브 저장용 서버 (Google Apps Script)
tests/          자동 테스트
```

Cloudflare 설정이 없으면(개발 중 등) **로컬 체험 모드**로 동작합니다. 이 모드에서는 데이터가 브라우저에만 저장되고, 수업 코드 `DEMO`로 들어갈 수 있습니다.

## 배포 구조

```
학생·교사 브라우저 ──► Cloudflare Pages (사이트 + /api)
                         │  · 교사 비밀번호 확인 (Cloudflare 비밀키 ADMIN_PASSWORD)
                         │  · 연결 키 GAS_KEY 를 붙여 전달
                         ▼
                    Google Apps Script ──► 선생님 구글 드라이브 (PDF · 요약 시트)
```

- 관리자 비밀번호는 **Cloudflare 비밀키에만** 있습니다. 저장소나 Apps Script 에는 없습니다.
- Apps Script 는 연결 키가 맞는 요청(= Cloudflare 를 거친 요청)만 처리합니다.

## 1. 구글 드라이브 준비 (Apps Script, 처음 한 번)

1. 결과를 받을 구글 계정으로 [script.google.com](https://script.google.com) 에서 **새 프로젝트**를 만듭니다.
2. `apps-script/Code.gs` 내용을 편집기의 `Code.gs` 에 붙여 넣고 저장합니다.
3. 함수 목록에서 **setup** 을 고르고 **실행** → 권한을 허용합니다.
   ("확인되지 않은 앱" 경고가 나오면 **고급 → 프로젝트로 이동**)
4. 실행 로그에 나온 **연결 키(GAS_KEY)** 를 복사해 둡니다.
5. **배포 → 새 배포 → 웹 앱**, 실행 사용자 **나**, 액세스 권한 **모든 사용자** 로 배포하고 **웹 앱 URL** 을 복사합니다.

`Code.gs` 를 고친 뒤에는 **배포 관리 → 수정 → 새 버전**으로 다시 배포해야 반영됩니다. (URL 은 그대로)

## 2. Cloudflare 배포

저장소에 `wrangler.jsonc` 가 있어서, Cloudflare 가 **배포할 때 자동으로 `npm run build` 를 실행하고 `dist` 를 올립니다.**

1. Cloudflare 대시보드 → **Workers & Pages → Create → Import a repository** 에서 이 저장소를 고릅니다.
   - 프로젝트 이름: `moral` (다른 이름을 쓰려면 `wrangler.jsonc` 의 `name` 도 같게 바꿔 주세요)
   - Production branch: `main`
   - Build command: 비워 두기 (또는 `npm run build`)
   - Deploy command: `npx wrangler deploy` (기본값)
2. 프로젝트 **Settings → Variables and Secrets** 에 세 가지를 넣습니다.

   | 이름 | 종류 | 값 |
   |---|---|---|
   | `ADMIN_PASSWORD` | **Secret** | 교사 화면 비밀번호 (원하는 값) |
   | `GAS_KEY` | **Secret** | setup 로그에 나온 연결 키 |
   | `GAS_URL` | Text | Apps Script 웹 앱 URL (`…/exec`) |

3. 값을 넣은 뒤 **Deployments 에서 다시 배포**합니다.
4. 학생 주소: `https://moral.<계정>.workers.dev/`, 교사 주소: 같은 주소 뒤에 `#/teacher`

> Pages 프로젝트로 만든 경우: Build command `npm run build`, Build output directory `dist` 로 설정하면 `functions/api.js` 가 `/api` 로 동작합니다. 변수 설정은 같습니다.
> 화면이 하얗고 콘솔에 `MIME type of "text/jsx"` 오류가 보이면 빌드 없이 원본이 올라간 것입니다. 위 빌드 설정을 확인해 주세요.

비밀번호를 바꾸려면 Cloudflare 에서 `ADMIN_PASSWORD` 값을 고치고 다시 배포하면 됩니다.
변수를 넣기 전에는 사이트가 **로컬 체험 모드**(수업 코드 `DEMO`)로 열립니다.

### 결과가 저장되는 곳

```
내 드라이브/시간여행 도덕수업 결과/
├ 미래를 구하는 세계시민_1차시/
│  └ 3학년 2반/
│     ├ 30215_홍길동_미래를 구하는 세계시민_1차시_2026-10-14.pdf
│     └ 미래를 구하는 세계시민_1차시_3학년 2반_요약   (스프레드시트)
└ _시스템 데이터 (수정 금지)/
```

같은 학생이 다시 제출하면 파일 이름 뒤에 `_2` 가 붙습니다. 네트워크 재시도로 같은 제출이 두 번 들어오면 한 번만 저장됩니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173  (교사: /#/teacher)
npm test         # 로직 + 서버(Apps Script) 테스트
npm run build
```

`tests/gas-mock.js` 는 드라이브·시트·번역을 흉내 내어 `Code.gs` 를 실제 구글 없이 테스트하고,
`tests/worker.test.js` 는 Cloudflare `/api` → Apps Script 전체 경로를 검사합니다.
Cloudflare 까지 로컬에서 띄워 보려면: `npx wrangler dev` (환경 변수는 `.dev.vars` 파일에).
브라우저 흐름 테스트(`tests/e2e/`)는 Playwright 가 필요합니다: `npm run build && npm run preview -- --port 4173` 실행 후 `NODE_PATH=$(npm root -g) node tests/e2e/student.cjs`.
