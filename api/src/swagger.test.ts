import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Test } from "@nestjs/testing";
import { EventManagementController } from "./EventManagement/Controller.ts";
import { EventManagementService } from "./EventManagement/Service.ts";
import { setupSwagger } from "./swagger.ts";

test("setupSwagger serves the OpenAPI document for the event endpoints", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [EventManagementController],
    providers: [{ provide: EventManagementService, useValue: {} }],
  }).compile();
  const app = moduleRef.createNestApplication();
  setupSwagger(app);
  await app.listen(0);

  const ui = await fetch(`${await app.getUrl()}/docs`);
  const response = await fetch(`${await app.getUrl()}/docs-json`);
  const document = await response.json();
  await app.close();

  assert.equal(ui.status, 200);
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(document.paths).sort(), [
    "/events",
    "/events/bookings",
    "/events/{id}",
    "/events/{id}/bookings",
    "/events/{id}/bookings/{bookingId}/cancel",
  ]);
  assert.deepEqual(
    document.paths["/events/{id}"].put.requestBody.content["application/json"]
      .schema.required,
    ["name", "venue", "date", "capacity", "version"],
  );
  assert.deepEqual(
    document.paths["/events"].get.parameters.map(
      ({ name }: { name: string }) => name,
    ),
    ["limit", "after"],
  );
  assert.deepEqual(
    document.paths["/events/{id}/bookings"].post.requestBody.content[
      "application/json"
    ].schema.required,
    ["quantity"],
  );
  assert.deepEqual(
    document.paths["/events/{id}/bookings/{bookingId}/cancel"].post.requestBody
      .content["application/json"].schema.required,
    ["version"],
  );
  assert.deepEqual(
    document.paths["/events/bookings"].get.parameters.map(
      ({ name }: { name: string }) => name,
    ),
    ["limit", "after"],
  );
  assert.equal(
    document.paths["/events/bookings"].get.summary,
    "List the current user's bookings",
  );
  assert.equal(
    document.paths["/events/bookings"].get.description,
    "Returns the event bookings made by the authenticated user, ordered by booking id and paginated with an id cursor.",
  );
  assert.deepEqual(document.security, [{ bearer: [] }]);
  assert.equal(document.components.securitySchemes.bearer.scheme, "bearer");
});
