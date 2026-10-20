import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventManagementController } from "./Controller.ts";
import { Event } from "./Entity.ts";
import { EventManagementService } from "./Service.ts";

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [EventManagementController],
  providers: [EventManagementService],
})
export class EventManagementModule {}
