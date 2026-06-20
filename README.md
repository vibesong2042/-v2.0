# RoleFit Workbench

RoleFit Workbench는 직무기술서, 추가 설명자료, 지원자 CV, 보조지표를 입력받아 담당부서 검토용 한국어 매칭 리포트를 생성하는 Next.js 기반 MVP입니다.

## 실행

회사 PC 또는 개인 PC에서 프로젝트 폴더로 이동한 뒤 실행합니다.

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:3000
```

다른 PC에서도 접속해야 하는 경우에는 회사 보안 정책과 Windows 방화벽 허용 여부를 확인한 뒤 아래처럼 실행합니다.

```powershell
npm.cmd run dev -- --hostname 0.0.0.0 --port 3000
```

다른 PC에서는 `http://회사PC_IP:3000` 형식으로 접속합니다.

## 검증

GitHub에 올리기 전, 그리고 회사 PC에서 clone한 뒤 아래 명령을 실행합니다.

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

## 회사 PC에서 이어 작업

1. GitHub private repo를 clone합니다.
2. `npm.cmd ci`로 의존성을 새로 설치합니다.
3. `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`로 기준선을 확인합니다.
4. `npm.cmd run dev -- --hostname 127.0.0.1 --port 3000`로 로컬 실행합니다.
5. 프로젝트 루트에서 `claude`를 실행하고 `CLAUDE.md`를 먼저 읽게 합니다.

Claude Code 첫 요청 예시:

```text
이 프로젝트는 RoleFit Workbench 채용 매칭 MVP입니다.
먼저 CLAUDE.md, README.md, package.json, app/page.tsx, lib/matching.ts, app/components/ReportView.tsx를 읽고 현재 구조와 실행 방법을 요약해줘.
아직 구현하지 말고 회사 API 연동 전에 확인해야 할 항목만 정리해줘.
```

## GitHub에 올리면 안 되는 것

- 실제 이력서, 개인정보, 회사 내부 문서
- API 키, 토큰, 인증정보
- `.env*`
- `node_modules/`
- `.next/`
- `.npm-cache/`
- 로그 파일
- `*.tsbuildinfo`

## 회사 API 연동 원칙

- 회사 API, Knox API, 인증, DB, 운영 저장소는 현재 MVP 범위에 포함하지 않습니다.
- 회사 환경에서 API 스펙과 보안 정책을 확인한 뒤 별도 branch에서 adapter 방식으로 추가합니다.
- mock 흐름은 유지하고 실제 API 구현은 분리합니다.
- 파일은 서버 메모리에서만 처리하며 운영 저장 정책이 확정되기 전까지 저장하지 않습니다.
