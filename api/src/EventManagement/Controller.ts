import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { Roles, UserRole } from "../Security/Roles.ts";
import { ApiQueryFrom, ZodValidationPipe, toOpenApi } from "../validation.ts";
import {
  createEventSchema,
  listEventsQuerySchema,
  updateEventSchema,
  type CreateEventDto,
  type ListEventsQueryDto,
  type UpdateEventDto,
} from "./Dto.ts";
import type { Event } from "./Entity.ts";
import { EventManagementService } from "./Service.ts";

@Controller("events")
export class EventManagementController {
  constructor(private readonly service: EventManagementService) {}

  @Post()
  @Roles([UserRole.Admin])
  @ApiBody({ schema: toOpenApi(createEventSchema) })
  public create(
    @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventDto,
  ): Promise<Event> {
    return this.service.create(body);
  }

  @Get()
  @ApiQueryFrom(listEventsQuerySchema)
  public list(
    @Query(new ZodValidationPipe(listEventsQuerySchema))
    { limit, after }: ListEventsQueryDto,
  ): Promise<{ items: Event[]; next: number }> {
    return this.service.list(limit, after);
  }

  @Get(":id")
  public read(@Param("id", ParseIntPipe) id: number): Promise<Event> {
    return this.service.read(id);
  }

  @Put(":id")
  @Roles([UserRole.Admin])
  @ApiBody({ schema: toOpenApi(updateEventSchema) })
  public update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateEventSchema)) body: UpdateEventDto,
  ): Promise<Event> {
    return this.service.update(id, body);
  }

  @Delete(":id")
  @Roles([UserRole.Admin])
  @HttpCode(HttpStatus.NO_CONTENT)
  public delete(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.service.delete(id);
  }
}
