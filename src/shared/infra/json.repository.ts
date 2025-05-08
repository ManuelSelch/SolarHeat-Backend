import * as fs from 'fs/promises';
import { Repository } from './base.repository';

export class JsonRepository<T extends { id: number }> implements Repository<T> {
  constructor(
    private filePath: string,
  ) {}

  private async read(): Promise<T[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async write(data: T[]) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async findAll() {
    const records = await this.read();
    return records;
  }

  async findById(id: number) {
    const data = await this.read();
    return data.find(o => o.id == id);
  }

  async create(entity: Omit<T, "id">) {
    const records = await this.findAll();
    const lastId = records.length > 0 ? records[records.length - 1].id : 0;
    const newId = lastId+1;

    const newRecord: T = {
      ...(entity as any),
      id: newId
    };

    const data = await this.read();
    data.push(newRecord)
    await this.write(data);
    return newId;
  }

  async update(entity: T) {
    const records = await this.read();

    const index = records.findIndex(o => o.id==entity.id);
    if(index==-1) return;
    records[index] = entity;
    
    await this.write(records);
  }

  async delete(id: number) {
    const records = (await this.read()).filter(o => o.id != id);
    await this.write(records);
  }
}
