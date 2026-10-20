import type { CreatePaymentRequest, Payment, PaymentService } from "./index.ts";

export class MockPaymentService implements PaymentService {
  private readonly payments = new Map<number, Payment>();

  public async createPayment({
    bookingId,
  }: CreatePaymentRequest): Promise<Payment> {
    const existing = this.payments.get(bookingId);
    if (existing) {
      return existing;
    }
    const payment: Payment = {
      bookingId,
      status: "CONFIRMED",
      paidAt: new Date().toISOString(),
    };
    this.payments.set(bookingId, payment);
    return payment;
  }

  public async getPayment(bookingId: number): Promise<Payment | undefined> {
    return this.payments.get(bookingId);
  }
}
