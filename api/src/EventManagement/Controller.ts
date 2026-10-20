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
import { ApiBody, ApiOperation } from "@nestjs/swagger";
import {
  CurrentUser,
  Roles,
  UserRole,
  type Principal,
} from "../Security/Roles.ts";
import { ApiQueryFrom, ZodValidationPipe, toOpenApi } from "../validation.ts";
import {
  cancelBookingSchema,
  createBookingSchema,
  createEventSchema,
  listBookingsQuerySchema,
  listEventsQuerySchema,
  updateEventSchema,
  type CancelBookingDto,
  type CreateBookingDto,
  type CreateEventDto,
  type ListBookingsQueryDto,
  type ListEventsQueryDto,
  type UpdateEventDto,
} from "./Dto.ts";
import type { Booking, Event } from "./Entity.ts";
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

  @Get("bookings")
  @ApiOperation({
    summary: "List the current user's bookings",
    description:
      "Returns the event bookings made by the authenticated user, ordered by booking id and paginated with an id cursor.",
  })
  @ApiQueryFrom(listBookingsQuerySchema)
  public listBookings(
    @CurrentUser() user: Principal,
    @Query(new ZodValidationPipe(listBookingsQuerySchema))
    { limit, after }: ListBookingsQueryDto,
  ): Promise<{ items: Booking[]; next: number }> {
    return this.service.listBookings(user.id, limit, after);
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

  @Post(":id/bookings")
  @ApiBody({ schema: toOpenApi(createBookingSchema) })
  public createBooking(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(createBookingSchema))
    { quantity }: CreateBookingDto,
  ): Promise<Booking> {
    return this.service.createBooking(id, user.id, quantity);
  }

  @Post(":id/bookings/:bookingId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiBody({ schema: toOpenApi(cancelBookingSchema) })
  public cancelBooking(
    @Param("id", ParseIntPipe) id: number,
    @Param("bookingId", ParseIntPipe) bookingId: number,
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(cancelBookingSchema))
    { version }: CancelBookingDto,
  ): Promise<Booking> {
    return this.service.cancelBooking(id, bookingId, user.id, version);
  }
}
