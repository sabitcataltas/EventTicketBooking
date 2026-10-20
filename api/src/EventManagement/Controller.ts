import { Controller } from "@nestjs/common";
import { EventManagementService } from "./Service.ts";

@Controller("events")
export class EventManagementController {
  constructor(private readonly service: EventManagementService) {}
}
