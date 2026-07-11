export type RoleFitRole = "Recruiter" | "DepartmentReviewer" | "Admin";

export type AuthContext = {
  userId: string;
  displayName: string;
  role: RoleFitRole;
};

export interface AuthAdapter {
  authenticate(request: Request): Promise<AuthContext | null>;
}

export class MockAuthAdapter implements AuthAdapter {
  constructor(private readonly options: { enabled: boolean }) {}

  async authenticate(request: Request): Promise<AuthContext | null> {
    if (!this.options.enabled) {
      return null;
    }

    const userId = request.headers.get("x-rolefit-mock-user")?.trim() ?? "";
    const displayName = request.headers.get("x-rolefit-mock-name")?.trim() || "로컬 테스트 사용자";
    const role = request.headers.get("x-rolefit-mock-role")?.trim() ?? "";

    if (!isSafeIdentifier(userId) || displayName.length > 100 || !isRoleFitRole(role)) {
      return null;
    }

    return { userId, displayName, role };
  }
}

export function authorizeRole(context: AuthContext, allowedRoles: RoleFitRole[]) {
  return allowedRoles.includes(context.role);
}

function isRoleFitRole(value: string): value is RoleFitRole {
  return value === "Recruiter" || value === "DepartmentReviewer" || value === "Admin";
}

function isSafeIdentifier(value: string) {
  return value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9._:@-]+$/u.test(value);
}
