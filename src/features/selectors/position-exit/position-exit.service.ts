import { 
    TickManagerService
} from "@modules/blockchains"
import { 
    EventName, 
} from "@modules/event"
import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { OnEvent } from "@nestjs/event-emitter"
import { 
    DataLikeQueryService, 
    PositionRecordManagerService, 
    UserLoaderService
} from "@features/fetchers"
import { Logger as WinstonLogger } from "winston"
import { InjectWinston } from "@modules/winston"
import { 
    InjectSuperJson, 
    AsyncService, 
    DayjsService,
    LockService
} from "@modules/mixin"
import SuperJSON from "superjson"
import { CacheHelpersService, CacheKey, createCacheKey } from "@modules/cache"
import { Cache } from "cache-manager"
import { UserLike } from "@modules/databases"

// a service to exit position
// we use fomular to exit position
@Injectable()
export class PositionExitService implements OnModuleInit {
    private readonly logger = new Logger(PositionExitService.name)
    private cacheManager: Cache
    constructor(
        private readonly tickManagerService: TickManagerService,
        private readonly dataLikeQueryService: DataLikeQueryService,
        private readonly userLoaderService: UserLoaderService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        private readonly asyncService: AsyncService,
        private readonly positionRecordManagerService: PositionRecordManagerService,
        private readonly lockService: LockService,
        private readonly cacheHelpersService: CacheHelpersService,  
    ) { }

    async onModuleInit() {
        this.cacheManager = this.cacheHelpersService.getCacheManager({
            autoSelect: true,
        })
    }

    @OnEvent(EventName.PricesUpdated)
    async handlePricesUpdated() 
    {      
        const serializedUserIds = await this.cacheManager.get<string>(createCacheKey(CacheKey.UserIds))
        if (!serializedUserIds) {
            this.logger.debug("No user ids found")
            return
        }
        const userIds = this.superjson.parse<Array<string>>(serializedUserIds)
        if (!userIds) {
            return
        }
        console.log(userIds)
        const serializedUsers = await this.cacheManager.mget<string>(userIds.map(userId => createCacheKey(CacheKey.User, userId)))
        if (!serializedUsers) {
            return
        }
        console.log(serializedUsers)
        // filter out undefined users
        const users = serializedUsers
            .filter(serializedUser => serializedUser !== undefined)
            .map(serializedUser => this.superjson.parse<UserLike>(serializedUser))

        for (const user of users) {
            // exit position for each user
            const activePositions = user.activePositions
            console.log(activePositions.length)
        }
    }
}