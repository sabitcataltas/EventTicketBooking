import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./Entity.ts";

@Injectable()
export class UserManagementService {
  constructor(
    @InjectRepository(User) private readonly repository: Repository<User>,
  ) {}

  public async read(id: string): Promise<User> {
    const user = await this.repository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  public save(user: User): Promise<User> {
    return this.repository.save(this.repository.create(user));
  }
}
