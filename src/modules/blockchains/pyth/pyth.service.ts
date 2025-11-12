import { CacheKey, CacheService, createCacheKey } from "@modules/cache"
import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { HermesClient, PriceUpdate } from "@pythnetwork/hermes-client"
import { InjectHermesClient } from "./pyth.decorators"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { Network } from "@typedefs"
import BN from "bn.js"
import { computeDenomination } from "@modules/common"
import { PythTokenNotFoundException, TokenListIsEmptyException } from "@exceptions"
import { EventEmitterService, EventName } from "@modules/event"
import { AsyncService } from "@modules/mixin"

@Injectable()
export class PythService implements OnApplicationBootstrap {
    constructor(
        @InjectHermesClient() private readonly hermesClient: HermesClient,
        private readonly cacheService: CacheService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly events: EventEmitterService,
        private readonly asyncService: AsyncService,
    ) {}

    async onApplicationBootstrap() {
        await this.subscribe()
    }

    async subscribe() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => 
                    token.network === Network.Mainnet 
                && !!token.pythFeedId
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        // we use new set to avoid duplicate feed IDs
        const feedIds = [...new Set(tokens.map(token => token.pythFeedId!))]

        const stream = await this.hermesClient.getPriceUpdatesStream(
            feedIds
        )
        // handle price updates
        stream.addEventListener("message", async (data: MessageEvent<string>) => {
            const update: PriceUpdate = JSON.parse(data.data)
            for (const data of update.parsed ?? []) {
                const token = tokens.find(token => token.pythFeedId?.includes(data.id))
                if (!token) throw new PythTokenNotFoundException(data.id, `Pyth token not found for ${data.id}`)
                const price = computeDenomination(new BN(data.ema_price.price), -data.ema_price.expo)
                // cache the price and emit the event in parallel
                await this.asyncService.allIgnoreError([
                    // cache the price
                    this.cacheService.set({
                        key: createCacheKey(CacheKey.PythTokenPrice, token.displayId, Network.Mainnet),
                        value: price.toNumber(),
                    }),
                    // emit the event
                    this.events.emit(
                        EventName.PythSuiPricesUpdated, {
                            network: Network.Mainnet,
                            tokenId: token.displayId,
                            price: price.toNumber(),
                        }, {
                            withoutLocal: true,
                        })
                ])
            }
        })
    }
}