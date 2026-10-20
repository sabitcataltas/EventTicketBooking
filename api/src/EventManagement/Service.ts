import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Event } from "./Entity.ts";

export type EventInput = Omit<
  Event,
  "id" | "availableTickets" | "createdAt" | "updatedAt" | "version"
>;

export type EventUpdateInput = EventInput & Pick<Event, "version">;

@Injectable()
export class EventManagementService {
  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
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
}
