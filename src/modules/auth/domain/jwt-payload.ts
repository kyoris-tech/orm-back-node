import type { UserRole } from '../../../common/types/user-role';

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
}
