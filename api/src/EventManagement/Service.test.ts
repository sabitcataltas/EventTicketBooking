import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Booking, BookingStatus, Event } from "./Entity.ts";
import { EventManagementService, type EventInput } from "./Service.ts";

let moduleRef: TestingModule;
let service: EventManagementService;
let repository: Repository<Event>;
let bookingRepository: Repository<Booking>;

const alice = "6f1c2b8e-3d4a-4b5c-9e7f-0a1b2c3d4e5f";
const bob = "7a2d3c9f-4e5b-4c6d-8f9a-1b2c3d4e5f6a";

const concert: EventInput = {
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
        entities: [Event, Booking],
        synchronize: true,
        dropSchema: true,
        timezone: "Z",
      }),
      TypeOrmModule.forFeature([Event, Booking]),
    ],
    providers: [EventManagementService],
  }).compile();

  service = moduleRef.get(EventManagementService);
  repository = moduleRef.get(getRepositoryToken(Event));
  bookingRepository = moduleRef.get(getRepositoryToken(Booking));
});

beforeEach(async () => {
  await repository.clear();
  await bookingRepository.clear();
});

after(async () => {
  await moduleRef.close();
});

test("create saves an event with timestamps and an initial version", async () => {
  const created = await service.create(concert);

  assert.ok(created.id);
  assert.ok(created.createdAt instanceof Date);
  assert.deepEqual(created.updatedAt, created.createdAt);
  assert.equal(created.version, 1);
  assert.deepEqual(await repository.findOneBy({ id: created.id }), created);
});

test("create stores the date as milliseconds", async () => {
  const created = await service.create(concert);

  const [row] = await repository.query("SELECT date FROM events WHERE id = ?", [
    created.id,
  ]);

  assert.equal(Number(row.date), concert.date);
});

test("create starts with every ticket available", async () => {
  const created = await service.create(concert);

  assert.equal(created.availableTickets, concert.capacity);
});

test("read returns the event with the given id", async () => {
  const created = await service.create(concert);

  assert.deepEqual(await service.read(created.id), created);
});

test("read throws NotFoundException for an unknown id", async () => {
  await assert.rejects(service.read(999), NotFoundException);
});

test("update changes the event, bumps the version and refreshes updatedAt", async () => {
  const created = await service.create(concert);
  const changes = {
    ...concert,
    name: "Opera",
    capacity: 50,
    version: created.version,
  };

  const updated = await service.update(created.id, changes);

  assert.equal(updated.name, "Opera");
  assert.equal(updated.capacity, 50);
  assert.deepEqual(updated.createdAt, created.createdAt);
  assert.ok(updated.updatedAt.getTime() >= created.updatedAt.getTime());
  assert.equal(updated.version, created.version + 1);
  assert.deepEqual(await service.read(created.id), updated);
});

test("update shifts the available tickets by the capacity change", async () => {
  const created = await service.create(concert);
  await repository.update(created.id, { availableTickets: 70 });
  const { version } = await service.read(created.id);

  const updated = await service.update(created.id, {
    ...concert,
    capacity: 150,
    version,
  });

  assert.equal(updated.availableTickets, 120);
});

test("update rejects a capacity below the sold tickets with BadRequestException", async () => {
  const created = await service.create(concert);
  await repository.update(created.id, { availableTickets: 70 });
  const { version } = await service.read(created.id);

  await assert.rejects(
    service.update(created.id, { ...concert, capacity: 29, version }),
    BadRequestException,
  );
});

