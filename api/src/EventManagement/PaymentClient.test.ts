import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { ConfigService } from "@nestjs/config";
import { PaymentClient } from "./PaymentClient.ts";

let server: Server;
let client: PaymentClient;

const responses: Record<string, [number, unknown]> = {
  "/payments/1": [200, { bookingId: 1, status: "CONFIRMED", paidAt: "x" }],
  "/payments/2": [404, { message: "Payment for booking 2 not found" }],
  "/payments/3": [500, { message: "Boom" }],
};

before(async () => {
  server = createServer((request, response) => {
    const [status, body] = responses[request.url ?? ""] ?? [404, {}];
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  client = new PaymentClient(
    new ConfigService({ PAYMENT_SERVICE_URL: `http://127.0.0.1:${port}` }),
  );
});

after(() => {
  server.close();
});

test("isPaid returns true for a confirmed payment", async () => {
  assert.equal(await client.isPaid(1), true);
});

test("isPaid returns false when the booking has no payment", async () => {
  assert.equal(await client.isPaid(2), false);
});

test("isPaid throws when the payment service fails", async () => {
  await assert.rejects(client.isPaid(3));
});
