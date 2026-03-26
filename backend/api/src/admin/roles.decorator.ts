import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './admin.guard';

/**
 * Decorator to restrict endpoint to specific roles.
 * Usage: @Roles('superadmin') or @Roles('superadmin', 'admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
