import { Column, Entity, PrimaryColumn } from "typeorm";
import { UserRole } from "../Security/Roles.ts";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.Customer })
  role!: UserRole;
}
