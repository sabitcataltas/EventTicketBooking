import { createPaymentApp } from "./Server.ts";
import { MockPaymentService } from "./Service.ts";

const port = Number(process.env.PORT ?? 3100);

createPaymentApp(new MockPaymentService()).listen(port, () =>
  console.log(`Mock payment service listening on ${port}`),
);
