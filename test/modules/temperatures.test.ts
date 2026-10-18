import { TestEnvironment } from 'test/helper/test-env';

let env: TestEnvironment;

beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
});

afterEach(async () => {
    await env.teardown();
});

function dayBounds(year: number, month: number, day: number) {
    return [new Date(year, month - 1, day), new Date(year, month - 1, day, 23, 59, 59, 999)];
}

describe('GET /temperatures', () => {
    it('defaults to today and preserves raw readings when date and range are omitted', async () => {
        const today = new Date();
        const readings = [{ id: 1, timestamp: today.toISOString(), solar: 27, pump: 60, security: 70, rel: 0 }];
        env.repo.find.mockResolvedValue(readings);
        const response = await env.request().get('/temperatures').expect(200);
        expect(response.body).toEqual(readings);
        expect(env.repo.find.mock.calls[0][0].where.timestamp.value).toEqual(dayBounds(today.getFullYear(), today.getMonth() + 1, today.getDate()));
        expect(env.repo.find.mock.calls[0][0].order).toEqual({ timestamp: 'ASC' });
    });

    it('uses a historical day, including a valid leap day', async () => {
        await env.request().get('/temperatures').query({ range: 'day', date: '2024-02-29' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp.value).toEqual(dayBounds(2024, 2, 29));
    });

    it('defaults to day when only a date is provided', async () => {
        await env.request().get('/temperatures').query({ date: '2025-12-31' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp.value).toEqual(dayBounds(2025, 12, 31));
    });

    it('keeps calendar-day boundaries across daylight saving changes', async () => {
        await env.request().get('/temperatures').query({ range: 'day', date: '2026-03-29' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp.value).toEqual(dayBounds(2026, 3, 29));
    });

    it('returns daily averages for the month containing the date', async () => {
        const averages = [{ date: '2023-12-01', avg_solar: '20.5000', avg_pump: '55.0000', avg_security: '70.0000', avg_rel: '0.0000' }];
        env.query.getRawMany.mockResolvedValue(averages);
        const response = await env.request().get('/temperatures').query({ range: 'month', date: '2023-12-15' }).expect(200);
        expect(response.body).toEqual(averages);
        expect(env.query.where).toHaveBeenCalledWith('temperature.timestamp BETWEEN :start AND :end', {
            start: new Date(2023, 11, 1), end: new Date(2023, 11, 31, 23, 59, 59, 999),
        });
        expect(env.query.groupBy).toHaveBeenCalledWith('date');
        expect(env.query.orderBy).toHaveBeenCalledWith('date', 'ASC');
    });

    it('returns monthly averages for the year containing the date', async () => {
        const averages = [{ month: '2022-08', avg_solar: '20.5000', avg_pump: '55.0000', avg_security: '70.0000', avg_rel: '0.0000' }];
        env.query.getRawMany.mockResolvedValue(averages);
        const response = await env.request().get('/temperatures').query({ range: 'year', date: '2022-08-12' }).expect(200);
        expect(response.body).toEqual(averages);
        expect(env.query.where).toHaveBeenCalledWith('temperature.timestamp BETWEEN :start AND :end', {
            start: new Date(2022, 0, 1), end: new Date(2022, 11, 31, 23, 59, 59, 999),
        });
        expect(env.query.groupBy).toHaveBeenCalledWith('month');
        expect(env.query.orderBy).toHaveBeenCalledWith('month', 'ASC');
    });

    it.each(['month', 'year'])('still uses the current %s when date is omitted', async (range) => {
        const today = new Date();
        await env.request().get('/temperatures').query({ range }).expect(200);
        const { start, end } = env.query.where.mock.calls[0][1];
        expect(start.getFullYear()).toBe(today.getFullYear());
        expect(end.getFullYear()).toBe(today.getFullYear());
        expect(start.getMonth()).toBe(range === 'month' ? today.getMonth() : 0);
        expect(end.getMonth()).toBe(range === 'month' ? today.getMonth() : 11);
    });

    it('returns an empty array for a valid period with no readings', async () => {
        const response = await env.request().get('/temperatures').query({ range: 'year', date: '2020-01-01' }).expect(200);
        expect(response.body).toEqual([]);
    });

    it.each(['', 'invalid', '2026-2-01', '2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '2026-01-00', '2026-10-18T00:00:00Z', '0999-01-01'])('rejects invalid date %j before querying the repository', async (date) => {
        await env.request().get('/temperatures').query({ date }).expect(400);
        expect(env.repo.find).not.toHaveBeenCalled();
        expect(env.repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rejects repeated date query parameters', async () => {
        await env.request().get('/temperatures?date=2026-10-17&date=2026-10-18').expect(400);
        expect(env.repo.find).not.toHaveBeenCalled();
    });

    it('still rejects an unsupported range', async () => {
        await env.request().get('/temperatures').query({ range: 'week', date: '2026-10-17' }).expect(400);
    });
});
