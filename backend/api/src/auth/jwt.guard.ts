import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization as string | undefined
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    
    console.log('=== JWT Guard Debug ===')
    console.log('Authorization header:', auth)
    console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
    
    if (!token) throw new UnauthorizedException('No token')

    try {
      const payload = this.jwt.verify(token)
      console.log('JWT Payload:', JSON.stringify(payload, null, 2))
      console.log('Payload keys:', Object.keys(payload))
      console.log('Payload.sub:', payload.sub)
      req.user = payload
      console.log('req.user set to:', JSON.stringify(req.user, null, 2))
      return true
    } catch (error) {
      console.error('JWT Verification Error:', error instanceof Error ? error.message : String(error))
      throw new UnauthorizedException('Invalid token')
    }
  }
}
