# RoleFit 회사 시스템 연결 가이드

## 목적

집에서 구현한 Mock 워크플로우의 UI와 업무 규칙을 유지하면서 회사 환경에서 인증, 메일, 저장소, 문서 접근, 감사 시스템만 교체한다. 회사 승인 전에는 실제 CV, 후보자 개인정보, 회사 내부 문서나 인증정보를 사용하지 않는다.

## 교체 경계

| Mock 구현 | 회사 구현 | 책임 |
| --- | --- | --- |
| `MockAuthAdapter` | `CompanySsoAuthAdapter` | 사내 사용자 인증과 Recruiter/DepartmentReviewer/Admin 역할 매핑 |
| `MockMailAdapter` | `KnoxMailAdapter` | CV를 첨부하지 않는 검토 링크 및 결과 알림 발송 |
| `InMemoryReviewRepository` | `CompanyReviewRepository` | 요청 상태, CV 버전 참조, draft revision, 제출 결과 저장 |
| 개발용 CV snapshot | `CompanyDocumentAccessAdapter` | 요청에 고정된 문서 ID와 버전만 권한 확인 후 제공 |
| `MockAuditAdapter` | `CompanyAuditAdapter` | 민감한 본문을 제외한 보안·업무 이벤트 기록 |

모든 회사 어댑터 응답은 외부 입력으로 취급해 런타임에서 검증한다. Mock 전용 헤더 인증은 production에서 활성화하지 않는다.

## 회사 승인 체크포인트

- SSO 프로토콜, 세션 만료, 사용자 생명주기와 역할 매핑
- Knox 메일 인증 방식, 허용 발신자, 링크와 본문 정책
- DB/Object Storage 제품, 암호화, 백업, 보존·삭제, legal hold
- CV 원본·추출 텍스트·리포트·인터뷰 피드백의 소유권과 접근 범위
- 검토 링크와 요청의 만료 기간, 재요청 및 회수 정책
- PDF/TXT 다운로드 권한, 워터마크와 외부 공유 책임
- 보안·개인정보·법무·운영 승인 담당자와 운영 장애 대응 절차

## 감사 이벤트 최소화

감사 이벤트에는 사용자 ID, 검토 요청 ID, 후보자 내부 ID, 동작, 시각, 성공 여부만 기록한다. CV 본문, 근거 문장, 이메일 본문, 인터뷰 자유서술, 연락처는 기록하지 않는다.

## 통합 검증 순서

1. 회사 개발 환경에 합성 포지션·후보자·CV를 준비한다.
2. SSO로 Recruiter와 DepartmentReviewer 역할 및 다른 후보자 접근 차단을 검증한다.
3. Knox 메일의 수신자, 요청 기한, SSO 링크만 확인하고 CV나 상세 평가가 포함되지 않는지 검사한다.
4. 요청 생성, 열람, 임시저장, revision 충돌, 제출, 취소, 만료를 검증한다.
5. 고정된 CV 버전만 반환되고 다른 문서 ID·버전 접근이 차단되는지 확인한다.
6. 감사로그에 민감한 본문이 남지 않는지 확인한다.
7. 보안·개인정보·법무·운영 승인을 받은 뒤에만 제한된 실제 데이터로 승인 테스트를 진행한다.

SSO 실패 또는 권한 검증 실패 시 이메일 첨부로 우회하지 않는다. 사용자에게 접근 오류와 HR 문의 경로를 제공한다.
