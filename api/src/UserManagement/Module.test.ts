import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserManagementController } from "./Controller.ts";
import { User } from "./Entity.ts";
import { UserManagementService } from "./Service.ts";

test("UserManagement controller and service resolve", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [UserManagementController],
    providers: [
      UserManagementService,
      { provide: getRepositoryToken(User), useValue: {} },
    ],
  }).compile();

  assert.ok(moduleRef.get(UserManagementController));
  assert.ok(moduleRef.get(UserManagementService));
});
