# RoleFit Workbench

## Project

RoleFit Workbench는 Next.js + TypeScript 기반 채용 매칭 MVP입니다.
직무기술서, 추가 설명자료, 지원자 CV, 보조지표를 입력받아 담당부서 검토용 한국어 리포트를 생성합니다.

## Commands

- Install: `npm.cmd ci`
- Dev: `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000`
- Test: `npm.cmd test`
- Typecheck: `npm.cmd run lint`
- Build: `npm.cmd run build`

## Rules

- 기본 응답과 리포트 출력은 한국어입니다.
- 회사 API, Knox API, 인증, DB, 운영 파일 저장소는 임의로 구현하지 않습니다.
- 파일 파싱은 PDF, Word, Excel, TXT를 지원합니다.
- 파일은 서버 메모리에서만 처리하고 저장하지 않습니다.
- 리포트는 채용 자동 판정이 아니라 인사 담당자 검토 보조 자료입니다.
- 근거 없는 단정은 피하고, 확인되지 않은 내용은 "문서상 확인 불가"로 표현합니다.
- 실제 이력서, 개인정보, 회사 내부 문서, API 키, 인증정보는 repo에 커밋하지 않습니다.

## Key Files

- `app/page.tsx`: 4단계 워크플로우 UI
- `app/components/ReportView.tsx`: 문서형 분석 리포트
- `lib/matching.ts`: mock 매칭 분석 및 리포트 텍스트 생성
- `lib/documentExtraction.ts`: 문서 텍스트 추출
- `app/api/extract-text/route.ts`: 파일 업로드/텍스트 추출 API
- `tests/`: 핵심 검증 테스트

## Current Status

- 서비스명: RoleFit Workbench
- 보조 라벨: JD/CV Matching Console
- "채용Post 설명자료"는 "추가 설명자료"로 변경 완료
- 3단계는 가중치 설정과 분석 실행 버튼이 상단에 배치됨
- 리포트는 표, 섹션, 질문 카드 기반 문서형 UI로 출력됨
