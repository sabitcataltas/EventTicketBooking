import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { createPaymentApp } from "./Server.ts";
import { MockPaymentService } from "./Service.ts";

const app = createPaymentApp(new MockPaymentService());
let server: Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

const post = (body: unknown) =>
  fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("POST /payments creates a payment", async () => {
  const response = await post({ bookingId: 1 });

  assert.equal(response.status, 201);
  const payment = await response.json();
  assert.equal(payment.bookingId, 1);
  assert.equal(payment.status, "CONFIRMED");
});

test("POST /payments rejects an invalid booking id", async () => {
  const response = await post({ bookingId: "x" });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "bookingId must be a positive integer",
  });
});

test("POST /payments rejects malformed json", async () => {
  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "Request body must be valid JSON",
  });
});

test("GET /payments/:bookingId returns the payment", async () => {
  const created = await (await post({ bookingId: 2 })).json();

  const response = await fetch(`${baseUrl}/payments/2`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), created);
});

test("GET /payments/:bookingId returns 404 for an unpaid booking", async () => {
  const response = await fetch(`${baseUrl}/payments/99`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    message: "Payment for booking 99 not found",
  });
});

test("unknown routes return 404", async () => {
  const response = await fetch(`${baseUrl}/unknown`);

  assert.equal(response.status, 404);
});
