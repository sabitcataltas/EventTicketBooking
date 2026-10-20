import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "./Entity.ts";

@Injectable()
export class EventManagementService {
  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
  ) {}


  public create(event :Omit<Event, "id">) {}

  public read(id:string) : Promise<Event> {}

  public update(id:number, event: Omit<Event, "id">) {}

  public delete(id:number, event: Omit<Event, "id">) {}

  public list() : Promise<{items: Event[], next: number }>{}

}
