import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TZDate, tzOffset, tzScan } from '@date-fns/tz';
import { Between, Repository } from 'typeorm';
import { Temperature } from '../temperature.entity';
import { CreateTemperatureDto } from '../api/create-temperature.dto';

const CALENDAR_TIME_ZONE = 'Europe/Berlin';
type CalendarDate = { year: number; month: number; day: number };
type DailyAverage = { date: string; avg_solar: string; avg_pump: string; avg_security: string; avg_rel: string };
type MonthlyAverage = { month: string; avg_solar: string; avg_pump: string; avg_security: string; avg_rel: string };
export type TemperatureHistoryResponse = Temperature | DailyAverage | MonthlyAverage;

@Injectable()
export class TemperaturesService {
  constructor(
    @InjectRepository(Temperature)
    private repo: Repository<Temperature>,
  ) {}

  async findFiltered(range: 'day' | 'month' | 'year', date?: string): Promise<TemperatureHistoryResponse[]> {
    if (!['day', 'month', 'year'].includes(range)) {
      throw new BadRequestException('invalid range: ' + range);
    }
    const referenceDate = this.parseReferenceDate(date);
    const { start, end } = this.periodBounds(range, referenceDate);
    const endInclusive = new Date(end.getTime() - 1);
    if (range === 'day') {
      return this.repo.find({
        where: { timestamp: Between(start, endInclusive) },
        order: { timestamp: 'ASC' },
      });
    }

    const groupKey = range === 'month' ? 'date' : 'month';
    const format = range === 'month' ? '%Y-%m-%d' : '%Y-%m';
    const { expression, parameters } = this.localCalendarExpression(start, end, format);
    return this.repo.createQueryBuilder('temperature')
      .select([
        `${expression} as ${groupKey}`,
        'AVG(temperature.solar) as avg_solar',
        'AVG(temperature.pump) as avg_pump',
        'AVG(temperature.security) as avg_security',
        'AVG(temperature.rel) as avg_rel',
      ])
      .where('temperature.timestamp BETWEEN :start AND :end', {
        start, end: endInclusive, ...parameters,
      })
      .groupBy(groupKey)
      .orderBy(groupKey, 'ASC')
      .getRawMany();
  }

  private parseReferenceDate(date?: string): CalendarDate {
    const selected = date ?? this.currentBerlinDate();
    const message = 'date must be a valid YYYY-MM-DD calendar date (years 1000-9999)';
    if (typeof selected !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(selected)) {
      throw new BadRequestException(message);
    }
    const [year, month, day] = selected.split('-').map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
      throw new BadRequestException(message);
    }
    return { year, month, day };
  }

  private currentBerlinDate(): string {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: CALENDAR_TIME_ZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${value.year}-${value.month}-${value.day}`;
  }

  private periodBounds(range: 'day' | 'month' | 'year', reference: CalendarDate): { start: Date; end: Date } {
    const startDate: CalendarDate = range === 'year'
      ? { year: reference.year, month: 1, day: 1 }
      : range === 'month'
        ? { year: reference.year, month: reference.month, day: 1 }
        : reference;
    const nextDate = new Date(Date.UTC(startDate.year, startDate.month - 1, startDate.day));
    if (range === 'year') nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
    else if (range === 'month') nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    else nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    return {
      start: this.berlinMidnight(startDate),
      end: this.berlinMidnight({
        year: nextDate.getUTCFullYear(),
        month: nextDate.getUTCMonth() + 1,
        day: nextDate.getUTCDate(),
      }),
    };
  }

  private berlinMidnight(date: CalendarDate): Date {
    return new Date(new TZDate(date.year, date.month - 1, date.day, 0, CALENDAR_TIME_ZONE).getTime());
  }

  private localCalendarExpression(start: Date, end: Date, format: string): { expression: string; parameters: Record<string, Date> } {
    let offset = tzOffset(CALENDAR_TIME_ZONE, start);
    const parameters: Record<string, Date> = {};
    const clauses = tzScan(CALENDAR_TIME_ZONE, { start, end })
      .filter(({ date }) => date > start && date < end)
      .map(({ date, offset: nextOffset }, index) => {
        const parameter = `berlinTransition${index}`;
        parameters[parameter] = date;
        const clause = `WHEN temperature.timestamp < :${parameter} THEN DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL ${offset} MINUTE), '${format}')`;
        offset = nextOffset;
        return clause;
      });
    const fallback = `DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL ${offset} MINUTE), '${format}')`;
    return {
      expression: clauses.length ? `CASE ${clauses.join(' ')} ELSE ${fallback} END` : fallback,
      parameters,
    };
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
