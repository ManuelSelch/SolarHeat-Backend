import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Temperature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  solar: number;

  @Column()
  pump: number;

  @Column()
  security: number;

  @Column()
  rel: number;

  @Column()
  timestamp: Date;
}