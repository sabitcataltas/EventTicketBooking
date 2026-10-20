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
  to: (value?: number) => (value == null ? value : new Date(value)),
  from: (value?: Date) => (value == null ? value : value.getTime()),
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

  @Column({ type: "datetime", transformer: millis })
  date!: number;

  @Column({ type: "int" })
  capacity!: number;

  @CreateDateColumn({ transformer: millis })
  createdAt!: number;

  @UpdateDateColumn({ transformer: millis })
  updatedAt!: number;

  @VersionColumn()
  version!: number;
}
