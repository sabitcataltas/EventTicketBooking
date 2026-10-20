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
