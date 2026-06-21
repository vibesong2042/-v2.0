# 회사 PC 인수인계 가이드

이 문서는 회사 PC에서 RoleFit Workbench를 내려받고, 실행하고, 데모하고, Claude Code로 이어서 개발하기 위한 따라 하기 설명서입니다.

## 1. 회사 PC 준비

PowerShell을 열고 아래 명령을 실행합니다.

```powershell
git --version
node -v
npm -v
```

정상이라면 버전 번호가 나옵니다.

예:

```text
git version 2.x.x
v20.x.x
10.x.x
```

없으면 설치가 필요합니다.

- Git: https://git-scm.com
- Node.js LTS: https://nodejs.org

초딩 버전:

```text
Git은 GitHub에서 파일을 가져오는 택배기사입니다.
Node/npm은 앱을 움직이게 하는 엔진입니다.
```

## 2. GitHub에서 프로젝트 가져오기

회사 PC에서 작업 폴더를 만듭니다.

```powershell
cd C:\
mkdir work
cd C:\work
git clone https://github.com/vibesong2042/-v2.0.git
cd -v2.0
```

GitHub 로그인이 뜨면 GitHub 계정으로 로그인합니다.

초딩 버전:

```text
집 PC에서 만든 앱 상자를 GitHub 창고에 올려두었습니다.
회사 PC에서는 그 상자를 다시 내려받는 단계입니다.
```

## 3. 올바른 폴더인지 확인

반드시 `package.json`이 보이는 폴더에서 실행해야 합니다.

```powershell
dir package.json
```

`package.json`이 보이면 맞는 폴더입니다.

만약 안 보이면 프로젝트 폴더로 다시 이동합니다.

```powershell
cd C:\work\-v2.0
dir package.json
```

## 4. 의존성 설치

```powershell
npm.cmd ci
```

초딩 버전:

```text
앱이 움직이려면 필요한 부품들이 있습니다.
npm ci는 그 부품들을 한 번에 조립하는 명령입니다.
```

## 5. 정상 작동 검사

아래 명령을 순서대로 실행합니다.

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

정상 기준:

- `test`: 모든 테스트 통과
- `lint`: 에러 없이 종료
- `build`: 빌드 성공

초딩 버전:

```text
앱을 켜기 전에 부품 검사, 맞춤 검사, 완성품 검사를 하는 단계입니다.
```

## 6. 개발 서버 실행

회사 PC 본인 브라우저에서만 볼 경우:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:3000
```

PowerShell 창을 닫으면 서버도 꺼집니다. 끄고 싶으면 `Ctrl + C`를 누릅니다.

초딩 버전:

```text
PowerShell 창이 앱 가게 문을 열어두는 역할입니다.
창을 닫으면 가게 문도 닫힙니다.
```

## 7. 다른 회사 PC에서 같이 봐야 하는 경우

같은 회사망 안의 다른 PC에서 접속해야 하면 서버를 이렇게 실행합니다.

```powershell
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
```

회사 PC의 IP를 확인합니다.

```powershell
ipconfig
```

다른 PC에서는 아래처럼 접속합니다.

```text
http://회사PC_IP:3000
```

예:

```text
http://10.20.30.40:3000
```

주의:

```text
회사 보안 정책이나 Windows 방화벽이 3000번 포트를 막으면 다른 PC에서는 안 열릴 수 있습니다.
그 경우에는 본인 회사 PC에서 http://127.0.0.1:3000 으로 데모하는 것이 안전합니다.
```

## 8. 데모 진행 순서

앱을 켠 뒤 아래 순서로 보여주면 됩니다.

1. `평가 핵심지표 등록`
   - 직무기술서 입력
   - 추가 설명자료 입력

2. `지원자 정보`
   - 지원자 CV/이력서 입력
   - 기존 입사자 CV는 선택사항

3. `보조지표/가중치`
   - 팀별 전략자료 입력
   - 보직장 MBO 입력
   - 기타 주관식 의견 입력
   - 가중치 합계 100% 확인
   - `매칭 분석 실행` 클릭

4. `분석결과 리포트`
   - 종합 매칭도 확인
   - 핵심지표별 카드 확인
   - 보조지표 확인
   - 확인 불가 역량 확인
   - 인터뷰 질문 Top 3 확인

5. `현업부서 검토 요청`
   - 부서장 검색
   - 부서장 선택
   - 검토 요청 미리보기 확인
   - `Mock 검토 요청 발송` 클릭

6. `부서장 화면 미리보기`
   - 부서장이 보는 화면처럼 리포트 요약 확인
   - 전화인터뷰 결과표 작성
   - `Mock 결과 회신` 클릭
   - `결과 회신 완료` 상태 확인

초딩 버전:

```text
인사팀이 리포트를 만들고,
부서장에게 검토를 부탁하고,
부서장이 전화인터뷰 결과를 다시 보내는 흐름을
가짜 메일로 연습해보는 화면입니다.
```

## 9. 데모 때 꼭 말해야 할 것

그룹장이나 회사 사람에게 아래처럼 설명합니다.

```text
현재 버전은 사내 API 연결 전 데모 모드입니다.
실제 메일은 발송하지 않고, Knox 메일 API와 임직원 검색 API를 붙이기 전 업무 흐름을 먼저 검증하는 상태입니다.
파일 파싱, 매칭 리포트, 부서장 검토 요청, 전화인터뷰 결과 회신 화면까지는 로컬에서 시연 가능합니다.
```

## 10. Claude Code로 이어서 개발하기

프로젝트 폴더에서 Claude Code를 실행합니다.

```powershell
cd C:\work\-v2.0
claude
```

첫 요청은 아래처럼 합니다.

```text
이 프로젝트는 RoleFit Workbench 채용 매칭 MVP입니다.

