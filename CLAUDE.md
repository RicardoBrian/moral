# moral 작업 지침 (시간 여행 도덕 수업)

학생이 미래의 세 장면(환경·빈곤·평화)에서 딜레마에 답하고 성찰을 남기는 수업용 웹 게임. 결과는 교사 구글 드라이브에 저장. 자세한 건 `README.md`.

## 구조
- React + Vite. `src/student/` 학생, `src/teacher/` 교사(주소 `#/teacher`), `src/data/` 기본 문제집.
- `functions/api.js` — `/api`: 교사 비밀번호 확인, Apps Script 로 전달(Pages Function). `worker/index.js` 는 Workers 로 배포할 때의 같은 진입점.
- `apps-script/Code.gs` — 구글 드라이브·시트 저장 서버.
- Cloudflare 설정이 없으면 **로컬 체험 모드**(브라우저 저장, 수업 코드 `DEMO`).

## DB
- Firebase 없음. **Google Apps Script(드라이브·시트)** 가 저장소다. 문제집별·반별 폴더.
- Cloudflare 비밀값: `ADMIN_PASSWORD`, `GAS_KEY`, `GAS_URL`. Apps Script 는 `GAS_KEY` 가 맞는 요청만 받는다.
- `Code.gs` 를 고치면 Apps Script 편집기에 붙여넣고 **새 버전으로 배포**해야 적용된다(자동 아님) — 사용자에게 알린다.

## 배포
- Cloudflare. Build `npm run build`, output `dist`(`wrangler.jsonc`). 현재 Cloudflare 계정에 `moral` Worker 는 없으므로 **Pages 프로젝트**로 배포 중인 것으로 보인다 — 확인되면 주소와 함께 여기에 적는다.

## 테스트
- `npm test` (로직 + Apps Script 흉내 `tests/gas-mock.js` + `/api` 경로 `tests/worker.test.js`). CI: `.github/workflows/ci.yml`.
- 화면 흐름: `npm run build && npm run preview -- --port 4173` 후 `NODE_PATH=$(npm root -g) node tests/e2e/student.cjs` (Playwright).
- 개발 서버: `npm run dev` → http://localhost:5173

## 작업 원칙
- 고치기 전에 **실제 오류 메시지를 먼저 확보**한다. 메시지 없이 추측으로 고치지 않는다.
  사용자에게 확인을 부탁할 때는 열어볼 주소·볼 곳을 하나로 정확히 준다.
- 잘 되던 기능은 요청 없이 건드리지 않는다. 원인이 확인되면 그 원인만 고치고, "겸사겸사" 개선은 먼저 묻는다.
- 같은 문제로 두 번 고쳐도 안 되면 멈추고, 확인한 사실과 모르는 것을 정리해 보고한다.
- 사용자에게는 한국어로, 짧게, 무엇을 바꿨고 무엇을 확인했는지(확인 못 한 것도) 말한다.
- 전체 DB 지도는 `RicardoBrian/Ohweb` 의 `DB.md`. 컬렉션을 새로 만들면 그 표도 고친다.
