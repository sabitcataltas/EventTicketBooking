import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Event } from "./Entity.ts";
import { EventManagementService } from "./Service.ts";

let moduleRef: TestingModule;
let service: EventManagementService;
let repository: Repository<Event>;

const concert: Omit<Event, "id"> = {
  name: "Concert",
  description: "Live music",
  venue: "Arena",
  date: Date.parse("2027-01-15T20:00:00.000Z"),
  capacity: 100,
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
        entities: [Event],
        synchronize: true,
        dropSchema: true,
        timezone: "Z",
      }),
      TypeOrmModule.forFeature([Event]),
    ],
    providers: [EventManagementService],
  }).compile();

  service = moduleRef.get(EventManagementService);
  repository = moduleRef.get(getRepositoryToken(Event));
});

beforeEach(async () => {
  await repository.clear();
});

after(async () => {
  await moduleRef.close();
});

test("create saves an event and returns it with an id", async () => {
  const created = await service.create(concert);

  assert.ok(created.id);
  assert.deepEqual(await repository.findOneBy({ id: created.id }), {
    id: created.id,
    ...concert,
  });
});

test("read returns the event with the given id", async () => {
  const created = await service.create(concert);

  assert.deepEqual(await service.read(created.id), {
    id: created.id,
    ...concert,
  });
});

test("read throws NotFoundException for an unknown id", async () => {
  await assert.rejects(service.read(999), NotFoundException);
});

test("update changes the event and returns it", async () => {
  const created = await service.create(concert);
  const changes = { ...concert, name: "Opera", capacity: 50 };

  const updated = await service.update(created.id, changes);

  assert.deepEqual(updated, { id: created.id, ...changes });
  assert.deepEqual(await service.read(created.id), updated);
});

test("update throws NotFoundException for an unknown id", async () => {
  await assert.rejects(service.update(999, concert), NotFoundException);
});

test("update rejects a concurrent update of the same version with ConflictException", async () => {
  const created = await service.create(concert);

  const results = await Promise.allSettled([
    service.update(created.id, { ...created, name: "Opera" }),
    service.update(created.id, { ...created, name: "Ballet" }),
  ]);

  const fulfilled = results.filter(
    (result): result is PromiseFulfilledResult<Event> =>
      result.status === "fulfilled",
  );
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof ConflictException);
  assert.deepEqual(await service.read(created.id), fulfilled[0].value);
});

test("delete removes the event", async () => {
  const created = await service.create(concert);

  await service.delete(created.id);

  assert.equal(await repository.findOneBy({ id: created.id }), null);
});

test("delete throws NotFoundException for an unknown id", async () => {
  await assert.rejects(service.delete(999), NotFoundException);
});

test("list returns the saved events", async () => {
  const first = await service.create(concert);
  const second = await service.create({ ...concert, name: "Opera" });

  const { items } = await service.list();

  assert.deepEqual(items, [first, second]);
});
