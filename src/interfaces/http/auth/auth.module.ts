import { Module } from "@nestjs/common"
import { AuthV1Controller } from "./auth-v1.controller"
import { AuthV1Service } from "./auth-v1.service"
@Module({
    controllers: [AuthV1Controller],
    providers: [AuthV1Service],
})
export class AuthModule {}