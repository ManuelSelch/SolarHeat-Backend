import { Body, Controller, Get, Post } from '@nestjs/common';
import { TemperatureRepository } from './infra/temperature.repository';
import { CreateTemperatureDto } from './api/create-temperature.dto';
import * as fs from 'fs/promises';

async function readStatus(): Promise<Status> {
    const raw = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(raw);
}

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
    async create(@Body() createTemperature: CreateTemperatureDto) {
        await this.temperatureRepo.create(createTemperature);

        return {
            dif: 0,
            timestamp: this.getTimestamp()
        }
    }

    private getTimestamp() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const timestamp = `${hours}:${minutes}`;
        return timestamp;
    }
}
