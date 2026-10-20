import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SecurityGuard } from "./Guard.ts";
import { SecurityService } from "./Service.ts";

@Module({
  providers: [SecurityService, { provide: APP_GUARD, useClass: SecurityGuard }],
})
export class SecurityModule {}
