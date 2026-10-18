import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Temperature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  solar: number;

  @Column('int')
  pump: number;

  @Column('int')
  security: number;

  @Column('int')
  rel: number;

  @Column('datetime')
  timestamp: Date;
}
