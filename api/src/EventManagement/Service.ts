import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "./Entity.ts";

@Injectable()
export class EventManagementService {
  constructor(
    @InjectRepository(Event) private readonly repository: Repository<Event>,
  ) {}
}
