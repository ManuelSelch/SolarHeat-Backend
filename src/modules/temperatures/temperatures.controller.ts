import { Body, Controller, Get, Post } from '@nestjs/common';
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

    @Post("/")
    async create(@Body() createTemperature: Temperature) {
        await this.temperatureRepo.create(createTemperature);

        return {
            diff: 0,
            timestamp: "00:00"
        }
    }
}
