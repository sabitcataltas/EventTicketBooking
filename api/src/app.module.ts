import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Booking, Event } from "./EventManagement/Entity.ts";
import { EventManagementModule } from "./EventManagement/Module.ts";
import { SecurityModule } from "./Security/Module.ts";
import { User } from "./UserManagement/Entity.ts";
import { UserManagementModule } from "./UserManagement/Module.ts";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get("DB_HOST"),
        port: Number(config.get("DB_PORT")),
        username: config.get("DB_USER"),
        password: config.get("DB_PASSWORD"),
        database: config.get("DB_NAME"),
        entities: [Event, Booking, User],
        synchronize: true,
        timezone: "Z",
      }),
    }),
    SecurityModule,
    EventManagementModule,
    UserManagementModule,
    ...(process.env.WEB_DIST_DIR
      ? [
          ServeStaticModule.forRoot({
            rootPath: process.env.WEB_DIST_DIR,
            exclude: /^\/api(\/|$)/,
          }),
        ]
      : []),
  ],
})
export class AppModule {}
