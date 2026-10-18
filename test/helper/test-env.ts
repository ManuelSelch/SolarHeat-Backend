import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemperaturesController } from 'src/modules/temperatures/temperatures.controller';
import { TemperaturesService } from 'src/modules/temperatures/infra/temperatures.service';
import { Temperature } from 'src/modules/temperatures/temperature.entity';

export class TestEnvironment {
    readonly query = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
    };
    readonly repo = {
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn(() => this.query),
    };
    private app: INestApplication;

    async setup() {
        // Exercise the real controller and service without connecting to MySQL
        // or touching machine/status files.
        const module = await Test.createTestingModule({
            controllers: [TemperaturesController],
            providers: [
                TemperaturesService,
                { provide: getRepositoryToken(Temperature), useValue: this.repo },
            ],
        }).compile();
        this.app = module.createNestApplication();
        await this.app.init();
    }

    request() {
        return request(this.app.getHttpServer());
    }

    async teardown() {
        await this.app.close();
    }
}