먼저 CLAUDE.md, README.md, package.json, app/page.tsx, lib/matching.ts, app/components/ReportView.tsx, app/components/DepartmentReviewPanel.tsx, lib/departmentReview.ts, lib/employees.ts를 읽고 현재 구조를 요약해줘.

아직 구현하지 말고, 회사 API 연동 전에 확인해야 할 항목과 리스크만 정리해줘.
```

회사 API 스펙을 확보한 뒤에는 아래처럼 요청합니다.

```text
회사 임직원 검색 API와 Knox 메일 API를 연결하려고 합니다.
기존 mock 흐름은 유지하고, adapter 방식으로 실제 API 구현을 분리하는 계획을 먼저 세워줘.
바로 구현하지 말고 AI Native 관점에서 계획 안전성을 점검해줘.
```

## 11. 회사에서 바로 하면 안 되는 것

아래는 바로 하지 않습니다.

- 실제 이력서 원본을 GitHub에 커밋
- 개인정보를 테스트 파일로 저장
- API key, token, password를 코드에 직접 입력
- Knox 인증정보를 repo에 저장
- `main`에서 바로 대규모 API 연동
- mock 흐름 삭제
- 테스트 없이 회사 API 연결

초딩 버전:

```text
진짜 주민등록증이나 비밀번호를 장난감 상자에 넣으면 안 됩니다.
회사 API는 진짜 문이기 때문에, 먼저 가짜 문으로 연습하고 나중에 조심해서 바꿔야 합니다.
```

## 12. 자주 나는 오류와 해결법

### `npm error ENOENT package.json`

원인:

```text
프로젝트 폴더가 아닌 곳에서 npm 명령을 실행했습니다.
```

해결:

```powershell
cd C:\work\-v2.0
dir package.json
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

### `npm ci` 실패

가능한 원인:

```text
회사망에서 npm 다운로드가 막혔거나 proxy 설정이 필요합니다.
```

해결:

```text
회사 IT/보안 담당자에게 npm registry 접근 가능 여부를 확인합니다.
사내 npm proxy가 있으면 그 설정을 사용합니다.
```

### `http://127.0.0.1:3000` 접속 안 됨

확인:

```powershell
cd C:\work\-v2.0
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

PowerShell 창을 닫지 말고 브라우저에서 다시 접속합니다.

### `port 3000 already in use`

원인:

```text
이미 다른 개발 서버가 3000번을 사용하고 있습니다.
```

해결:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3001
```

접속:

```text
http://127.0.0.1:3001
```

## 13. 회사에서 이어 할 다음 개발 후보

우선순위는 아래 순서가 좋습니다.

1. 회사 임직원 검색 API adapter 추가
2. Knox 메일 API adapter 추가
3. 부서장 검토 화면을 실제 링크/라우트로 분리
4. 전화인터뷰 결과 저장 정책 확정
5. PDF 다운로드 기능 추가

가장 중요한 원칙:

```text
mock을 지우지 말고, real adapter를 옆에 추가한다.
```

초딩 버전:

```text
연습용 리모컨을 버리고 진짜 리모컨을 바로 꽂지 않습니다.
둘 다 꽂을 수 있게 만들어야 합니다.
그래야 진짜 리모컨이 고장 나도 연습용으로 계속 데모할 수 있습니다.
```
