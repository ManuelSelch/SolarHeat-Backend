import { Module } from '@nestjs/common';
import { TemperaturesController } from './temperatures.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Temperature } from './temperature.entity';
import { TemperaturesService } from './infra/temperatures.service';

@Module({
  imports: [TypeOrmModule.forFeature([Temperature])],
  controllers: [TemperaturesController],
  providers: [TemperaturesService]
})
export class TemperaturesModule {}
