import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Temperature } from '../temperature.entity';
import { CreateTemperatureDto } from '../api/create-temperature.dto';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

@Injectable()
export class TemperaturesService {
  constructor(
    @InjectRepository(Temperature)
    private repo: Repository<Temperature>,
  ) {}

  async findFiltered(range: 'day' | 'month' | 'year'): Promise<Temperature[]> {
    const now = new Date();

    if(range === 'day') {
        return this.repo.find({
            where: { timestamp: Between(startOfDay(now), endOfDay(now)) },
            order: { timestamp: 'ASC' }
        })
    }

    const query = this.repo.createQueryBuilder('temperature');

    if(range === 'month') {
        // Group by day and return average
        return query
            .select([
                "DATE_FORMAT(temperature.timestamp, '%Y-%m-%d') as date",
                'AVG(temperature.solar) as avg_solar',
                'AVG(temperature.pump) as avg_pump',
                'AVG(temperature.security) as avg_security',
                'AVG(temperature.rel) as avg_rel',
            ])
            .where('temperature.timestamp BETWEEN :start AND :end', {
                start: startOfMonth(now),
                end: endOfMonth(now),
            })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany()
    }

    if (range === 'year') {
        // Group by month and return average
        return query
        .select([
            "DATE_FORMAT(temperature.timestamp, '%Y-%m') as month",
            'AVG(temperature.solar) as avg_solar',
            'AVG(temperature.pump) as avg_pump',
            'AVG(temperature.security) as avg_security',
            'AVG(temperature.rel) as avg_rel',
        ])
        .where('temperature.timestamp BETWEEN :start AND :end', {
            start: startOfYear(now),
            end: endOfYear(now),
        })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();
    }

    throw new BadRequestException("invalid range: " + range)
  }

  findOne(id: number): Promise<Temperature | null> {
    return this.repo.findOneBy({ id });
  }

  create(createDto: CreateTemperatureDto): Promise<Temperature> {
    const temperature = this.repo.create({
        solar: createDto.solar,
        pump: createDto.pump,
        security: createDto.security,
        rel: createDto.rel,
        timestamp: new Date()
    });

    return this.repo.save(temperature);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
