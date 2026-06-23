export type DomainDictionaryKey =
  | "common"
  | "software"
  | "dataAi"
  | "robotics"
  | "salesBizdev"
  | "hrOps"
  | "manufacturingQuality";

export type DomainSynonymGroup = {
  domain: DomainDictionaryKey;
  terms: string[];
};

export const DOMAIN_SYNONYM_GROUPS: DomainSynonymGroup[] = [
  { domain: "common", terms: ["개발", "구현", "build", "develop", "implementation"] },
  { domain: "common", terms: ["운영", "관리", "production", "operation", "ops"] },
  { domain: "common", terms: ["개선", "향상", "저감", "단축", "improve", "reduce", "optimize"] },
  { domain: "common", terms: ["리포트", "보고서", "근거", "설명", "report", "evidence"] },
  { domain: "common", terms: ["협업", "커뮤니케이션", "소통", "stakeholder", "collaboration"] },
  { domain: "common", terms: ["자동화", "워크플로우", "프로세스", "automation", "workflow", "process"] },

  { domain: "software", terms: ["typescript", "ts"] },
  { domain: "software", terms: ["javascript", "js"] },
  { domain: "software", terms: ["saas", "플랫폼", "platform", "service"] },
  { domain: "software", terms: ["배포", "deployment", "release", "ci", "cd"] },
  { domain: "software", terms: ["모니터링", "observability", "logging", "metrics"] },

  { domain: "dataAi", terms: ["python", "파이썬"] },
  { domain: "dataAi", terms: ["머신러닝", "machine learning", "ml"] },
  { domain: "dataAi", terms: ["모델", "model"] },
  { domain: "dataAi", terms: ["모델 배포", "model serving", "serving", "inference"] },
  { domain: "dataAi", terms: ["데이터", "data", "dataset"] },
  { domain: "dataAi", terms: ["파이프라인", "pipeline"] },

  { domain: "robotics", terms: ["ros", "ros2", "robot operating system"] },
  { domain: "robotics", terms: ["c++", "cpp", "c plus plus"] },
  { domain: "robotics", terms: ["제어", "control", "controller"] },
  { domain: "robotics", terms: ["센서융합", "sensor fusion"] },
  { domain: "robotics", terms: ["상태추정", "state estimation", "localization"] },
  { domain: "robotics", terms: ["slam", "mapping"] },
  { domain: "robotics", terms: ["gazebo", "isaac sim", "simulation", "시뮬레이션"] },
  { domain: "robotics", terms: ["real-time", "realtime", "실시간"] },
  { domain: "robotics", terms: ["kinematics", "dynamics"] },
  { domain: "robotics", terms: ["actuator", "motor", "joint", "모터", "조인트"] },

  { domain: "salesBizdev", terms: ["영업", "sales", "business development", "bizdev"] },
  { domain: "salesBizdev", terms: ["b2b", "enterprise"] },
  { domain: "salesBizdev", terms: ["파이프라인", "pipeline", "funnel"] },
  { domain: "salesBizdev", terms: ["고객", "customer", "account"] },
  { domain: "salesBizdev", terms: ["매출", "revenue", "sales"] },
  { domain: "salesBizdev", terms: ["전환", "conversion", "closing"] },

  { domain: "hrOps", terms: ["채용", "recruiting", "hiring"] },
  { domain: "hrOps", terms: ["인사", "hr", "people"] },
  { domain: "hrOps", terms: ["검토", "평가", "screening", "review"] },
  { domain: "hrOps", terms: ["이력서", "cv", "resume"] },
  { domain: "hrOps", terms: ["ats", "applicant tracking"] },

  { domain: "manufacturingQuality", terms: ["제조", "생산", "manufacturing", "production"] },
  { domain: "manufacturingQuality", terms: ["품질", "qa", "quality"] },
  { domain: "manufacturingQuality", terms: ["공정", "process", "line"] },
  { domain: "manufacturingQuality", terms: ["불량률", "defect rate", "defect", "불량"] },
  { domain: "manufacturingQuality", terms: ["검사", "inspection", "test"] }
];

export function getRelevantSynonymGroups(context: string) {
  const normalized = context.toLowerCase();
  const activeDomains = new Set<DomainDictionaryKey>(["common"]);

  for (const group of DOMAIN_SYNONYM_GROUPS) {
    if (group.domain === "common") {
      continue;
    }

    if (group.terms.some((term) => normalized.includes(term.toLowerCase()))) {
      activeDomains.add(group.domain);
    }
  }

  return DOMAIN_SYNONYM_GROUPS.filter((group) => activeDomains.has(group.domain));
}
