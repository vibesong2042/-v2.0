# RoleFit Workbench 최종 개발 인수인계서

작성 기준일: `2026-07-12`

## 1. 인수인계 기준선

- GitHub: `https://github.com/vibesong2042/-v2.0.git` (Private)
- 기준 브랜치: `main`
- 기준 태그: `home-handoff-2026-07-12`
- 기준 커밋: `fc643542 Fix mock review request identity and opening`
- 검증 결과: `25개 테스트 파일 / 171개 테스트 통과`
- 의존성 감사: `npm audit` 취약점 `0건`

회사 PC에서 기준선이 맞는지 확인합니다.

```powershell
git branch --show-current
git log -1 --oneline
git tag --points-at HEAD
```

정상 결과에는 `main`, `fc643542`, `home-handoff-2026-07-12`가 표시되어야 합니다.

## 2. 제품 목적과 현재 사용 제한

RoleFit Workbench는 생산기술연구소 채용 검토를 보조하는 Next.js + TypeScript 웹앱입니다. 직무기술서와 후보자 CV를 비교해 근거가 포함된 리포트를 만들고, 현업 부서 검토 요청과 인터뷰 결과 회신 흐름을 제공합니다.

현재 버전은 다음 조건에서만 사용합니다.

```text
Local
Mock Auth
Synthetic data only
```

- 자동 합격·불합격 판정 도구가 아닙니다.
- 실제 SSO가 연결되기 전에는 합성 데이터만 사용합니다.
- `127.0.0.1`에서만 실행하며 `0.0.0.0`으로 네트워크에 공개하지 않습니다.
- 실제 이력서, 후보자 개인정보, 회사 내부 문서는 입력하거나 Git에 저장하지 않습니다.

## 3. 완료된 기능

### 문서 입력과 분석

- 수동 입력과 drag-and-drop 파일 첨부
- PDF, DOC, DOCX, XLSX, CSV, TXT, MD 텍스트 추출
- 추출 결과 수정 및 `내용 확인 완료` 검증 게이트
- 한 포지션의 복수 후보자 등록·삭제·개별 분석
- 직무기술서, 추가 설명자료, 팀 전략, MBO, 주관식 의견 반영
- 가중치 100% 검증과 0% 보조지표 분석 제외
- 생산기술연구소 직무 중심 Rule 기반 매칭
- AI 결과를 점수에 반영하지 않는 Mock shadow 경계

### 리포트와 현업 검토

- 후보자 비교와 핵심지표별 점수·판단 근거 상시 표시
- 확인 불가 역량과 인터뷰 질문 Top 3 생성
- 후보자별 TXT·PDF 다운로드
- 현업 부서 검토 요청 생성
- 별도 부서장 검토 포털
- 검토 열람, 임시저장, 제출, 취소, 리마인더 상태 전이
- revision 기반 동시 수정 충돌 방지

### 로컬 보안 기반

- 분석·문서 추출·검토 API의 Mock Auth와 역할 검사
- JSON 요청 실제 크기 `5MB` 제한
- 검토 항목·문자열·점수·기한 검증
- 분석 cache `5분` TTL, 실패 요청 즉시 제거
- Mock 검토 데이터 `30분` TTL, 최대 `50건`
- 개인정보 원문을 넣지 않는 Mock 감사 이벤트
- production 환경에서 Mock Auth fail-closed

## 4. 아직 회사에서 구현해야 하는 항목

현재 Mock 구현을 삭제하지 말고 adapter 경계를 통해 실제 회사 구현으로 교체합니다.

1. 회사 SSO와 역할 매핑
2. 사내 DB와 암호화 Object Storage
3. 파일 magic bytes, 악성코드, 압축 폭탄, parser timeout 검사
4. 원본·추출 텍스트·PDF·cache·backup 보존 및 삭제 정책
5. 다운로드 권한, 워터마크, 감사기록
6. Knox 검토 링크 발송과 임직원 검색 API
7. 사내 생성형 AI shadow adapter
8. 승인·비식별된 실제 업무 표본 calibration
9. 스테이징 배포, 침투 테스트, 백업 복구 테스트

SSO·저장소·Knox·AI를 한 번에 구현하거나 한 커밋으로 묶지 않습니다.

## 5. 회사 PC에서 처음 실행

