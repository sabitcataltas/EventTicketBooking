import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JWTPayload } from "jose";
import { UserRole, type User } from "../UserManagement/Entity.ts";
import { Roles } from "./Roles.ts";
import { SecurityService } from "./Service.ts";

export type Principal = Pick<User, "id" | "email" | "role">;

type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: Principal;
};

type Claims = JWTPayload & {
  email?: string;
  realm_access?: { roles?: string[] };
};

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly service: SecurityService,
    private readonly reflector: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const claims: Claims = await this.service.verify(token);
    const user: Principal = {
      id: claims.sub as string,
      email: claims.email as string,
      role: claims.realm_access?.roles?.includes(UserRole.Admin)
        ? UserRole.Admin
        : UserRole.Customer,
    };
    request.user = user;
    const roles = this.reflector.getAllAndOverride(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
