export enum UserRole {
  ADMIN = 1,
  CONSULTOR_TECNICO = 2,
  MECANICO = 3,
  CLIENTE = 4,
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.CONSULTOR_TECNICO]: 'consultor_tecnico',
  [UserRole.MECANICO]: 'mecanico',
  [UserRole.CLIENTE]: 'cliente',
};

export function getRoleLabel(roleId: number): string {
  return USER_ROLE_LABELS[roleId as UserRole] ?? 'unknown';
}
