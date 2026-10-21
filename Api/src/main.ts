import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.ts";
import { setupSwagger } from "./swagger.ts";

const app = await NestFactory.create(AppModule, {
  cors: true,
});
app.setGlobalPrefix("api");
setupSwagger(app);
await app.listen(process.env.PORT ?? 3000);
