# RoleFit Workbench 문서 인식 개선 전략

## 목적

실제 채용 업무에서는 평가 핵심지표와 지원자 정보가 PDF, Word 파일로 들어오는 경우가 많다. 현재 RoleFit Workbench의 파일 파싱은 로컬 라이브러리로 텍스트를 추출하는 수준이므로, 스캔 PDF, 복잡한 Word 서식, 표, 다단 레이아웃, 이미지 안의 텍스트를 안정적으로 처리하기 어렵다.

이 문서는 PDF/Word 내용을 더 정확하게 인식하고, 잘못 추출된 상태로 매칭 분석이 진행되지 않게 하기 위한 개선 방향을 정리한다.

## 현재 상태

현재 `lib/documentExtraction.ts`는 다음 방식으로 동작한다.

- PDF: `pdf-parse`
- DOCX: `mammoth`
- DOC: `word-extractor`
- XLSX/CSV: `exceljs`
- TXT/MD: UTF-8 텍스트 처리
- 파일 크기: 10MB 제한
- 파일 저장: 없음

현재 API 응답은 기존 호환을 위해 성공 시 `text` 문자열을 유지하되, 1차 구현에서는 검증 게이트에 필요한 필드를 additive로 확장한다.

```ts
type ExtractTextSuccess = {
  ok: true;
  fileName: string;
  fileType: string;
  text: string;
  plainText: string;
  extractionMethod: "local";
  warnings: string[];
  requiresReview: boolean;
  confidence?: number;
};
```

## 현재 방식의 한계

- 스캔 PDF는 OCR이 없으면 읽을 수 없다.
- PDF의 표, 다단 컬럼, 섹션 순서가 깨질 수 있다.
- Word의 표, 텍스트박스, 머리글, 꼬리글, 각주, 이미지 내 텍스트가 누락될 수 있다.
- 추출 신뢰도, 페이지, 문단, 표, 좌표 정보가 없다.
- 추출 결과가 원본과 얼마나 일치하는지 검증할 수 없다.
- 사용자가 추출 결과를 확인하기 전에도 분석에 사용할 수 있다.
- 깨진 추출 결과가 매칭 점수와 리포트 품질을 직접 악화시킬 수 있다.

## 유사 서비스/문서 AI 접근 방식

채용 문서 파싱 서비스와 범용 Document AI 서비스는 단순 문자열 추출보다 구조화된 문서 이해를 사용한다.

### 채용 특화 서비스

- Affinda Resume Parser
  - 이력서를 구조화된 후보자 데이터로 변환한다.
  - Resume Parser, Job Description Parser, Search and Match, Resume Redaction 같은 채용 전용 기능을 제공한다.
  - 장점: 이력서 필드 추출에 강함.
  - 한계: 회사 내부 전략자료, MBO, 자유 형식 평가자료까지 범용 처리하기에는 별도 검토 필요.

- RChilli Resume Parser
  - DOC, DOCX, PDF, RTF, TXT, ODT, HTML 등 다양한 이력서 파일을 REST API로 처리한다.
  - 140개 이상 후보자 필드와 taxonomy 기반 추출을 강조한다.
  - 장점: 이력서 구조화에 강함.
  - 한계: 개인정보 외부 전송, 계약, 보안 정책 검토가 필요하다.

### 범용 Document AI

- Azure Document Intelligence Layout
  - PDF, 이미지, DOCX, XLSX, PPTX, HTML을 지원한다.
  - 텍스트, 문단, 제목, 섹션, 표, 페이지 구조를 추출한다.
  - RoleFit 1차 PoC 후보로 가장 적합하다.

- Google Document AI
  - OCR, layout parser, form parser, custom extractor를 제공한다.
  - PDF, 이미지, DOCX, XLSX 등 다양한 파일을 처리한다.
  - 정확도는 좋지만 회사 클라우드/보안 정책 확인이 필요하다.

- Adobe PDF Extract API
  - PDF에서 텍스트, 표, 그림, 문단, 제목, 리스트를 JSON 또는 Markdown으로 추출한다.
  - PDF 품질은 강점이지만 Word까지 한 번에 해결하는 기본 선택지는 아니다.

- AWS Textract
  - PDF/이미지에서 텍스트, 표, form, line/word 단위 정보를 추출한다.
  - 스캔 문서 처리에 강하지만 Word 파일은 별도 변환 또는 다른 파이프라인이 필요하다.

