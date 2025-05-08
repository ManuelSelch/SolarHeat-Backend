import { Module } from '@nestjs/common';
import { TemperaturesModule } from './modules/temperatures/temperatures.module';
import '@mantine/charts/styles.css';

@Module({
  imports: [TemperaturesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
