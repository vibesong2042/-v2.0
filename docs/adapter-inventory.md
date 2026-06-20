# RoleFit AI Adapter Inventory

## Purpose

RoleFit Workbench는 실제 AI API를 바로 호출하지 않는다. 먼저 adapter 경계, 응답 schema, 실패 fallback을 고정한 뒤 회사 보안 정책이 확인된 provider만 별도 branch에서 구현한다.

## Current Adapters

| Provider | Status | Network | Role |
| --- | --- | --- | --- |
| `mock` | implemented | none | 로컬 rule 기반 루브릭/근거 후보를 같은 schema로 반환한다. |
| `openai` | not implemented | blocked | 회사 승인 전 실제 호출부를 만들지 않는다. |
| `anthropic` | not implemented | blocked | 회사 승인 전 실제 호출부를 만들지 않는다. |
| `google` | not implemented | blocked | 회사 승인 전 실제 호출부를 만들지 않는다. |

## Fixed Response Schema

Adapter는 아래 역할만 수행한다.

- 루브릭 후보 제안
- 근거 문장 후보 제안
- 확인 필요 항목 제안
- 근거 충분성 후보 제안

Adapter는 아래 값을 반환하면 안 된다.

- 최종 점수
- 합격/불합격 판단
- 채용 추천 확정 문구
- 저장/전송 정책 결정

`finalScore` 또는 `hiringDecision` 필드가 포함된 응답은 invalid schema로 처리하고 rule 기반 분석으로 fallback한다.

## Company Readiness Checklist

실제 `openai`, `anthropic`, `google` adapter를 만들기 전 아래 항목을 확인한다.

- API URL 및 사용 가능한 모델
- 인증 방식과 secret 보관 위치
- 실제 CV/회사 문서 전송 가능 여부
- 데이터 저장/학습 제외 조건
- 사내망 또는 VPN 필요 여부
- timeout, rate limit, retry 정책
- 로그에 남기면 안 되는 정보
- 실패 응답 형식
- 보안 검토 또는 결재 필요 여부
- calibration sample 기반 비교 방식

## Fallback Policy

아래 상황에서는 외부 adapter 결과를 버리고 기존 rule 기반 분석을 사용한다.

- adapter throw
- timeout
- 빈 응답
- schema 불일치
- 금지 필드 포함
- 알 수 없는 provider

Fallback 시 최종 리포트는 계속 생성되어야 하며, 최종 점수는 기존 서버 scoring 로직으로만 계산한다.

## Implementation Rule

실제 provider adapter는 `main`에서 직접 만들지 않는다. 회사 환경에서 API 사용 가능성과 보안 정책을 확인한 뒤 별도 branch에서 작게 구현한다.
