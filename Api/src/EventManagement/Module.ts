import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EventManagementController } from "./Controller.ts";
import { Booking, Event } from "./Entity.ts";
import { PaymentClient } from "./PaymentClient.ts";
import { EventManagementScheduler } from "./Scheduler.ts";
import { EventManagementService } from "./Service.ts";

@Module({
  imports: [TypeOrmModule.forFeature([Event, Booking])],
  controllers: [EventManagementController],
  providers: [EventManagementService, PaymentClient, EventManagementScheduler],
})
export class EventManagementModule {}
