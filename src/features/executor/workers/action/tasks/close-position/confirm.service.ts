import {
    Injectable 
} from "@nestjs/common"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    InjectPrimaryMongoose 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import SuperJSON from "superjson"
import {
    ClosePositionActionService 
} from "@modules/blockchains"
import {
    ClosePositionTaskConfirmParams 
} from "../types"

@Injectable()
export class ClosePositionTaskConfirmService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }


    async process(
        {
            bot,
            job,
            liquidityPool,
            state,
            isRetry,
            taskIndex,
        }: ClosePositionTaskConfirmParams
    ) {
        console.log("confirm",
            bot,
            job,
            liquidityPool,
            state,
            isRetry,
            taskIndex,
        )
    }
}