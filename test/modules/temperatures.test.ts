import { TestEnvironment } from "test/helper/test-env";

let env: TestEnvironment;

beforeAll(async () => {
    env = new TestEnvironment();
    await env.setup();
})

afterEach(() => {
    env.teardown();
})

describe("GET temperatures", () => {
    it("returns all recorded values", async () => {
        await env.request()
            .get("/temperatures")
            .expect(200)
    })
})