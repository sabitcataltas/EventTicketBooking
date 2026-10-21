import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { UserRole } from "../Security/Roles.ts";
import { User } from "./Entity.ts";
import { UserManagementService } from "./Service.ts";

let moduleRef: TestingModule;
let service: UserManagementService;
let repository: Repository<User>;

const customer = {
  id: "8d3c1a52-8f5e-4c4c-9a4c-2b8f4f6f1e01",
  email: "customer@example.com",
  role: UserRole.Customer,
};

before(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: "mysql",
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [User],
        synchronize: true,
        dropSchema: true,
        timezone: "Z",
      }),
      TypeOrmModule.forFeature([User]),
    ],
    providers: [UserManagementService],
  }).compile();

  service = moduleRef.get(UserManagementService);
  repository = moduleRef.get(getRepositoryToken(User));
});

beforeEach(async () => {
  await repository.clear();
});

after(async () => {
  await moduleRef.close();
});

test("save stores the user", async () => {
  const saved = await service.save(customer);

  assert.deepEqual({ ...saved }, customer);
  assert.deepEqual(
    { ...(await repository.findOneBy({ id: customer.id })) },
    customer,
  );
});

test("save updates an existing user", async () => {
  await service.save(customer);

  await service.save({
    ...customer,
    email: "new@example.com",
    role: UserRole.Admin,
  });

  assert.deepEqual(await repository.find(), [
    Object.assign(new User(), {
      ...customer,
      email: "new@example.com",
      role: UserRole.Admin,
    }),
  ]);
});

test("read returns the user with the given id", async () => {
  await service.save(customer);

  assert.deepEqual({ ...(await service.read(customer.id)) }, customer);
});

test("read throws NotFoundException for an unknown id", async () => {
  await assert.rejects(service.read(customer.id), NotFoundException);
});
