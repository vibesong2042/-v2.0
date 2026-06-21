# RoleFit Workbench

RoleFit Workbench는 Next.js + TypeScript 기반 채용 매칭 MVP입니다.

직무기술서, 추가 설명자료, 지원자 CV, 보조지표를 입력받아 담당부서 검토용 한국어 매칭 리포트를 생성합니다. 현재 버전은 회사 API, Knox 메일 API, 인증, DB 없이 로컬에서 동작하는 데모 모드입니다.

## 빠른 실행

프로젝트 폴더에서 실행합니다.

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:3000
```

## 회사 PC에서 이어서 작업하기

회사 PC에서 처음 내려받아 실행하는 자세한 절차는 아래 문서를 보세요.

- [회사 PC 인수인계 가이드](docs/company-pc-handoff-guide.md)

기본 흐름은 다음과 같습니다.

```powershell
cd C:\work
git clone https://github.com/vibesong2042/-v2.0.git
cd -v2.0
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

## 검증 명령

GitHub에 올리기 전이나 회사 PC에서 clone한 직후에는 아래 명령을 실행합니다.

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## 데모 범위

현재 데모에서 가능한 것:

- 직무기술서/추가 설명자료 입력
- 지원자 CV/이력서 입력
- PDF, Word, Excel, TXT 파일 텍스트 추출
- 보조지표와 가중치 설정
- 매칭 분석 리포트 생성
- 핵심지표별 매칭 카드 확인
- 현업부서 검토 요청 mock 흐름
- 부서장 화면 미리보기
- 전화인터뷰 결과표 mock 회신

아직 실제 연동이 아닌 것:

- Knox 메일 API 실제 발송
- 회사 임직원 검색 API
- 회사 인증/권한
- DB 저장
- 운영 파일 저장소
- 실제 개인정보 저장 정책

## GitHub에 올리면 안 되는 것

아래 정보는 절대 커밋하지 않습니다.

- 실제 이력서 원본
- 개인정보
- 회사 내부 문서 원본
- API key, token, password, credential
- Knox 인증정보
- `.env*`
- `node_modules/`
- `.next/`
- `.npm-cache/`
- 로그 파일
- `*.tsbuildinfo`

## 회사 API 연동 원칙

- 현재 mock 흐름은 지우지 않습니다.
- 회사 API는 별도 adapter로 추가합니다.
- 실제 API 스펙, 인증 방식, 테스트 계정, 보안 정책을 확인한 뒤 구현합니다.
- 실패 시 mock/rule 기반 흐름으로 돌아갈 수 있어야 합니다.
- 실제 개인정보와 이력서 원본은 회사 보안 정책 확인 전까지 저장하지 않습니다.

초딩 버전으로 말하면, 지금 앱은 “연습용 리모컨”이 달린 상태입니다. 회사 API라는 “진짜 리모컨”은 나중에 옆에 추가해야 합니다. 연습용 리모컨을 버리면 데모와 테스트가 어려워집니다.
