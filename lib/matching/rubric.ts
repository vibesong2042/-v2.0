import type { CoreCriteriaInputs, EvaluationRubric, RubricCategory, RubricCriterion } from "../matching";
import { expandSynonyms, tokenize } from "./scoring";

const SECTION_OR_METADATA_PATTERN =
  /^(직무명|조직명|조직\s*소개|회사\s*소개|사업부명|부서명|채용\s*홍보|수행업무|담당\s*업무|필요\s*역량|필수요건|필수\s*요건|우대요건|우대\s*역량|핵심역량|중점 과제|채용 시 특히 확인할 항목|이런\s*분을\s*찾고\s*있어요|이런\s*경험이\s*있으면\s*더\s*좋아요)\s*:/u;
const DROP_CONTEXT_PATTERN =
  /^(조직명|조직\s*소개|회사\s*소개|사업부명|부서명|채용\s*홍보)\s*:/u;
const INLINE_SECTION_PREFIX_PATTERN =
  /^(수행업무|담당\s*업무|필요\s*역량|필수요건|필수\s*요건|우대요건|우대\s*역량|핵심역량|중점 과제|채용 시 특히 확인할 항목|이런\s*분을\s*찾고\s*있어요|이런\s*경험이\s*있으면\s*더\s*좋아요)\s*[:：-]\s*/u;

export function buildEvaluationRubric(input: CoreCriteriaInputs): EvaluationRubric {
  const lines = extractCriterionLines(`${input.jobDescription}\n${input.additionalMaterial}`);
  const criteria = lines.map((line, index) => {
    const category = classifyCriterion(line);
    const required = /필수|required|must/i.test(line) || category === "필수 역량";
    const cleanTitle = cleanCriterionTitle(line);
    const keywords = tokenize(cleanTitle);

    return {
      id: `criterion-${index + 1}`,
      category,
      title: cleanTitle || line,
      description: line,
      importance: required ? 3 : category === "성과/임팩트" ? 2.5 : category === "우대 역량" ? 1.5 : 2,
      required,
      evidenceNeed: required ? "높음" : category === "우대 역량" ? "낮음" : "보통",
      keywords,
      synonyms: expandSynonyms(keywords, line)
    } satisfies RubricCriterion;
  });

  return {
    criteria:
      criteria.length > 0
        ? criteria
        : [
            {
              id: "criterion-1",
              category: "필수 역량",
              title: "직무기술서 입력 내용",
              description: "직무기술서 입력 내용",
              importance: 3,
              required: true,
              evidenceNeed: "높음",
              keywords: ["직무기술서"],
              synonyms: []
            }
          ]
  };
}

function extractCriterionLines(text: string) {
  return text
    .split(/[\n.!?。！？]+/u)
    .map((item) => item.replace(/^[-*•\d.)\s]+/u, "").trim())
    .filter((item) => !isDropContextLine(item))
    .map(stripSectionPrefix)
    .filter((item) => item.length >= 4)
    .filter((item) => !isSectionOrMetadataLine(item))
    .slice(0, 8);
}

function classifyCriterion(line: string): RubricCategory {
  if (/필수|required|must/i.test(line)) return "필수 역량";
  if (/우대|preferred|nice/i.test(line)) return "우대 역량";
  if (/성과|수치|단축|향상|개선|impact|kpi/i.test(line)) return "성과/임팩트";
  if (/협업|소통|커뮤니케이션|담당부서|stakeholder/i.test(line)) return "협업/커뮤니케이션";
  if (/년|리딩|운영|책임|lead|senior|경험 수준|경험/i.test(line)) return "경험 수준";
  if (
    /hr|채용|인사|도메인|산업|domain|로봇|ros2|ros|제조|생산|스마트팩토리|digital twin|디지털 트윈|amr|agv|회로|전장|pcb|plc|fpga|mlops|비전 검사/i.test(
      line
    )
  ) {
    return "도메인 경험";
  }
  return "경험 수준";
}

function cleanCriterionTitle(line: string) {
  return stripSectionPrefix(line)
    .replace(/^\s*(필수|우대|성과|협업|경험|도메인)\s*[:：-]?\s*/i, "")
    .trim();
}

function isSectionOrMetadataLine(line: string) {
  return SECTION_OR_METADATA_PATTERN.test(line.trim());
}

function isDropContextLine(line: string) {
  return DROP_CONTEXT_PATTERN.test(line.trim());
}

function stripSectionPrefix(line: string) {
  return line.replace(INLINE_SECTION_PREFIX_PATTERN, "").trim();
}