```powershell
cd C:\work
git clone https://github.com/vibesong2042/-v2.0.git
cd -v2.0
git switch main
git merge-base --is-ancestor home-handoff-2026-07-12 HEAD
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

브라우저 접속:

```text
http://127.0.0.1:3000
```

`git merge-base`가 오류 없이 끝나면 `main`에 집 개발 기준선이 포함된 것입니다. 태그를 직접 checkout하면 인수인계 문서 커밋 전 상태로 이동하므로 회사 작업은 최신 `main`에서 시작합니다.

## 6. Git 원격 저장소 분리

회사에서는 개인 GitHub를 내려받기 전용으로 유지하고 회사 변경사항은 사내 승인 저장소에만 push합니다.

```powershell
git switch main
git remote rename origin home-readonly
git remote set-url --push home-readonly https://github.invalid/push-disabled
git remote add origin <회사-승인-저장소-URL>
git remote -v
```

회사 저장소 기준 브랜치를 올릴 권한이 확인된 뒤에만 실행합니다.

```powershell
git push -u origin main
git switch -c feature/company-sso
```

개인 GitHub에는 회사 코드, 회사 API URL, 인증 방식 상세, 내부 문서, 실제 CV를 push하지 않습니다.

## 7. 회사 개발 권장 순서

### Gate 1: 환경과 정책 확인

- 승인 Node.js 버전과 npm registry/proxy
- 개발·스테이징·운영 저장소와 배포 방식
- SSO 사용자 식별자와 역할 정보
- CV 저장·삭제·백업·legal hold 정책
- 사내 AI 전송 허용 범위
- Knox·임직원 검색 API 명세와 테스트 계정

### Gate 2: SSO

- `MockAuthAdapter`를 유지하고 `CompanySsoAuthAdapter` 추가
- URL의 `reviewer` 파라미터를 SSO 세션 사용자로 교체
- 모든 API의 서버 역할·소유권 검사

### Gate 3: 저장소와 파일 보안

- 인메모리 repository를 DB/Object Storage adapter로 교체
- 암호화·보존·삭제·다운로드·감사정책 적용
- 실제 파일 사용 전 악성파일·파일 signature·timeout 검사

### Gate 4: Knox와 사내 AI

- CV 첨부 대신 인증된 검토 링크 발송
- AI는 후보자별 shadow mode로 시작
- Rule 점수는 유지하고 허위 근거율·fallback률·지연시간 검증

## 8. Claude Code 인수인계 프롬프트

프로젝트 루트에서 `claude`를 실행한 후 다음 요청으로 시작합니다.

```text
CLAUDE.md, AGENTS.md, README.md, docs/current-development-handoff.md,
docs/production-readiness-gates.md, docs/rolefit-company-integration.md를 먼저 읽어줘.

현재 기준선이 home-handoff-2026-07-12인지 확인하고,
npm.cmd test, npm.cmd run lint, npm.cmd run build를 실행해줘.

아직 코드를 수정하지 말고 Company SSO 연결에 필요한 회사 정보,
수정 파일 경계, 보안 위험, 테스트 계획만 정리해줘.
실제 CV, 회사 문서, API key는 사용하지 마.
```

## 9. 검증과 롤백 원칙

작업 전후 기본 검증:

```powershell
git status --short
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

- 회사 기능은 `feature/company-*` 브랜치에서 작업합니다.
- SSO, 저장소, Knox, AI는 각각 별도 커밋·PR로 분리합니다.
- 실패 시 해당 기능 커밋만 `git revert <commit>`로 되돌립니다.
- `git reset --hard`, 강제 push, 실제 데이터 삭제는 별도 승인 없이 사용하지 않습니다.

## 10. 알려진 한계

- Mock 검토 데이터는 30분 또는 서버 재시작 시 사라집니다.
- 이미지 스캔 PDF OCR은 지원하지 않습니다.
- 복잡한 표·서식과 legacy DOC/XLS는 추출 품질이 제한될 수 있습니다.
- PDF는 화면 캡처 방식이라 리포트 길이에 따라 파일 크기와 페이지 수가 증가합니다.
- 영어·중국어는 선택 UI만 있고 실제 출력은 한국어입니다.
- Mock reviewer URL과 Mock 헤더는 실제 인증 수단이 아닙니다.

## 11. 절대 Git에 올리지 않는 정보

- 실제 이력서와 면접 기록
- 후보자 이름, 연락처, 이메일, 학력·경력 원문
- 회사 내부 문서와 전략자료 원문
- API key, token, password, credential
- 회사 API URL과 Knox 인증정보
- `.env*`, 로그, cache, `node_modules`, `.next`

## 초딩 버전 설명

집에서 만든 앱은 연습용 출입증과 연습용 창고까지 완성했습니다.

회사에서는 다음 순서로 진짜 장치를 붙입니다.

```text
1. GitHub에서 정해진 버전을 내려받는다.
2. 개인 GitHub에는 회사 결과를 다시 올리지 못하게 막는다.
3. 회사 출입증인 SSO를 붙인다.
4. 안전한 회사 창고를 붙인다.
5. Knox와 사내 AI를 마지막에 붙인다.
6. 보안 검사가 끝난 뒤에만 실제 이력서를 사용한다.
```
