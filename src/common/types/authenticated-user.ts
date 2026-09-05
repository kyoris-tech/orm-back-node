import type { UserRole } from './user-role';

export interface AuthenticatedUser {
  userId: string;
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
}
