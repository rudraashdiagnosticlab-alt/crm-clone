import { SetMetadata } from '@nestjs/common';
import { Role } from '@crm/database';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (LGN-006 / SEC-001). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
