import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository, type EntityManager } from "typeorm";
import { Booking, BookingStatus, Event } from "./Entity.ts";
import { PaymentClient } from "./PaymentClient.ts";

const bookingHoldMs = 30 * 60 * 1000;

export type EventInput = Omit<
  Event,
  | "id"
  | "availableTickets"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "version"
>;

export type EventUpdateInput = EventInput & Pick<Event, "version">;

@Injectable()
export class EventManagementService {
  private readonly logger = new Logger(EventManagementService.name);

  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly paymentClient: PaymentClient,
  ) {}

  public async create(event: EventInput): Promise<Event> {
    this.assertUpcoming(event.date);
    return this.repository.save(
      this.repository.create({ ...event, availableTickets: event.capacity }),
    );
  }

  public async read(id: number): Promise<Event> {
    const event = await this.repository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  public async update(
    id: number,
    { name, description, venue, date, capacity, version }: EventUpdateInput,
  ): Promise<Event> {
    this.assertUpcoming(date);
    const result = await this.repository
      .createQueryBuilder()
      .update(Event)
      .set({
        availableTickets: () => "availableTickets + :capacity - capacity",
        name,
        description,
        venue,
        date,
        capacity,
        updatedAt: new Date(),
      })
      .where(
        "id = :id AND deletedAt IS NULL AND version = :version AND availableTickets + :capacity - capacity >= 0",
        { id, version, capacity },
      )
      .execute();
    if (result.affected === 0) {
      const current = await this.read(id);
      if (current.version !== version) {
        throw new ConflictException(`Event ${id} was modified concurrently`);
      }
      throw new BadRequestException(
        `Event ${id} capacity cannot be lower than its sold tickets`,
      );
    }
    return this.read(id);
  }

  public delete(id: number): Promise<void> {
    return this.repository.manager.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!event) {
        throw new NotFoundException(`Event ${id} not found`);
      }
      if (event.date <= Date.now()) {
        throw new BadRequestException(`Event ${id} has already started`);
      }
      const activeBookings = await manager.countBy(Booking, {
        eventId: id,
        status: In([BookingStatus.Pending, BookingStatus.Confirmed]),
      });
      if (activeBookings > 0) {
        throw new ConflictException(`Event ${id} has active bookings`);
      }
      await manager.softRemove(event);
    });
  }

  public async list(
    limit: number = 10,
    after: number = 0,
  ): Promise<{ items: Event[]; next: number }> {
    const items = await this.repository.find({
      where: { id: MoreThan(after) },
      order: { id: "ASC" },
      take: limit,
    });
    return { items, next: items.at(-1)?.id ?? after };
  }

  public createBooking(
    eventId: number,
    userId: string,
    quantity: number,
  ): Promise<Booking> {
    return this.repository.manager.transaction(async (manager) => {
      const now = Date.now();
      const result = await this.shiftAvailableTickets(
        manager,
        eventId,
        -quantity,
        now,
      );
      if (result.affected === 0) {
        const event = await this.read(eventId);
        if (event.date <= now) {
          throw new BadRequestException(`Event ${eventId} has already started`);
        }
        throw new BadRequestException(
          `Event ${eventId} does not have ${quantity} available tickets`,
        );
      }
      return manager.save(
        manager.create(Booking, {
          eventId,
          userId,
          quantity,
          status: BookingStatus.Pending,
          expiresAt: now + bookingHoldMs,
        }),
      );
    });
  }

  public cancelBooking(
    eventId: number,
    bookingId: number,
    userId: string,
    version: number,
  ): Promise<Booking> {
    return this.repository.manager.transaction(async (manager) => {
      const booking = await manager.findOneBy(Booking, {
        id: bookingId,
        eventId,
        userId,
      });
      if (!booking) {
        throw new NotFoundException(`Booking ${bookingId} not found`);
      }
      if (
        booking.status !== BookingStatus.Pending &&
        booking.status !== BookingStatus.Confirmed
      ) {
        throw new BadRequestException(
          `Booking ${bookingId} cannot be cancelled`,
        );
      }
      if (
        booking.status === BookingStatus.Pending &&
        booking.expiresAt <= Date.now()
      ) {
        throw new BadRequestException(`Booking ${bookingId} has expired`);
      }
      const result = await manager.update(
        Booking,
        { id: bookingId, version },
        { status: BookingStatus.Cancelled, updatedAt: new Date() },
      );
      if (result.affected === 0) {
        throw new ConflictException(
          `Booking ${bookingId} was modified concurrently`,
        );
      }
      const shifted = await this.shiftAvailableTickets(
        manager,
        eventId,
        booking.quantity,
      );
      if (shifted.affected === 0) {
        await this.read(eventId);
        throw new ConflictException(
          `Event ${eventId} cannot take back ${booking.quantity} tickets`,
        );
      }
      return manager.findOneByOrFail(Booking, { id: bookingId });
    });
  }

  public async listBookings(
    userId: string,
    limit: number = 10,
    after: number = 0,
  ): Promise<{ items: Booking[]; next: number }> {
    const items = await this.bookingRepository.find({
      where: { userId, id: MoreThan(after) },
      order: { id: "ASC" },
      take: limit,
    });
    return { items, next: items.at(-1)?.id ?? after };
  }

  public async settlePendingBookings(now: number = Date.now()): Promise<void> {
    const bookings = await this.bookingRepository.findBy({
      status: BookingStatus.Pending,
    });
    for (const booking of bookings) {
      try {
        if (await this.paymentClient.isPaid(booking.id)) {
          await this.settleBooking(booking, BookingStatus.Confirmed);
        } else if (booking.expiresAt <= now) {
          await this.settleBooking(booking, BookingStatus.Expired);
        }
      } catch (error) {
        this.logger.error(`Booking ${booking.id} could not be settled`, error);
      }
    }
  }

  private settleBooking(
    { id, eventId, quantity, version }: Booking,
    status: BookingStatus.Confirmed | BookingStatus.Expired,
  ): Promise<void> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.update(
        Booking,
        { id, version },
        { status, updatedAt: new Date() },
      );
      if (result.affected === 0) {
        throw new ConflictException(`Booking ${id} was modified concurrently`);
      }
      if (status === BookingStatus.Confirmed) {
        return;
      }
      const shifted = await this.shiftAvailableTickets(
        manager,
        eventId,
        quantity,
      );
      if (shifted.affected === 0) {
        throw new ConflictException(
          `Event ${eventId} cannot take back ${quantity} tickets`,
        );
      }
    });
  }

  private shiftAvailableTickets(
    manager: EntityManager,
    eventId: number,
    change: number,
    startsAfter: number = -1,
  ) {
    return manager
      .createQueryBuilder()
      .update(Event)
      .set({
        availableTickets: () => "availableTickets + :change",
        version: () => "version + 1",
      })
      .where(
        "id = :eventId AND deletedAt IS NULL AND date > :startsAfter AND availableTickets + :change BETWEEN 0 AND capacity",
        {
          eventId,
          change,
          startsAfter,
        },
      )
      .execute();
  }

  private assertUpcoming(date: number): void {
    if (date <= Date.now()) {
      throw new BadRequestException("Event date must be in the future");
    }
  }
}
