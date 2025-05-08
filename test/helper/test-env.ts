import * as request from 'supertest';
import { INestApplication } from "@nestjs/common"
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { InMemoryRepository } from 'src/shared/infra/in-memory.repository';

export class TestEnvironment {
    async setup() {
        const module = await Test.createTestingModule({
            imports: [AppModule] 
        })
        // .overrideProvider(FormsRepository).useValue(this.formsRepo)
       
        .compile();
    
        this.app = module.createNestApplication();
        await this.app.init();
    }

    request() {
        return request(this.app.getHttpServer())
    }

    teardown() {
        // this.formsRepo.clear();
    }

    private app: INestApplication;
    // private formsRepo = new InMemoryRepository<Form>();
}