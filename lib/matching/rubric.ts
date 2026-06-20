import type { CoreCriteriaInputs, EvaluationRubric, RubricCategory, RubricCriterion } from "../matching";
import { expandSynonyms, tokenize } from "./scoring";

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
      synonyms: expandSynonyms(keywords)
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
    .filter((item) => item.length >= 4)
    .slice(0, 8);
}

function classifyCriterion(line: string): RubricCategory {
  if (/필수|required|must/i.test(line)) return "필수 역량";
  if (/우대|preferred|nice/i.test(line)) return "우대 역량";
  if (/성과|수치|단축|향상|개선|impact|kpi/i.test(line)) return "성과/임팩트";
  if (/협업|소통|커뮤니케이션|담당부서|stakeholder/i.test(line)) return "협업/커뮤니케이션";
  if (/년|리딩|운영|책임|lead|senior|경험 수준/i.test(line)) return "경험 수준";
  if (/hr|채용|인사|도메인|산업|domain/i.test(line)) return "도메인 경험";
  return "필수 역량";
}

function cleanCriterionTitle(line: string) {
  return line.replace(/^\s*(필수|우대|성과|협업|경험|도메인)\s*[:：-]?\s*/i, "").trim();
}
