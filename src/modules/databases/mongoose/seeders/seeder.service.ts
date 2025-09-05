
import { Injectable, OnModuleInit } from "@nestjs/common"
import { seeder } from "nestjs-seeder"
import { TokenSeeder } from "./data"
import { MongooseModule } from "../../mongoose"

@Injectable()
export class SeedersService implements OnModuleInit {
    constructor() {}

    onModuleInit() {
        seeder({
            imports: [MongooseModule.forRoot()],
        }).run([
            TokenSeeder,
        ])
    }
}
