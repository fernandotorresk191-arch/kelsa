import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization as string | undefined
    
    // Поддержка токена через query параметр для SSE соединений
    const queryToken = req.query?.token as string | undefined
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : queryToken || null
    
    if (!token) throw new UnauthorizedException('No token')

    try {
      const payload = this.jwt.verify(token)
      req.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }
}
