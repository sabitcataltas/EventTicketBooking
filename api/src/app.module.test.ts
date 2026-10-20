import "reflect-metadata";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module.ts";

test("AppModule bootstraps a Nest application", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();

  await app.init();
  assert.ok(app.getHttpServer());
  await app.close();
});

test("AppModule rejects GET /events without a bearer token", async (t) => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  t.after(() => app.close());
  await app.listen(0);
  const { port } = app.getHttpServer().address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${port}/events`);

  assert.equal(response.status, 401);
});
