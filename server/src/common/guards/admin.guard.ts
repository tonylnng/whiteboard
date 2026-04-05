import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.sub) throw new ForbiddenException('Not authenticated');
    const dbUser = await this.usersService.findById(user.sub);
    if (!dbUser?.isAdmin) throw new ForbiddenException('Admin access required');
    return true;
  }
}
