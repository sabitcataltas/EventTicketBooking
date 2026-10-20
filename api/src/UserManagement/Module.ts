import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserManagementController } from "./Controller.ts";
import { User } from "./Entity.ts";
import { UserManagementService } from "./Service.ts";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserManagementController],
  providers: [UserManagementService],
})
export class UserManagementModule {}
