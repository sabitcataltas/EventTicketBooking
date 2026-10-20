import { Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../Security/CurrentUser.ts";
import type { Principal } from "../Security/Guard.ts";
import type { User } from "./Entity.ts";
import { UserManagementService } from "./Service.ts";

@Controller("me")
export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}

  @Get()
  public read(@CurrentUser() user: Principal): Promise<User> {
    return this.service.read(user.id);
  }

  @Post()
  public save(@CurrentUser() user: Principal): Promise<User> {
    return this.service.save(user);
  }
}
