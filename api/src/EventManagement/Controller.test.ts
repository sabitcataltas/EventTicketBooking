import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { ConflictException, type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { SecurityGuard } from "../Security/Guard.ts";
import { SecurityService } from "../Security/Service.ts";
import { EventManagementController } from "./Controller.ts";
import { EventManagementService } from "./Service.ts";

const concert = {
  name: "Concert",
  description: "Live music",
  venue: "Arena",
  date: Date.parse("2027-01-15T20:00:00.000Z"),
  capacity: 100,
};

const saved = {
  id: 1,
  ...concert,
  createdAt: new Date("2026-10-20T10:00:00.000Z"),
  updatedAt: new Date("2026-10-20T10:00:00.000Z"),
  version: 1,
};

const savedJson = JSON.parse(JSON.stringify(saved));

type Call = { method: string; args: unknown[] };

let app: INestApplication;
let baseUrl: string;
let calls: Call[];
let conflict: boolean;

const service = {
  create: async (...args: unknown[]) => {
    calls.push({ method: "create", args });
    return saved;
  },
  read: async (...args: unknown[]) => {
    calls.push({ method: "read", args });
    return saved;
  },
  update: async (...args: unknown[]) => {
    calls.push({ method: "update", args });
    if (conflict) {
      throw new ConflictException("Event 1 was modified concurrently");
    }
    return { ...saved, version: 2 };
  },
  delete: async (...args: unknown[]) => {
    calls.push({ method: "delete", args });
  },
  list: async (...args: unknown[]) => {
    calls.push({ method: "list", args });
    return { items: [saved], next: 1 };
  },
};

const security = {
  verify: async (token: string) => ({
    sub: token,
    email: `${token}@example.com`,
    realm_access: { roles: [token.toUpperCase()] },
  }),
};

const send = (
  method: string,
  path: string,
  body?: unknown,
  authorization = "Bearer admin",
) =>
  fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", authorization },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

before(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [EventManagementController],
    providers: [
      { provide: EventManagementService, useValue: service },
      { provide: SecurityService, useValue: security },
      { provide: APP_GUARD, useClass: SecurityGuard },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
});

beforeEach(() => {
  calls = [];
  conflict = false;
});

after(async () => {
  await app.close();
});

test("POST /events creates an event", async () => {
  const response = await send("POST", "/events", concert);

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), savedJson);
  assert.deepEqual(plain(calls), [{ method: "create", args: [concert] }]);
});

test("POST /events defaults a missing description to null", async () => {
  const response = await send("POST", "/events", {
    ...concert,
    description: undefined,
  });

  assert.equal(response.status, 201);
  assert.deepEqual(plain(calls), [
    { method: "create", args: [{ ...concert, description: null }] },
  ]);
});

test("POST /events rejects an invalid body with 400", async () => {
  const invalidBodies = [
    {},
    { ...concert, name: "" },
    { ...concert, name: "x".repeat(201) },
    { ...concert, description: 5 },
    { ...concert, venue: undefined },
    { ...concert, date: "tomorrow" },
    { ...concert, date: 1.5 },
    { ...concert, capacity: 0 },
    { ...concert, capacity: "100" },
    { ...concert, unknown: true },
  ];

  for (const body of invalidBodies) {
    const response = await send("POST", "/events", body);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
  assert.deepEqual(calls, []);
});

test("POST /events lists every validation issue in the 400 body", async () => {
  const response = await send("POST", "/events", {
    ...concert,
    name: "",
    capacity: 0,
  });

  assert.deepEqual(await response.json(), {
    statusCode: 400,
    error: "Bad Request",
    message: [
      "name: Too small: expected string to have >=1 characters",
      "capacity: Too small: expected number to be >=1",
    ],
  });
});

test("GET /events lists events with limit and cursor", async () => {
  const response = await send("GET", "/events?limit=5&after=3");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [savedJson], next: 1 });
  assert.deepEqual(calls, [{ method: "list", args: [5, 3] }]);
});

test("GET /events uses the service defaults without query", async () => {
  const response = await send("GET", "/events");

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ method: "list", args: [undefined, undefined] }]);
});

test("GET /events rejects an invalid query with 400", async () => {
  for (const query of ["limit=0", "limit=101", "limit=a", "after=-1"]) {
    const response = await send("GET", `/events?${query}`);
    assert.equal(response.status, 400, query);
  }
  assert.deepEqual(calls, []);
});

test("GET /events/:id reads an event", async () => {
  const response = await send("GET", "/events/1");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), savedJson);
  assert.deepEqual(calls, [{ method: "read", args: [1] }]);
});

test("GET /events/:id rejects a non-numeric id with 400", async () => {
  const response = await send("GET", "/events/abc");

  assert.equal(response.status, 400);
  assert.deepEqual(calls, []);
});

test("PUT /events/:id updates an event with the client version", async () => {
  const response = await send("PUT", "/events/1", { ...concert, version: 1 });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ...savedJson, version: 2 });
  assert.deepEqual(plain(calls), [
    { method: "update", args: [1, { ...concert, version: 1 }] },
  ]);
});

test("PUT /events/:id rejects a body without version with 400", async () => {
  const response = await send("PUT", "/events/1", concert);

  assert.equal(response.status, 400);
  assert.deepEqual(calls, []);
});

test("PUT /events/:id returns 409 on a version conflict", async () => {
  conflict = true;

  const response = await send("PUT", "/events/1", { ...concert, version: 1 });

  assert.equal(response.status, 409);
});

test("DELETE /events/:id deletes an event", async () => {
  const response = await send("DELETE", "/events/1");

  assert.equal(response.status, 204);
  assert.deepEqual(calls, [{ method: "delete", args: [1] }]);
});

test("a customer can list and read events", async () => {
  for (const path of ["/events", "/events/1"]) {
    const response = await send("GET", path, undefined, "Bearer customer");
    assert.equal(response.status, 200, path);
  }
});

test("a customer cannot create, update or delete events", async () => {
  const requests: [string, string, unknown][] = [
    ["POST", "/events", concert],
    ["PUT", "/events/1", { ...concert, version: 1 }],
    ["DELETE", "/events/1", undefined],
  ];

  for (const [method, path, body] of requests) {
    const response = await send(method, path, body, "Bearer customer");
    assert.equal(response.status, 403, method);
  }
  assert.deepEqual(calls, []);
});

test("every event endpoint requires a bearer token", async () => {
  for (const [method, path] of [
    ["GET", "/events"],
    ["GET", "/events/1"],
    ["POST", "/events"],
    ["PUT", "/events/1"],
    ["DELETE", "/events/1"],
  ]) {
    const response = await send(method, path, undefined, "");
    assert.equal(response.status, 401, `${method} ${path}`);
  }
  assert.deepEqual(calls, []);
});
