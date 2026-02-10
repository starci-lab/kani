import {
    Module 
} from "@nestjs/common"
import {
    AppService 
} from "./app.service"
import {
    GraphModule 
} from "@modules/graph"
@Module({
    imports: [
        GraphModule.register({
            isGlobal: true,
        }),
    ],
    controllers: [],
    providers: [AppService],
})
export class AppModule {}
