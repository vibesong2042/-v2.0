# 현재 개발상태 인수인계

이 문서는 RoleFit Workbench의 현재 개발 결과물 상태와 다음 작업 경계를 정리한다.

## 1. 현재 목적

RoleFit Workbench는 생산기술연구소 직무 적합도 검토를 돕는 Next.js + TypeScript 기반 로컬 웹앱이다.

현재 버전은 자동 합격/불합격 판정 도구가 아니다. 직무기술서, 추가 설명자료, 후보자 CV, 보조지표를 바탕으로 HR 담당자와 현업부서가 검토할 수 있는 리포트 초안을 만든다.

현재 인증은 개발 전용 Mock Auth다. 실제 SSO가 연결되기 전에는 합성 데이터만 사용하고 `127.0.0.1`에서만 실행한다.

회사 API, Knox 메일 API, 인증, DB, 운영 파일 저장소는 아직 연결하지 않았다.

## 2. 최근 완료된 작업

최근 기준 커밋:

```text
c16384f6 Add PDF report download
97c5eb9d Improve multi-candidate analysis workflow
2e2b8982 Add RoleFit high-risk review harness
```

완료된 주요 기능:

- 한 포지션에 여러 후보자 CV/이력서를 등록할 수 있다.
- 후보자별 리포트를 생성하고 점수 순으로 비교할 수 있다.
- 빈 후보자 슬롯은 분석 실행을 막지 않는다.
- 후보자 CV가 1명도 없으면 분석 실행을 막고 사유를 표시한다.
- 추가 설명자료, 기존 입사자 CV, 보조지표 문서는 텍스트가 있을 때 확인 완료가 필요하다.
- 보조지표는 `enabled && weight > 0`일 때만 분석에 사용된다.
- 0% 가중치 보조지표는 분석 제외로 표시되고 분석 입력에서도 제외된다.
- 3단계 화면에서 분석 대상 요약과 차단 사유별 이동 버튼을 제공한다.
- 첨부 삭제 버튼으로 파일명, 텍스트, 파싱 상태, 검증 상태를 초기화할 수 있다.
- 리포트는 TXT 다운로드와 PDF 다운로드를 모두 지원한다.
- PDF는 현재 선택된 후보자 리포트 1개를 화면 캡처 기반으로 저장한다.

## 3. 현재 지원 범위

지원하는 입력:

- 수동 텍스트 입력
- PDF
- Word
- Excel
- CSV
- TXT
- MD

지원하는 분석:

- 직무기술서 기반 핵심지표 매칭
- 추가 설명자료 반영
- 후보자별 CV/이력서 매칭
- 기존 입사자 CV 유사도 비교
- 팀별 전략자료, 보직장 MBO, 기타 의견 기반 보조지표 매칭
- 가중치 합계 100% 검증
- 한국어 리포트 생성

지원하는 출력:

- 화면 리포트
- 후보자별 TXT 리포트 다운로드
- 후보자별 PDF 리포트 다운로드
- 현업부서 검토 요청 mock 흐름
- 전화인터뷰 결과표 mock 회신 흐름

## 4. 아직 미연동인 항목

아래 항목은 회사 환경에서 별도 확인 후 구현한다.

- Knox 메일 API 실제 발송
- 회사 임직원/부서장 검색 API
- 회사 인증/권한
- DB 저장
- 운영 파일 저장소
- 실제 개인정보 저장 정책
- 외부 LLM API
- 외부 OCR/Document AI API

현재 Mock Auth 상태에서는 `0.0.0.0` 네트워크 공개 실행을 지원하지 않는다.

mock 흐름은 삭제하지 않는다. 실제 API는 adapter 방식으로 옆에 추가한다.

## 5. 집에서 완료한 검증 명령

최근 기능 커밋 전후로 아래 명령을 실행해 통과를 확인했다.

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint
```

회사 PC에서 clone 또는 pull한 뒤에도 같은 명령을 다시 실행해야 한다.

## 6. 회사에서 이어서 할 일

회사 PC에서 먼저 실행 환경을 재현한다.

```powershell
git clone https://github.com/vibesong2042/-v2.0.git
cd -v2.0
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

그 다음 회사에서만 확인 가능한 항목을 정리한다.

- GitHub 접근 가능 여부
- npm registry/proxy 필요 여부
- Knox 메일 API URL
- Knox 인증 방식
- 테스트 계정
- 테스트 수신자
- 임직원 검색 API 스펙
- 실제 이력서/문서 저장 가능 여부
- 로그에 남기면 안 되는 개인정보/회사정보 기준

## 7. 다음 개발 우선순위

1. 회사 PC에서 현재 개발 결과물 실행 재현.
2. 실제 API 스펙 확인 전까지 mock 흐름 유지.
3. Knox 메일 API와 임직원 검색 API를 adapter 방식으로 분리 설계.
4. PDF 다운로드 결과물을 회사 PC에서 직접 열어 품질 확인.
5. 실제 후보자/회사 문서를 쓰기 전 보안 저장 정책 확인.
6. 외부 LLM/OCR/Document AI는 회사 승인 후 별도 PoC로 진행.

## 8. 주의사항

GitHub에 올리면 안 되는 정보:

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

`next-env.d.ts`는 Next.js가 자동으로 수정할 수 있다. 기능 변경과 직접 관련 없는 자동 변경은 커밋에 섞지 않는다.

## 9. 초딩 버전 설명

지금 앱은 집에서 만들 수 있는 기능을 거의 완성한 상태다.

할 수 있는 것:

```text
후보자 여러 명 넣기
파일 읽기
내용 확인하기
매칭 리포트 만들기
TXT/PDF로 저장하기
현업부서 검토 흐름을 mock으로 보기
```

회사에서만 해야 하는 것:

```text
진짜 Knox 메일 연결
진짜 회사 사람 검색 연결
회사 보안정책 확인
실제 계정으로 테스트
```

즉, 앱 자체는 GitHub에서 내려받아 실행할 수 있는 개발 결과물이고, 회사에서는 회사 문을 여는 열쇠만 확인하면 된다.
