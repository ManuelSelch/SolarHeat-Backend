import { Repository } from "./base.repository";

export class InMemoryRepository<T extends { id: number }> implements Repository<T> {
    private items: T[] = []
  
    async findAll() {
      return this.items;
    }
  
    async findById(id: number) {
      return this.items.find(o => o.id == id)
    }

    async create(entity: Omit<T, "id">): Promise<number> {
      const lastId = this.items.length > 0 ? this.items[this.items.length-1].id : 0;
      const newId = lastId + 1;

      const newRecord: T = {
        ...(entity as any),
        id: newId
      };
      this.items.push(newRecord)
      return newId;
    }
  
    async update(entity: T) {
      const index = this.items.findIndex(o => o.id==entity.id);
      if(index==-1)return;
      this.items[index] = entity;
    }
  
    async delete(id: number) {
      this.items = this.items.filter(o => o.id != id);
    }

    async clear(): Promise<void> {
      this.items = []
    }
  }
  