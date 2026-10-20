import express, { type ErrorRequestHandler, type Response } from "express";
import type { ErrorResponse, PaymentService } from "./index.ts";

const fail = (response: Response, status: number, message: string) =>
  response.status(status).json({ message } satisfies ErrorResponse);

const isBookingId = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

const handleError: ErrorRequestHandler = (error, _request, response, next) => {
  if (error instanceof SyntaxError) {
    return fail(response, 400, "Request body must be valid JSON");
  }
  next(error);
};

export const createPaymentApp = (service: PaymentService) =>
  express()
    .use(express.json())
    .post("/payments", async (request, response) => {
      const bookingId = request.body?.bookingId;
      if (!isBookingId(bookingId)) {
        return fail(response, 400, "bookingId must be a positive integer");
      }
      response.status(201).json(await service.createPayment({ bookingId }));
    })
    .get("/payments/:bookingId", async (request, response) => {
      const bookingId = Number(request.params.bookingId);
      const payment = isBookingId(bookingId)
        ? await service.getPayment(bookingId)
        : undefined;
      if (!payment) {
        return fail(
          response,
          404,
          `Payment for booking ${request.params.bookingId} not found`,
        );
      }
      response.json(payment);
    })
    .use((_request, response) => fail(response, 404, "Not found"))
    .use(handleError);
