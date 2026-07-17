import { RoleName } from '../../../generated/prisma/enums';

export interface JwtPayload {
  sub: number;
  email: string;
  role: RoleName;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: RoleName;
}
