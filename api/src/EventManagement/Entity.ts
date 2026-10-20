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

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
