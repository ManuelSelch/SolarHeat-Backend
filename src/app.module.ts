import { Module } from '@nestjs/common';
import { TemperaturesModule } from './modules/temperatures/temperatures.module';

@Module({
  imports: [TemperaturesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
