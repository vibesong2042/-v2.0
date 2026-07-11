# RoleFit 운영 준비 게이트

## 현재 상태

- 서버 분석 계약과 개발용 Mock 인증 경계까지만 구현한다.
- Mock 인증은 production 빌드에서 비활성화되며 실제 SSO를 대신하지 않는다.
- idempotency와 동시 실행 제한은 단일 프로세스 메모리 구현이며 운영 DB·Queue를 대신하지 않는다.
- DB, Object Storage, Knox, 사내 AI Gateway는 아직 연결하지 않는다.
- 아래 회사 승인 항목이 완료되기 전에는 **실제 CV 사용 금지**다.

## Gate 1: 회사 확인 필수

- [ ] SSO 방식, 사용자 식별자, 세션 만료와 권한 회수 방식
- [ ] Recruiter, DepartmentReviewer, Admin 역할별 소유권 규칙
- [ ] 사내 DB와 암호화된 Object Storage 제품·접속 방식
- [ ] 암호화 키 관리 주체와 키 회전 정책
- [ ] 원본, 추출 텍스트, 리포트, PDF, 캐시, 백업의 보존기간
- [ ] 삭제 요청, 채용 종료 삭제, 백업 삭제 반영 방식
- [ ] 일반 삭제와 `legal hold` 적용·해제 권한
- [ ] CV 원문과 내부 문서의 사내 생성형 AI 전송 허용 범위
- [ ] Knox 링크, 메일 본문, 첨부파일 허용 정책
- [ ] PDF 다운로드 권한, 워터마크, 재배포 책임
- [ ] 개발·스테이징·운영 네트워크와 배포 승인 절차
- [ ] 보안·개인정보·법무·운영 승인 담당자

## 집에서 구현 가능한 경계

- synthetic 문서 기반 서버 API 계약
- Mock AuthAdapter와 RBAC 단위 테스트
- provider-neutral Storage, Mail, AI adapter 인터페이스
- 상태 전이, version 충돌, 보존·삭제 시뮬레이션
- 실제 개인정보를 포함하지 않는 E2E 회귀 테스트

## 회사에서만 구현·검증할 경계

- 실제 SSO와 사용자·부서 소유권 매핑
- 실제 DB, Object Storage, 암호화 키, 악성코드 검사기
- 분산 idempotency store, Queue, rate limit
- Knox 메일과 임직원 검색 API
- 사내 AI Gateway shadow 연결
- 승인된 비식별 calibration set
- CSP는 실제 SSO·배포 도메인·Next nonce 전략을 확인한 뒤 적용

## 진행 중단 조건

- 실제 endpoint, secret, 인증 헤더를 Git에 기록해야 하는 경우
- 회사 승인 없이 실제 후보자 원본을 테스트에 사용해야 하는 경우
- 삭제 정책 없이 원본 또는 추출 텍스트 저장을 요구하는 경우
- Mock 인증을 production에서 활성화하도록 요구하는 경우
- 감사로그에 CV 원문이나 근거 문장 전체를 기록하도록 요구하는 경우

## 다음 회사 인수인계 질문

1. 어떤 SSO 또는 사내 인증 Gateway를 사용하는가?
2. 원본 파일과 구조화 리포트 저장소는 무엇인가?
3. 지원자 자료의 보존기간과 삭제 책임자는 누구인가?
4. 악성 파일 검사 서비스와 비동기 작업 Queue가 있는가?
5. Knox와 AI Gateway의 개발·스테이징 endpoint가 분리되어 있는가?
