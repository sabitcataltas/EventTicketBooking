import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
  type ValueTransformer,
} from "typeorm";

const millis: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value == null ? value : Number(value)),
};

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "varchar", length: 2000, nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 200 })
  venue!: string;

  @Column({ type: "bigint", transformer: millis })
  date!: number;

  @Column({ type: "int" })
  capacity!: number;

  @Column({ type: "int" })
  availableTickets!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}

export enum BookingStatus {
  Pending = "PENDING",
  Confirmed = "CONFIRMED",
  Cancelled = "CANCELLED",
  Expired = "EXPIRED",
}

@Entity("bookings")
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 36 })
  userId!: string;

  @Column({ type: "int" })
  eventId!: number;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "enum", enum: BookingStatus, default: BookingStatus.Pending })
  status!: BookingStatus;

  @Column({ type: "bigint", transformer: millis })
  expiresAt!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
