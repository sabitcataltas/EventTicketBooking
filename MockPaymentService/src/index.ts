export type PaymentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export type Payment = {
  bookingId: number;
  status: PaymentStatus;
  paidAt: string;
};

export type CreatePaymentRequest = { bookingId: number };

export type ErrorResponse = { message: string };

export interface PaymentService {
  createPayment(request: CreatePaymentRequest): Promise<Payment>;
  getPayment(bookingId: number): Promise<Payment | undefined>;
}
