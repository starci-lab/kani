import { PriceModule } from "@modules/blockchains"
import { Module } from "@nestjs/common"
import { AppService } from "./app.service"

@Module({
    imports: [
        PriceModule.register({
            isGlobal: true,
            useSelfImports: true
        })
    ],
    providers: [AppService],
})
export class AppModule {}
