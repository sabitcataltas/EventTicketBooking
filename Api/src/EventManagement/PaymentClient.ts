import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PaymentClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow("PAYMENT_SERVICE_URL");
  }

  public async isPaid(bookingId: number): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/payments/${bookingId}`);
    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(
        `Payment service responded ${response.status} for booking ${bookingId}`,
      );
    }
    const { status } = await response.json();
    return status === "CONFIRMED";
  }
}
