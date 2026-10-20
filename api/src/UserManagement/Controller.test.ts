import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { SecurityGuard } from "../Security/Guard.ts";
import { UserRole } from "../Security/Roles.ts";
import { SecurityService } from "../Security/Service.ts";
import { UserManagementController } from "./Controller.ts";
import { UserManagementService } from "./Service.ts";

const principal = {
  id: "8d3c1a52-8f5e-4c4c-9a4c-2b8f4f6f1e01",
  email: "customer@example.com",
  role: UserRole.Customer,
};

type Call = { method: string; args: unknown[] };

let app: INestApplication;
let baseUrl: string;
let calls: Call[];

const service = {
  read: async (...args: unknown[]) => {
    calls.push({ method: "read", args });
    return principal;
  },
  save: async (...args: unknown[]) => {
    calls.push({ method: "save", args });
    return principal;
  },
};

const security = {
  verify: async () => ({
    sub: principal.id,
    email: principal.email,
    realm_access: { roles: ["CUSTOMER"] },
  }),
};

const send = (method: string, authorization = "Bearer token") =>
  fetch(`${baseUrl}/me`, { method, headers: { authorization } });

before(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [UserManagementController],
    providers: [
      { provide: UserManagementService, useValue: service },
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
});

after(async () => {
  await app.close();
});

test("GET /me reads the authenticated user", async () => {
  const response = await send("GET");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), principal);
  assert.deepEqual(calls, [{ method: "read", args: [principal.id] }]);
});

test("POST /me saves the authenticated user from the token", async () => {
  const response = await send("POST");

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), principal);
  assert.deepEqual(calls, [{ method: "save", args: [principal] }]);
});

test("/me requires a bearer token", async () => {
  for (const method of ["GET", "POST"]) {
    const response = await send(method, "");
    assert.equal(response.status, 401, method);
  }
  assert.deepEqual(calls, []);
});
