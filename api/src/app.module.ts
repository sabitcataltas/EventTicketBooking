import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Event } from "./EventManagement/Entity.ts";
import { EventManagementModule } from "./EventManagement/Module.ts";
import { User } from "./UserManagement/Entity.ts";
import { UserManagementModule } from "./UserManagement/Module.ts";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "mysql",
        host: config.get("DB_HOST"),
        port: Number(config.get("DB_PORT")),
        username: config.get("DB_USER"),
        password: config.get("DB_PASSWORD"),
        database: config.get("DB_NAME"),
        entities: [Event, User],
        synchronize: true,
        timezone: "Z",
      }),
    }),
    EventManagementModule,
    UserManagementModule,
  ],
})
export class AppModule {}
