export enum UserRole {
  ADMIN = 1,
  STOCK_KEEPER = 2,
  MECHANIC = 3,
  CUSTOMER = 4,
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.STOCK_KEEPER]: 'stock_keeper',
  [UserRole.MECHANIC]: 'mechanic',
  [UserRole.CUSTOMER]: 'customer',
};

export function getRoleLabel(roleId: number): string {
  return USER_ROLE_LABELS[roleId] ?? 'unknown';
}
