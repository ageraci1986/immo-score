export type UserRole = 'admin' | 'advanced' | 'user_basic' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  advanced: 'Avancé',
  user_basic: 'Utilisateur',
  viewer: 'Lecteur',
};

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccessSettings(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccessSearchProjects(role: UserRole): boolean {
  return role === 'admin' || role === 'advanced';
}

export function canShareProjects(role: UserRole): boolean {
  return role === 'admin';
}

export function canAccessProperties(role: UserRole): boolean {
  return role !== 'viewer';
}

export function isValidRole(role: string): role is UserRole {
  return ['admin', 'advanced', 'user_basic', 'viewer'].includes(role);
}
