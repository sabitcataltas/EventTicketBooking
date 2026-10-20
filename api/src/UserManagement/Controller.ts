import { Controller } from "@nestjs/common";
import { UserManagementService } from "./Service.ts";

@Controller("users")
export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}
}
