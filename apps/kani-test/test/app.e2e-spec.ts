import {
    Test, TestingModule 
} from "@nestjs/testing"
import {
    INestApplication 
} from "@nestjs/common"
import * as request from "supertest"
import {
    KaniTestModule 
} from "../src/app.module"

describe("KaniTestController (e2e)",
    () => {
        let app: INestApplication

        beforeEach(async () => {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [KaniTestModule],
            }).compile()

            app = moduleFixture.createNestApplication()
            await app.init()
        })

        it("/ (GET)",
            () => {
                return request(app.getHttpServer())
                    .get("/")
                    .expect(200)
                    .expect("Hello World!")
            })
    })
