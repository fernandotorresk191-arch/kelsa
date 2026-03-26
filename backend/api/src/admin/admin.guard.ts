import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';

export const ROLES_KEY = 'roles';

/**
 * Guard that checks admin JWT and role.
 * Also reads X-Darkstore-Id header and verifies access.
 * Sets req.user = { sub, email, role }
 * Sets req.darkstoreId = verified darkstore ID (or null for superadmin global requests)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    const queryToken = req.query?.token as string | undefined;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : queryToken || null;

    if (!token) throw new UnauthorizedException('No token');

    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // Must have admin role in JWT
    if (!payload.role) {
      throw new UnauthorizedException('Not an admin token');
    }

    req.user = payload;

    // Check allowed roles from decorator
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.role)) {
        throw new ForbiddenException('Insufficient role');
      }
    } else {
      // Default: allow superadmin, admin, manager
      if (!['superadmin', 'admin', 'manager'].includes(payload.role)) {
        throw new ForbiddenException('Admin access required');
      }
    }

    // Read darkstore from header
    const darkstoreId = req.headers['x-darkstore-id'] as string | undefined;
    req.darkstoreId = darkstoreId || null;

    // Superadmin can access any darkstore
    if (payload.role === 'superadmin') {
      return true;
    }

    // Admin / manager must have darkstore selected and be assigned to it
    if (darkstoreId) {
      const assignment = await this.prisma.adminUserDarkstore.findUnique({
        where: {
          adminUserId_darkstoreId: {
            adminUserId: payload.sub,
            darkstoreId,
          },
        },
      });

      if (!assignment) {
        throw new ForbiddenException('No access to this darkstore');
      }
    }

    return true;
  }
}
