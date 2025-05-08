import { Module } from '@nestjs/common';
import { TemperaturesController } from './temperatures.controller';
import { TemperatureRepository } from './infra/temperature.repository';

@Module({
  controllers: [TemperaturesController],
  providers: [TemperatureRepository]
})
export class TemperaturesModule {}
