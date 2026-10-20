import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { Event } from "./Entity.ts";

@Injectable()
export class EventManagementService {
  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
  ) {}

  public create(event: Omit<Event, "id">): Promise<Event> {
    return this.repository.save(this.repository.create(event));
  }

  public async read(id: number): Promise<Event> {
    const event = await this.repository.findOneBy({ id });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  public async update(id: number, event: Omit<Event, "id">): Promise<Event> {
    const existing = await this.read(id);
    return this.repository.save(this.repository.merge(existing, event));
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
