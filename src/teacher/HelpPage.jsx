import React from 'react';

export default function HelpPage({ api }) {
  return (
    <div className="t-page t-help">
      <div className="t-page-head">
        <h1 className="t-h1">사용 안내</h1>
        <p className="t-desc">
          지금은 <strong>{api.mode === 'local' ? '로컬 체험 모드' : '구글 드라이브 연결 모드'}</strong>예요.
          {api.mode === 'local' ? ' 모든 데이터가 이 브라우저에만 저장돼요. 실제 수업 전에 아래 1단계를 꼭 진행해 주세요.' : ''}
        </p>
      </div>

      <section className="t-card">
        <h2 className="t-h2">1. 구글 드라이브 연결하기 (처음 한 번)</h2>
        <ol className="t-steps">
          <li><a href="https://script.google.com" target="_blank" rel="noreferrer">script.google.com</a> 에 결과를 받을 구글 계정으로 들어가 <b>새 프로젝트</b>를 만들어요.</li>
          <li>저장소의 <code>apps-script/Code.gs</code> 내용을 모두 복사해 편집기의 <code>Code.gs</code>에 붙여 넣고 저장해요.</li>
          <li>편집기 위쪽 함수 목록에서 <b>setup</b>을 고르고 <b>실행</b>을 눌러요. 권한 요청이 나오면 허용해 주세요.</li>
          <li>실행 로그에 나온 <b>관리자 비밀번호</b>를 적어 두세요. 바꾸고 싶으면 <b>프로젝트 설정 → 스크립트 속성</b>에서 <code>ADMIN_PASSWORD</code> 값을 고치면 돼요.</li>
          <li><b>배포 → 새 배포 → 유형: 웹 앱</b>을 고르고, <b>실행 사용자: 나</b>, <b>액세스 권한: 모든 사용자</b>로 배포해요.</li>
          <li>나온 <b>웹 앱 URL</b>을 이 사이트의 <code>config.json</code> 파일 <code>apiUrl</code> 에 붙여 넣어요. (GitHub 저장소의 <code>public/config.json</code>)</li>
        </ol>
        <p className="t-muted t-small">Code.gs 를 고친 뒤에는 <b>배포 관리 → 수정 → 새 버전</b>으로 다시 배포해야 반영돼요. URL은 그대로 유지돼요.</p>
      </section>

      <section className="t-card">
        <h2 className="t-h2">2. 수업 진행 순서</h2>
        <ol className="t-steps">
          <li><b>문제집</b> 탭에서 문제집을 고르거나 새로 만들어요. 한국어로 쓰고 <b>빈 칸 자동 번역</b>을 누르면 영어·중국어·러시아어가 채워져요.</li>
          <li><b>미리보기</b>로 학생 화면을 확인해요. (미리보기는 제출되지 않아요)</li>
          <li><b>수업</b> 탭에서 문제집과 차시 이름을 정하고 <b>수업 코드 만들기</b>를 눌러요. 코드를 누르면 화면에 크게 띄울 수 있어요.</li>
          <li>학생은 링크로 들어와 수업 코드 · 학번(예: 30215) · 이름을 입력해요.</li>
          <li><b>현황 보기</b>에서 누가 진행 중이고 누가 제출했는지, 딜레마마다 어떤 선택을 몇 % 했는지 실시간으로 볼 수 있어요. 토론 수업에 그대로 활용해 보세요.</li>
          <li>현황판에서 제출한 학생을 누르면 그 학생이 고른 선택, 이유, 성찰을 한 화면에서 볼 수 있어요. 화살표로 다음 학생으로 넘어가요.</li>
          <li><b>결과</b> 탭에서는 지난 수업까지 모든 결과를 문제집 · 차시 · 반 · 이름으로 찾아볼 수 있어요.</li>
          <li>수업이 끝나면 <b>입장 가능</b>을 꺼서 더 이상 들어오지 못하게 해요.</li>
        </ol>
      </section>

      <section className="t-card">
        <h2 className="t-h2">3. 결과가 저장되는 곳</h2>
        <pre className="t-tree">{`내 드라이브/
└ 시간여행 도덕수업 결과/
   ├ 미래를 구하는 세계시민_1차시/
   │  └ 3학년 2반/
   │     ├ 30215_홍길동_미래를 구하는 세계시민_1차시_2026-10-14.pdf
   │     └ 미래를 구하는 세계시민_1차시_3학년 2반_요약 (스프레드시트)
   └ _시스템 데이터 (수정 금지)/`}</pre>
        <ul className="t-steps">
          <li>학생이 중국어·러시아어·영어로 쓴 이유와 성찰은 <b>한국어 번역과 원문이 함께</b> 저장돼요.</li>
          <li>같은 학생이 다시 제출하면 파일 이름 뒤에 <code>_2</code>, <code>_3</code>이 붙고, 요약 시트에는 줄이 추가돼요. 현황판은 가장 최근 제출을 기준으로 집계해요.</li>
          <li>학생 기기의 인터넷이 끊겨도 결과는 기기에 보관되었다가 다시 연결되면 자동으로 제출돼요.</li>
        </ul>
      </section>

      <section className="t-card">
        <h2 className="t-h2">4. 알아 두면 좋은 점</h2>
        <ul className="t-steps">
          <li>선택지 순서는 학생마다 무작위로 섞여서, ‘항상 B가 정답’ 같은 패턴이 생기지 않아요.</li>
          <li>이유와 성찰은 언어별 최소 글자 수를 채워야 하고, ‘ㅋㅋㅋㅋ’처럼 성의 없는 답은 넘어가지 않아요.</li>
          <li>배경음악은 수업마다 끌 수 있어요. 학생도 오른쪽 위 설정에서 배경음악·효과음·글자 크기를 바꿀 수 있어요.</li>
          <li>학생 개인정보(학번·이름)는 선생님 드라이브에만 저장돼요. 학년이 끝나면 결과 폴더를 정리해 주세요.</li>
        </ul>
      </section>
    </div>
  );
}
