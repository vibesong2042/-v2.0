export type DepartmentHead = {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
};

export const mockDepartmentHeads: DepartmentHead[] = [
  {
    id: "dept-head-robotics-platform",
    name: "김로봇",
    department: "로봇 SW 플랫폼팀",
    role: "부서장",
    email: "robotics-platform.lead@example.com"
  },
  {
    id: "dept-head-ai-perception",
    name: "이인지",
    department: "AI 인지개발팀",
    role: "부서장",
    email: "ai-perception.lead@example.com"
  },
  {
    id: "dept-head-software-quality",
    name: "박품질",
    department: "Software Quality팀",
    role: "부서장",
    email: "software-quality.lead@example.com"
  }
];

export function searchDepartmentHeads(query: string): DepartmentHead[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return mockDepartmentHeads;
  }

  return mockDepartmentHeads.filter((employee) =>
    [employee.name, employee.department, employee.role, employee.email].some((value) =>
      normalize(value).includes(normalizedQuery)
    )
  );
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
