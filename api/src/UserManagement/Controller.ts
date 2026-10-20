import { Controller, Get, Post } from "@nestjs/common";
import { CurrentUser, type Principal } from "../Security/Roles.ts";
import type { User } from "./Entity.ts";
import { UserManagementService } from "./Service.ts";

@Controller("users")
export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}

  @Get("me")
  public read(@CurrentUser() user: Principal): Promise<User> {
    return this.service.read(user.id);
  }

  @Post("me")
  public save(@CurrentUser() user: Principal): Promise<User> {
    return this.service.save(user);
  }
}
