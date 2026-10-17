import "reflect-metadata";
import assert from "node:assert/strict";
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
