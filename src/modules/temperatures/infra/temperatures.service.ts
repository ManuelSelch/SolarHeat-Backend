import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Temperature } from '../temperature.entity';
import { CreateTemperatureDto } from '../api/create-temperature.dto';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, parse, isValid, format } from 'date-fns';

@Injectable()
export class TemperaturesService {
  constructor(
    @InjectRepository(Temperature)
    private repo: Repository<Temperature>,
  ) {}

  async findFiltered(range: 'day' | 'month' | 'year', date?: string): Promise<Temperature[]> {
    const referenceDate = this.parseReferenceDate(date);

    if(range === 'day') {
        return this.repo.find({
            where: { timestamp: Between(startOfDay(referenceDate), endOfDay(referenceDate)) },
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
                start: startOfMonth(referenceDate),
                end: endOfMonth(referenceDate),
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
            start: startOfYear(referenceDate),
            end: endOfYear(referenceDate),
        })
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany();
    }

    throw new BadRequestException("invalid range: " + range)
  }

  private parseReferenceDate(date?: string): Date {
    if (date === undefined) return new Date();
    const message = 'date must be a valid YYYY-MM-DD calendar date (years 1000-9999)';
    if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(message);
    }
    // Parse in the server's local timezone, matching the existing period bounds.
    // new Date('YYYY-MM-DD') would parse as UTC and can select the previous day.
    const referenceDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(referenceDate) || format(referenceDate, 'yyyy-MM-dd') !== date) {
      throw new BadRequestException(message);
    }
    return referenceDate;
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
