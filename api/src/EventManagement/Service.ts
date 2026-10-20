import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository, type EntityManager } from "typeorm";
import { Booking, BookingStatus, Event } from "./Entity.ts";

const bookingHoldMs = 10 * 60 * 1000;

export type EventInput = Omit<
  Event,
  "id" | "availableTickets" | "createdAt" | "updatedAt" | "version"
>;

export type EventUpdateInput = EventInput & Pick<Event, "version">;

@Injectable()
export class EventManagementService {
  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  public create(event: EventInput): Promise<Event> {
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
    const current = await this.read(id);
    const availableTickets =
      current.availableTickets + capacity - current.capacity;
    if (availableTickets < 0) {
      throw new BadRequestException(
        `Event ${id} capacity cannot be lower than its sold tickets`,
      );
    }
    const result = await this.repository.update(
      { id, version },
      {
        name,
        description,
        venue,
        date,
        capacity,
        availableTickets,
        updatedAt: new Date(),
      },
    );
    if (result.affected === 0) {
      throw new ConflictException(`Event ${id} was modified concurrently`);
    }
    return this.read(id);
  }

  public async delete(id: number): Promise<void> {
    const event = await this.read(id);
    await this.repository.remove(event);
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
      const result = await this.shiftAvailableTickets(
        manager,
        eventId,
        -quantity,
      );
      if (result.affected === 0) {
        await this.read(eventId);
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
          expiresAt: Date.now() + bookingHoldMs,
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
      await this.shiftAvailableTickets(manager, eventId, booking.quantity);
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

  private shiftAvailableTickets(
    manager: EntityManager,
    eventId: number,
    change: number,
  ) {
    return manager
      .createQueryBuilder()
      .update(Event)
      .set({
        availableTickets: () => "availableTickets + :change",
        version: () => "version + 1",
      })
      .where("id = :eventId AND availableTickets + :change >= 0", {
        eventId,
        change,
      })
      .execute();
  }
}
