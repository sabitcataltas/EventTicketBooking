import assert from "node:assert/strict";
import { test } from "node:test";
import { MockPaymentService } from "./Service.ts";

test("createPayment confirms the booking payment", async () => {
  const service = new MockPaymentService();

  const payment = await service.createPayment({ bookingId: 1 });

  assert.equal(payment.bookingId, 1);
  assert.equal(payment.status, "CONFIRMED");
  assert.ok(!Number.isNaN(Date.parse(payment.paidAt)));
});

test("createPayment returns the existing payment for a paid booking", async () => {
  const service = new MockPaymentService();
  const first = await service.createPayment({ bookingId: 1 });

  const second = await service.createPayment({ bookingId: 1 });

  assert.deepEqual(second, first);
});

test("getPayment returns the created payment", async () => {
  const service = new MockPaymentService();
  const payment = await service.createPayment({ bookingId: 1 });

  assert.deepEqual(await service.getPayment(1), payment);
});

test("getPayment returns undefined for an unpaid booking", async () => {
  const service = new MockPaymentService();

  assert.equal(await service.getPayment(1), undefined);
});
