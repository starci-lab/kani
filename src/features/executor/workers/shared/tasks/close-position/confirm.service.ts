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

@Injectable()
export class ClosePositionTaskConfirmService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) { }
}