- Unstructured
  - PDF, DOC, DOCX, XLSX 등 다양한 문서를 `Title`, `NarrativeText`, `ListItem`, `Table` 같은 요소로 분해한다.
  - 로컬/온프레미스 처리에 유리할 수 있다.
  - Python, LibreOffice, OCR 언어팩, 모델 의존성이 커서 Next.js 앱 내부에 직접 넣기보다 별도 worker가 적합하다.

## 핵심 판단

PDF/Word 내용을 모든 상황에서 자동으로 100% 정확히 인식하는 것은 현실적으로 보장하기 어렵다. 특히 아래 문서는 어떤 도구도 항상 완벽하지 않다.

- 스캔 PDF
- 낮은 해상도 이미지
- 이미지 안에 들어간 텍스트
- 2단/3단 컬럼 문서
- 복잡한 표
- 깨진 폰트 PDF
- 암호화 PDF
- 오래된 DOC 파일

따라서 제품 목표는 `자동 100% 정확 인식`이 아니라 다음이어야 한다.

```text
추출 결과를 사람이 검증할 수 있고,
검증되지 않은 내용으로 분석이 진행되지 않게 막는 시스템
```

## 권장 아키텍처

```text
파일 업로드
→ 문서 유형 판별
→ 파서 adapter 선택
→ 텍스트/레이아웃/표/OCR 추출
→ 추출 신뢰도와 경고 생성
→ 사용자 미리보기/수정
→ 검증 완료
→ 매칭 분석 실행
```

## 권장 인터페이스

기존의 단순 `text` 응답을 구조화 결과로 확장한다.

```ts
type DocumentExtractionResult =
  | DocumentExtractionSuccess
  | DocumentExtractionFailure;

type DocumentExtractionSuccess = {
  ok: true;
  provider: "local" | "azure" | "google" | "adobe" | "vendor";
  fileName: string;
  fileType: string;
  plainText: string;
  markdown?: string;
  elements: DocumentElement[];
  tables: DocumentTable[];
  pages: DocumentPage[];
  warnings: string[];
  confidence?: number;
  requiresReview: boolean;
};

type DocumentElement = {
  id: string;
  type:
    | "title"
    | "sectionHeading"
    | "paragraph"
    | "listItem"
    | "table"
    | "header"
    | "footer";
  text: string;
  page?: number;
  confidence?: number;
  sourceRange?: {
    page: number;
    boundingBox?: number[];
  };
};
```

Adapter는 다음처럼 분리한다.

```ts
interface DocumentParserAdapter {
  provider: string;
  supports(input: DocumentParserInput): boolean;
  parse(input: DocumentParserInput): Promise<DocumentExtractionResult>;
}
```

초기 adapter 후보:

- `LocalTextParserAdapter`
- `AzureDocumentIntelligenceAdapter`
- `GoogleDocumentAiAdapter`
- `AdobePdfExtractAdapter`
- `ResumeParserVendorAdapter`

## RoleFit 적용 우선순위

### 1단계: 추출 결과 검증 UI

외부 API를 붙이기 전에 먼저 업로드 후 추출 결과를 사람이 확인하게 만든다.

```text
업로드
→ 추출 미리보기
→ 사용자가 수정 가능
→ 검증 완료 버튼
→ 분석 실행 가능
```

이 단계만으로도 잘못 추출된 텍스트가 그대로 분석되는 문제를 크게 줄일 수 있다.

### 2단계: 구조화 결과 타입 확장

`text` 하나만 반환하지 말고 다음 필드를 추가한다.

- `plainText`
- `warnings`
- `requiresReview`
- `extractionMethod`
- `confidence`
- `elements` (PoC 이후)
- `tables` (PoC 이후)
- `pages` (PoC 이후)

### 3단계: PDF 품질 진단

다음 상황이면 경고를 띄운다.

- 추출 텍스트가 너무 짧음
- 페이지 수 대비 글자 수가 비정상적으로 적음
- 깨진 문자 비율이 높음
- 표/섹션이 거의 감지되지 않음
- 스캔 PDF로 의심됨

### 4단계: Adapter 구조 도입

현재 로컬 파서를 `LocalTextParserAdapter`로 감싸고, 외부 Document AI는 interface만 먼저 만든다.

실제 외부 API 호출은 회사 보안 정책과 API 사용 가능성이 확인된 뒤 추가한다.

