import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column()
  venue!: string;

  @Column({ type: "datetime" })
  date!: Date;

  @Column({ type: "int" })
  capacity!: number;
}
