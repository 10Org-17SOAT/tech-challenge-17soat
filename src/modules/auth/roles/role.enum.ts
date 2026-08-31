export enum UserRole {
  ADMIN = 1,
  CONSULTOR_TECNICO = 2,
  CLIENTE = 3,
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.CONSULTOR_TECNICO]: 'consultor_tecnico',
  [UserRole.CLIENTE]: 'cliente',
};

export function getRoleLabel(roleId: number): string {
  return USER_ROLE_LABELS[roleId as UserRole] ?? 'unknown';
}
