import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  Controller,
  Get,
  Post,
  UnauthorizedException,
  type INestApplication,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { UserRole } from "../UserManagement/Entity.ts";
import { CurrentUser } from "./CurrentUser.ts";
import { SecurityGuard, type Principal } from "./Guard.ts";
import { Roles } from "./Roles.ts";
import { SecurityService } from "./Service.ts";

@Controller("probe")
class ProbeController {
  @Get()
  public probe(@CurrentUser() user: Principal): Principal {
    return user;
  }

  @Post()
  @Roles([UserRole.Admin])
  public admin(@CurrentUser() user: Principal): Principal {
    return user;
  }
}

let app: INestApplication;
let baseUrl: string;
let tokens: string[];

const claims: Record<string, unknown> = {
  admin: {
    sub: "admin-1",
    email: "admin@example.com",
    realm_access: { roles: ["default-roles-event-ticket-booking", "ADMIN"] },
  },
  customer: {
    sub: "customer-1",
    email: "customer@example.com",
    realm_access: { roles: ["CUSTOMER"] },
  },
  plain: { sub: "plain-1", email: "plain@example.com" },
};

const service = {
  verify: async (token: string) => {
    tokens.push(token);
    if (!claims[token]) {
      throw new UnauthorizedException();
    }
    return claims[token];
  },
};

const send = (method: string, authorization?: string) =>
  fetch(`${baseUrl}/probe`, {
    method,
    headers: authorization ? { authorization } : {},
  });

before(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
    providers: [
      { provide: SecurityService, useValue: service },
      { provide: APP_GUARD, useClass: SecurityGuard },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
});

after(async () => {
  await app.close();
});

test("SecurityGuard puts the user with its role into the request context", async () => {
  tokens = [];

  const admin = await send("GET", "Bearer admin");
  const customer = await send("GET", "Bearer customer");
  const plain = await send("GET", "Bearer plain");

  assert.deepEqual(await admin.json(), {
    id: "admin-1",
    email: "admin@example.com",
    role: "ADMIN",
  });
  assert.deepEqual(await customer.json(), {
    id: "customer-1",
    email: "customer@example.com",
    role: "CUSTOMER",
  });
  assert.deepEqual(await plain.json(), {
    id: "plain-1",
    email: "plain@example.com",
    role: "CUSTOMER",
  });
  assert.deepEqual(tokens, ["admin", "customer", "plain"]);
});

test("SecurityGuard rejects a missing or malformed header with 401", async () => {
  tokens = [];

  for (const authorization of [undefined, "admin", "Basic admin", "Bearer "]) {
    const response = await send("GET", authorization);
    assert.equal(response.status, 401, authorization);
  }
  assert.deepEqual(tokens, []);
});

test("SecurityGuard rejects an invalid token with 401", async () => {
  tokens = [];

  const response = await send("GET", "Bearer invalid");

  assert.equal(response.status, 401);
  assert.deepEqual(tokens, ["invalid"]);
});

test("SecurityGuard allows a role restricted route only for that role", async () => {
  const admin = await send("POST", "Bearer admin");
  const customer = await send("POST", "Bearer customer");
  const anonymous = await send("POST");

  assert.equal(admin.status, 201);
  assert.equal(customer.status, 403);
  assert.equal(anonymous.status, 401);
});
