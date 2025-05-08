import { Injectable } from "@nestjs/common";
import { JsonRepository } from "src/shared/infra/json.repository";

@Injectable()
export class TemperatureRepository extends JsonRepository<Temperature> {
    constructor() {
        super("./data/temperatures.json")
    }
}