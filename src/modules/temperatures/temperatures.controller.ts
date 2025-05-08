import { Body, Controller, Get, Post } from '@nestjs/common';
import { TemperatureRepository } from './infra/temperature.repository';
import { CreateTemperatureDto } from './api/create-temperature.dto';
import * as fs from 'fs/promises';

async function readStatus(): Promise<Status> {
    const raw = await fs.readFile("./data/status.json", 'utf8');
    return JSON.parse(raw);
}

async function  writeStatus(data: Status) {
    await fs.writeFile("./data/status.json", JSON.stringify(data, null, 2));
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

        const status = await readStatus();

        return {
            dif: status.dif,
            timestamp: this.getTimestamp()
        }
    }

    @Get("/status")
    async getStatus() {
        return await readStatus();
    }

    @Post("/dif")
    async setDif(@Body() data: {dif: number}) {
        let status = await readStatus();
        status.dif = data.dif;
        await writeStatus(status);
    }

    private getTimestamp() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const timestamp = `${hours}:${minutes}`;
        return timestamp;
    }
}
