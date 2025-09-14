import { Inject, Injectable, Logger } from "@nestjs/common"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./initializer.module-definition"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import { InitializedService } from "./services"

@Injectable()
export class InitializerService {
    private readonly logger = new Logger(InitializerService.name)
    private readonly tokens: Array<InitializedService> = []
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private  eventEmitter: EventEmitter2,
    ) {}

    // we add a token to the list of tokens to load
    public loadService(service: InitializedService): void {
        this.tokens.push(service)
        this.logger.log(
            `Service loaded: "${service}" | Total services: ${this.tokens.length}`,
        )
        if (this.checkAllServiceLoaded()) {
            this.eventEmitter.emit(EventName.InitializerLoaded)
        }
    }

    private checkAllServiceLoaded(): boolean {
        return this.tokens.length >= this.options.loadServices.length
    }
}