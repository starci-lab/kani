import { FetchedPool } from "@modules/blockchains"
import { EventName } from "@modules/event"
import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { OnEvent } from "@nestjs/event-emitter"
import { TickManagerService } from "./tick-manager.service"
import { DataLikeService, UserLoaderModule } from "@features/fetchers"

@Injectable()
export class PoolSelectorService {
    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly tickManagerService: TickManagerService,
        private readonly dataLikeService: DataLikeService,
        private readonly userLoaderModule: UserLoaderModule
    ) { }

    @OnEvent(EventName.PoolsUpdated)
    async handlePoolsUpdated(pools: Array<FetchedPool>) {
        const openPositionablePools: Array<FetchedPool> = []
        for (const pool of pools) {
            if (this.tickManagerService.canOpenPosition(pool, pool.priorityAOverB)) {
                openPositionablePools.push(pool)
            }
        }
    }
}