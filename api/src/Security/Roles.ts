import { Reflector } from "@nestjs/core";
import type { UserRole } from "../UserManagement/Entity.ts";

export const Roles = Reflector.createDecorator<UserRole[]>();
