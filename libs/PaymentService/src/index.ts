export interface PaymentService {
  isPaid(bookingId: number): boolean;
}
