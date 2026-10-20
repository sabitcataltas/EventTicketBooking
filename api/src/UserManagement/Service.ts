import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./Entity.ts";

@Injectable()
export class UserManagementService {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}
}
