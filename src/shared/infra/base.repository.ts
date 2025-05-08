export interface Repository<T> {
    findAll(): Promise<T[]>;
    findById(id: number): Promise<T | undefined>;
    create(entity: Omit<T, "id">): Promise<number>;
    update(entity: T): Promise<void>;
    delete(id: number): Promise<void>;
}