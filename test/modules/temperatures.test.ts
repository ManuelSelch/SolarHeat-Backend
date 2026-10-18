import { TestEnvironment } from 'test/helper/test-env';

let env: TestEnvironment;

beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
});

afterEach(async () => {
    await env.teardown();
});

function dayBounds(start: string, endExclusive: string) {
    return [new Date(start), new Date(endExclusive)];
}

describe('GET /temperatures', () => {
    it('defaults to today and preserves raw readings when date and range are omitted', async () => {
        const today = new Date();
        const readings = [{ id: 1, timestamp: today.toISOString(), solar: 27, pump: 60, security: 70, rel: 0 }];
        env.repo.find.mockResolvedValue(readings);
        const response = await env.request().get('/temperatures').expect(200);
        expect(response.body).toEqual(readings);
        const timestampFilter = env.repo.find.mock.calls[0][0].where.timestamp;
        const [start, end] = timestampFilter._value;
        expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(start)).toBe(
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(today),
        );
        expect([23, 24, 25].map((hours) => hours * 60 * 60 * 1000 - 1)).toContain(end.getTime() - start.getTime());
        expect(env.repo.find.mock.calls[0][0].order).toEqual({ timestamp: 'ASC' });
    });

    it('uses a historical day, including a valid leap day', async () => {
        await env.request().get('/temperatures').query({ range: 'day', date: '2024-02-29' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp._value).toEqual(dayBounds('2024-02-28T23:00:00Z', '2024-02-29T22:59:59.999Z'));
    });

    it('starts summer-time days at 22:00 UTC on the preceding date', async () => {
        await env.request().get('/temperatures').query({ range: 'day', date: '2026-07-15' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp._value).toEqual(dayBounds('2026-07-14T22:00:00Z', '2026-07-15T21:59:59.999Z'));
    });

    it('defaults to day when only a date is provided', async () => {
        await env.request().get('/temperatures').query({ date: '2025-12-31' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp._value).toEqual(dayBounds('2025-12-30T23:00:00Z', '2025-12-31T22:59:59.999Z'));
    });

    it('uses 23-hour and 25-hour German days at daylight-saving transitions', async () => {
        await env.request().get('/temperatures').query({ range: 'day', date: '2026-03-29' }).expect(200);
        expect(env.repo.find.mock.calls[0][0].where.timestamp._value).toEqual(dayBounds('2026-03-28T23:00:00Z', '2026-03-29T21:59:59.999Z'));

        await env.request().get('/temperatures').query({ range: 'day', date: '2026-10-25' }).expect(200);
        expect(env.repo.find.mock.calls[1][0].where.timestamp._value).toEqual(dayBounds('2026-10-24T22:00:00Z', '2026-10-25T22:59:59.999Z'));
    });

    it('returns daily averages grouped by German local dates for the month', async () => {
        const averages = [{ date: '2026-10-25', avg_solar: '25.0000', avg_pump: '50.0000', avg_security: '70.0000', avg_rel: '0.0000' }];
        env.query.getRawMany.mockResolvedValue(averages);
        const response = await env.request().get('/temperatures').query({ range: 'month', date: '2026-10-15' }).expect(200);
        expect(response.body).toEqual(averages);
        expect(env.query.select.mock.calls[0][0][0]).toContain("CASE WHEN temperature.timestamp < :berlinTransition0 THEN DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL 120 MINUTE), '%Y-%m-%d') ELSE DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL 60 MINUTE), '%Y-%m-%d') END as date");
        expect(env.query.where).toHaveBeenCalledWith('temperature.timestamp BETWEEN :start AND :end', {
            start: new Date('2026-09-30T22:00:00Z'),
            end: new Date('2026-10-31T22:59:59.999Z'),
            berlinTransition0: new Date('2026-10-25T01:00:00Z'),
        });
        expect(env.query.groupBy).toHaveBeenCalledWith('date');
        expect(env.query.orderBy).toHaveBeenCalledWith('date', 'ASC');
    });

    it('returns monthly averages grouped by German local months for the year', async () => {
        const averages = [
            { month: '2026-01', avg_solar: '10.0000', avg_pump: '50.0000', avg_security: '70.0000', avg_rel: '0.0000' },
            { month: '2026-08', avg_solar: '30.0000', avg_pump: '50.0000', avg_security: '70.0000', avg_rel: '0.0000' },
            { month: '2026-10', avg_solar: '50.0000', avg_pump: '50.0000', avg_security: '70.0000', avg_rel: '0.0000' },
        ];
        env.query.getRawMany.mockResolvedValue(averages);
        const response = await env.request().get('/temperatures').query({ range: 'year', date: '2026-08-12' }).expect(200);
        expect(response.body).toEqual(averages);
        expect(env.query.select.mock.calls[0][0][0]).toContain("CASE WHEN temperature.timestamp < :berlinTransition0 THEN DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL 60 MINUTE), '%Y-%m') WHEN temperature.timestamp < :berlinTransition1 THEN DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL 120 MINUTE), '%Y-%m') ELSE DATE_FORMAT(DATE_ADD(temperature.timestamp, INTERVAL 60 MINUTE), '%Y-%m') END as month");
        expect(env.query.where).toHaveBeenCalledWith('temperature.timestamp BETWEEN :start AND :end', {
            start: new Date('2025-12-31T23:00:00Z'),
            end: new Date('2026-12-31T22:59:59.999Z'),
            berlinTransition0: new Date('2026-03-29T01:00:00Z'),
            berlinTransition1: new Date('2026-10-25T01:00:00Z'),
        });
        expect(env.query.groupBy).toHaveBeenCalledWith('month');
        expect(env.query.orderBy).toHaveBeenCalledWith('month', 'ASC');
    });

    it.each(['month', 'year'])('still uses the current %s when date is omitted', async (range) => {
        const today = new Date();
        await env.request().get('/temperatures').query({ range }).expect(200);
        expect(env.repo.createQueryBuilder).toHaveBeenCalledTimes(1);
        const { start, end } = env.query.where.mock.calls[0][1];
        expect(start.getTime()).toBeLessThan(end.getTime());
        expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' }).format(start)).toBe(
            range === 'month'
                ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' }).format(today)
                : `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric' }).format(today)}-01`,
        );
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
