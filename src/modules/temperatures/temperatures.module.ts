import { Module } from '@nestjs/common';
import { TemperaturesController } from './temperatures.controller';

@Module({
  controllers: [TemperaturesController]
})
export class TemperaturesModule {}
