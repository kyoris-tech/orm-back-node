import type { UserRole } from '../../../common/types/user-role';

export interface LoginResult {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    company_id: string;
    company_name: string;
    role: UserRole;
  };
}
