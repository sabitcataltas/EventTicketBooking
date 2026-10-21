import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventManagementService } from "./Service.ts";

@Injectable()
export class EventManagementScheduler {
  constructor(private readonly service: EventManagementService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public settlePendingBookings(): Promise<void> {
    return this.service.settlePendingBookings();
  }
}