1차 구현의 기본 정책은 `local-only by default`다. 회사 승인 전에는 UI/API 어디에서도 외부 Document AI 옵션을 활성화하지 않는다.

### 5단계: 회사 환경 PoC

우선순위:

1. Azure Document Intelligence Layout
2. Google Document AI Layout Parser
3. Adobe PDF Extract API
4. Affinda/RChilli 같은 Resume Parser API
5. Unstructured 기반 로컬 worker

PoC 기준:

- 한국어 PDF 인식 품질
- 한국어 DOCX 인식 품질
- 표/섹션/문단 순서 보존
- 스캔 PDF OCR 품질
- 처리 속도
- 비용
- 회사망 접근 가능성
- 개인정보/보안 정책 적합성
- 추출 결과를 RoleFit report 근거로 추적 가능한지

## 보안 원칙

채용 문서는 개인정보와 회사 내부 문서가 포함될 수 있으므로 외부 API 연동 전 다음을 확인한다.

- 회사 문서와 이력서 외부 전송 허용 여부
- API 제공사의 데이터 저장 여부
- 학습 데이터 사용 여부
- 리전 선택 가능 여부
- 암호화 정책
- 삭제 정책
- 로그 정책
- 개인정보 마스킹 가능 여부
- Knox/사내망에서 호출 가능한지
- 실패 응답에 원문이 남지 않는지

확인 전에는 외부 Document AI API를 실제로 호출하지 않는다.

## 테스트 전략

문서 인식 개선은 단순 unit test만으로 충분하지 않다. 테스트 문서 세트가 필요하다.

필수 fixture:

- 텍스트 PDF
- 스캔 PDF
- 다단 컬럼 PDF
- 표가 포함된 PDF
- 기본 DOCX
- 표가 포함된 DOCX
- 머리글/꼬리글이 있는 DOCX
- 한국어 이력서 PDF
- 한국어 직무기술서 DOCX

검증 항목:

- 원문 주요 문장이 누락되지 않는가
- 표 내용이 깨지지 않는가
- 읽기 순서가 유지되는가
- 스캔 PDF는 OCR 필요 경고가 뜨는가
- 깨진 문자 비율이 높은 경우 경고가 뜨는가
- 검증 완료 전 분석 실행이 막히는가

## 최종 권장안

RoleFit Workbench에는 다음 순서가 가장 안전하다.

```text
1. 현재 로컬 파서는 유지한다.
2. 추출 결과 미리보기/수정/검증 단계를 추가한다.
3. 추출 결과 schema를 구조화한다.
4. PDF/DOCX 품질 진단과 경고를 추가한다.
5. DocumentParserAdapter 인터페이스를 도입한다.
6. 회사 환경에서 Azure Document Intelligence를 우선 PoC한다.
7. PDF 품질이 핵심이면 Adobe PDF Extract를 비교한다.
8. 이력서 구조화가 핵심이면 Affinda/RChilli를 비교한다.
9. 최종 매칭 분석에는 검증 완료된 추출 결과만 사용한다.
```

## 초딩 버전 설명

지금은 파일을 올리면 프로그램이 글자를 읽고 바로 채점한다.

문제는 프로그램이 글자를 잘못 읽을 수 있다는 점이다.

그래서 앞으로는 이렇게 바꿔야 한다.

```text
1. 파일을 올린다.
2. 프로그램이 글자를 읽는다.
3. 사람이 읽은 내용이 맞는지 확인한다.
4. 틀린 부분은 고친다.
5. 확인이 끝난 글만 채점한다.
```

즉, 중요한 것은 `무조건 자동으로 믿기`가 아니라 `읽은 내용을 확인하고 나서 채점하기`다.

## References

- [Azure AI Document Intelligence Layout model](https://learn.microsoft.com/azure/ai-services/document-intelligence/prebuilt/layout)
- [Google Cloud Document AI](https://cloud.google.com/document-ai/docs)
- [Adobe PDF Extract API](https://developer.adobe.com/document-services/apis/pdf-extract/)
- [AWS Textract](https://docs.aws.amazon.com/textract/)
- [Affinda Resume Parser](https://www.affinda.com/resume-parser)
- [RChilli Resume Parser](https://www.rchilli.com/resume-parser/)
- [Unstructured document partitioning](https://docs.unstructured.io/open-source/core-functionality/partitioning)
