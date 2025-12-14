import { Module } from "@nestjs/common"
import { CommandsModule } from "@modules/commands"
@Module({
    imports: [
        CommandsModule.register({
            isGlobal: true,
        }),
    ],
})
export class AppModule {}