test("update throws NotFoundException for an unknown id", async () => {
  await assert.rejects(
    service.update(999, { ...concert, version: 1 }),
    NotFoundException,
  );
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

test("list returns the saved events ordered by id", async () => {
  const first = await service.create(concert);
  const second = await service.create({ ...concert, name: "Opera" });

  assert.deepEqual(await service.list(), {
    items: [first, second],
    next: second.id,
  });
});

test("list returns at most limit events", async () => {
  const first = await service.create(concert);
  await service.create({ ...concert, name: "Opera" });

  assert.deepEqual(await service.list(1), { items: [first], next: first.id });
});

test("list returns the events after the given cursor", async () => {
  const first = await service.create(concert);
  const second = await service.create({ ...concert, name: "Opera" });
  const third = await service.create({ ...concert, name: "Ballet" });

  assert.deepEqual(await service.list(1, first.id), {
    items: [second],
    next: second.id,
  });
  assert.deepEqual(await service.list(10, second.id), {
    items: [third],
    next: third.id,
  });
});

test("list returns no events and keeps the cursor when nothing is left", async () => {
  const created = await service.create(concert);

  assert.deepEqual(await service.list(10, created.id), {
    items: [],
    next: created.id,
  });
});

test("createBooking saves a pending booking that expires in 10 minutes", async () => {
  const event = await service.create(concert);
  const before = Date.now();

  const booking = await service.createBooking(event.id, alice, 2);

  assert.ok(booking.id);
  assert.equal(booking.eventId, event.id);
  assert.equal(booking.userId, alice);
  assert.equal(booking.quantity, 2);
  assert.equal(booking.status, BookingStatus.Pending);
  assert.equal(booking.version, 1);
  assert.ok(booking.expiresAt >= before + 10 * 60 * 1000);
  assert.ok(booking.expiresAt <= Date.now() + 10 * 60 * 1000);
  assert.deepEqual(
    await bookingRepository.findOneBy({ id: booking.id }),
    booking,
  );
});

test("createBooking takes the tickets from the event and bumps its version", async () => {
  const event = await service.create(concert);

  await service.createBooking(event.id, alice, 2);

  const updated = await service.read(event.id);
  assert.equal(updated.availableTickets, 98);
  assert.equal(updated.version, event.version + 1);
});

test("createBooking rejects more tickets than available with BadRequestException", async () => {
  const event = await service.create({ ...concert, capacity: 1 });

  await assert.rejects(
    service.createBooking(event.id, alice, 2),
    BadRequestException,
  );
  assert.deepEqual(await service.read(event.id), event);
  assert.equal(await bookingRepository.count(), 0);
});

test("createBooking throws NotFoundException for an unknown event", async () => {
  await assert.rejects(service.createBooking(999, alice, 1), NotFoundException);
  assert.equal(await bookingRepository.count(), 0);
});

test("createBooking lets only one concurrent booking take the last tickets", async () => {
  const event = await service.create({ ...concert, capacity: 2 });

  const results = await Promise.allSettled([
    service.createBooking(event.id, alice, 2),
    service.createBooking(event.id, bob, 2),
  ]);

  const rejected = results.filter((result) => result.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof BadRequestException);
  assert.equal((await service.read(event.id)).availableTickets, 0);
  assert.equal(await bookingRepository.count(), 1);
});

const setStatus = async (booking: Booking, status: BookingStatus) => {
  await bookingRepository.update(booking.id, { status });
  return bookingRepository.findOneByOrFail({ id: booking.id });
};

test("cancelBooking cancels the booking, bumps its version and returns its tickets", async () => {
  const event = await service.create(concert);
  const booking = await service.createBooking(event.id, alice, 2);

  const cancelled = await service.cancelBooking(
    event.id,
    booking.id,
    alice,
    booking.version,
  );

  assert.equal(cancelled.status, BookingStatus.Cancelled);
  assert.equal(cancelled.version, booking.version + 1);
  assert.deepEqual(cancelled.createdAt, booking.createdAt);
  assert.deepEqual(
    await bookingRepository.findOneBy({ id: booking.id }),
    cancelled,
  );
  const updated = await service.read(event.id);
  assert.equal(updated.availableTickets, 100);
  assert.equal(updated.version, event.version + 2);
});

test("cancelBooking cancels a confirmed booking", async () => {
  const event = await service.create(concert);
  const booking = await setStatus(
    await service.createBooking(event.id, alice, 2),
    BookingStatus.Confirmed,
  );

  const cancelled = await service.cancelBooking(
    event.id,
    booking.id,
    alice,
    booking.version,
  );

  assert.equal(cancelled.status, BookingStatus.Cancelled);
  assert.equal((await service.read(event.id)).availableTickets, 100);
});

test("cancelBooking throws NotFoundException for an unknown, foreign or other event booking", async () => {
  const event = await service.create(concert);
  const other = await service.create({ ...concert, name: "Opera" });
  const booking = await service.createBooking(event.id, alice, 2);

  for (const [eventId, bookingId, userId] of [
    [event.id, 999, alice],
    [event.id, booking.id, bob],
    [other.id, booking.id, alice],
  ] as const) {
    await assert.rejects(
      service.cancelBooking(eventId, bookingId, userId, booking.version),
      NotFoundException,
    );
  }
  assert.deepEqual(
    await bookingRepository.findOneBy({ id: booking.id }),
    booking,
  );
});

test("cancelBooking rejects a cancelled or expired booking with BadRequestException", async () => {
  const event = await service.create(concert);

  for (const status of [BookingStatus.Cancelled, BookingStatus.Expired]) {
    const booking = await setStatus(
      await service.createBooking(event.id, alice, 2),
      status,
    );

    await assert.rejects(
      service.cancelBooking(event.id, booking.id, alice, booking.version),
      BadRequestException,
    );
  }
  assert.equal((await service.read(event.id)).availableTickets, 96);
});

test("cancelBooking rejects a stale version with ConflictException", async () => {
  const event = await service.create(concert);
  const booking = await service.createBooking(event.id, alice, 2);
  const confirmed = await setStatus(booking, BookingStatus.Confirmed);

  await assert.rejects(
    service.cancelBooking(event.id, booking.id, alice, booking.version),
    ConflictException,
  );
  assert.deepEqual(
    await bookingRepository.findOneBy({ id: booking.id }),
    confirmed,
  );
  assert.equal((await service.read(event.id)).availableTickets, 98);
});

test("cancelBooking returns the tickets only once for concurrent cancels", async () => {
  const event = await service.create(concert);
  const booking = await service.createBooking(event.id, alice, 2);

  const results = await Promise.allSettled([
    service.cancelBooking(event.id, booking.id, alice, booking.version),
    service.cancelBooking(event.id, booking.id, alice, booking.version),
  ]);

  const rejected = results.filter((result) => result.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0].reason instanceof ConflictException ||
      rejected[0].reason instanceof BadRequestException,
  );
  assert.equal((await service.read(event.id)).availableTickets, 100);
});

test("listBookings returns only the user's bookings ordered by id", async () => {
  const event = await service.create(concert);
  const first = await service.createBooking(event.id, alice, 1);
  await service.createBooking(event.id, bob, 1);
  const second = await service.createBooking(event.id, alice, 2);

  assert.deepEqual(await service.listBookings(alice), {
    items: [first, second],
    next: second.id,
  });
});

test("listBookings returns at most limit bookings after the given cursor", async () => {
  const event = await service.create(concert);
  const first = await service.createBooking(event.id, alice, 1);
  const second = await service.createBooking(event.id, alice, 1);
  await service.createBooking(event.id, alice, 1);

  assert.deepEqual(await service.listBookings(alice, 1, first.id), {
    items: [second],
    next: second.id,
  });
});

test("listBookings returns no bookings and keeps the cursor when nothing is left", async () => {
  assert.deepEqual(await service.listBookings(alice, 10, 5), {
    items: [],
    next: 5,
  });
});
