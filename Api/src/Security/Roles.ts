import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export enum UserRole {
  Customer = "CUSTOMER",
  Admin = "ADMIN",
}

export type Principal = {
  id: string;
  email: string;
  role: UserRole;
};

export const Roles = Reflector.createDecorator<UserRole[]>();

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user,
);
