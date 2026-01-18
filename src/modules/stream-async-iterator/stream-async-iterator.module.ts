import {
    Module 
} from "@nestjs/common"
import {
    ConfigurableModuleClass 
} from "./stream-async-iterator.module-definition"
import {
    StreamAsyncIteratorService 
} from "./stream-async-iterator.service"

@Module({
    providers: [
        StreamAsyncIteratorService,
    ],
    exports: [StreamAsyncIteratorService],
})
export class StreamAsyncIteratorModule extends ConfigurableModuleClass {}
