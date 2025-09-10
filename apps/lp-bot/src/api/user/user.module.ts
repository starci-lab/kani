import { Module } from "@nestjs/common"
import { UserV1Controller } from "./user-v1.controller"
import { UserV1Service } from "./user-v1.service"
import { UserLoaderService } from "@features/fetchers"
@Module({
    controllers: [UserV1Controller],
    providers: [UserV1Service, UserLoaderService],
})
export class UserModule {}