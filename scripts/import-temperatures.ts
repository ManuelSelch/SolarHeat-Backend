import 'reflect-metadata';
import { readFile, stat } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { Temperature } from '../src/modules/temperatures/temperature.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Temperature],
  synchronize: false,
});

async function main() {
  const [, , jsonPath] = process.argv;
  if (!jsonPath) {
    throw new Error(
      'Usage: tsx scripts/import-temperatures.ts <json-file>',
    );
  }

  const fileCreatedAt = (await stat(jsonPath)).mtime;
  const legacyRows: Array<Record<string, unknown>> = JSON.parse(
    await readFile(jsonPath, 'utf8'),
  );

  if (legacyRows.length === 0) return;

  // Validate IDs and fields before writing anything.
  for (const row of legacyRows) {
    for (const field of ['id', 'solar', 'pump', 'security', 'rel']) {
      if (typeof row[field] !== 'number' || !Number.isFinite(row[field])) {
        throw new Error(`Invalid ${field} in legacy row`);
      }
    }
  }

  const latestId = Math.max(...legacyRows.map((row) => row.id as number));

  await dataSource.initialize();
  try {
    const repository = dataSource.getRepository(Temperature);

    await dataSource.transaction(async (manager) => {
      const rows = legacyRows.map((row) =>
        manager.create(Temperature, {
          solar: row.solar as number,
          pump: row.pump as number,
          security: row.security as number,
          rel: row.rel as number,
          timestamp: new Date(
            fileCreatedAt.getTime() - (latestId - (row.id as number)) * 60_000,
          ),
        }),
      );

      await repository.save(rows, { chunk: 500 });
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
