import { Module } from "@nestjs/common"
import { UserModule } from "@modules/executor/users"

@Module({
    imports: [
      UserModule.register({
        isGlobal: true,
      }),
    ],
})
export class AppModule {}
