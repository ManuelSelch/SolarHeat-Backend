import { Controller, Get } from '@nestjs/common';
import { TemperatureRepository } from './infra/temperature.repository';

@Controller('temperatures')
export class TemperaturesController {
    constructor(
        private temperatureRepo: TemperatureRepository
    ) {}

    @Get("/")
    async findAll(): Promise<Temperature[]> {
        return await this.temperatureRepo.findAll();
    }
}
