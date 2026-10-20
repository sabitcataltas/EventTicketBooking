import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventManagementController } from "./Controller.ts";
import { Booking, Event } from "./Entity.ts";
import { EventManagementService } from "./Service.ts";

test("EventManagement controller and service resolve", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [EventManagementController],
    providers: [
      EventManagementService,
      { provide: getRepositoryToken(Event), useValue: {} },
      { provide: getRepositoryToken(Booking), useValue: {} },
    ],
  }).compile();

  assert.ok(moduleRef.get(EventManagementController));
  assert.ok(moduleRef.get(EventManagementService));
});
