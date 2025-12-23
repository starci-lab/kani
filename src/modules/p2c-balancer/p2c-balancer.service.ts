import { Injectable } from "@nestjs/common"
import { ChainId } from "@typedefs"
import { P2cBalancer } from "load-balancers"
import {
    CacheKey,
    createCacheKey,
    EjectedRpcsCacheResult,
    InjectRedisCache,
} from "@modules/cache"
import { Cache } from "cache-manager"
import {
    InjectSuperJson,
    ReadinessWatcherFactoryService,
} from "@modules/mixin"
import SuperJSON from "superjson"
import { MountStorageService, RpcAccessType } from "@modules/filesystem"
import { RpcAccessConfig } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import {
    AllRpcsEjectedException,
    NoAvailableRpcException,
} from "@exceptions"
import { envConfig } from "@modules/env"

/* =========================================================
 * Types & Enums
 * ======================================================= */

/**
 * Supported RPC transport types.
 */
export enum RpcTransport {
    Http = "http",
    Ws = "ws",
}

/**
 * Parameters for selecting an RPC.
 */
export interface BalanceParams {
    chainId: ChainId
    transport: RpcTransport
    accessType: RpcAccessType
}

/**
 * P2C balancer data holder.
 * rpcAccessConfigs is already expanded by weight.
 */
export interface P2CBalancerData {
    instance: P2cBalancer
    rpcAccessConfigs: Array<RpcAccessConfig>
}

/* =========================================================
 * Service
 * ======================================================= */

@Injectable()
export class P2CBalancerService {
    /**
     * Main registry.
     *
     * Structure:
     * balancers[chainId][accessType][transport]
     */
    private balancers: Partial<
        Record<
            ChainId,
            Partial<
                Record<
                    RpcAccessType,
                    Partial<Record<RpcTransport, P2CBalancerData>>
                >
            >
        >
    > = {}

    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly mountStorageService: MountStorageService,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    /* ---------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------- */

    /**
     * Initialize balancers after mount storage is ready.
     *
     * Steps:
     * 1. Load RPC configs
     * 2. Expand by weight
     * 3. Split by accessType + transport
     * 4. Create P2C balancers
     * 5. Restore ejected RPCs from Redis
     */
    async onModuleInit(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(
            MountStorageService.name,
        )

        for (const chainId of Object.keys(
            this.mountStorageService.rpcAccessConfigs,
        )) {
            const _chainId = chainId as ChainId
            const baseConfigs =
                this.mountStorageService.rpcAccessConfigs[_chainId]

            const expanded = this.expandByWeight(baseConfigs)

            this.balancers[_chainId] = {}

            for (const accessType of Object.values(RpcAccessType)) {
                const accessFiltered = expanded.filter(cfg =>
                    cfg.accessTypes?.includes(accessType),
                )

                if (!accessFiltered.length) continue

                const http = accessFiltered
                const ws = accessFiltered.filter(cfg => cfg.supportWs)

                if (!http.length || !ws.length) continue

                this.balancers[_chainId]![accessType] = {
                    [RpcTransport.Http]: this.createBalancer(http),
                    [RpcTransport.Ws]: this.createBalancer(ws),
                }
            }
        }
        await this.restoreEjectedRpcs()
        this.winstonLogger.info(WinstonLog.P2CBalancersInitialized)
    }

    /* ---------------------------------------------------------
     * Public API
     * ------------------------------------------------------- */

    /**
     * Pick an RPC endpoint using P2C.
     */
    balance(params: BalanceParams): string {
        const { chainId, transport, accessType } = params

        const entry =
            this.balancers[chainId]?.[accessType]?.[transport]

        if (!entry || entry.rpcAccessConfigs.length === 0) {
            throw new NoAvailableRpcException(
                chainId,
                `No available ${transport} RPC for ${accessType} on chain ${chainId}`,
            )
        }

        const index = entry.instance.pick()
        return entry.rpcAccessConfigs[index].url
    }

    /**
     * Eject one or more RPCs from all balancers of a chain.
     * Eject state is persisted in Redis.
     */
    async ejectRpcs(
        chainId: ChainId,
        rpcIds: Array<string>,
    ): Promise<void> {
        if (!rpcIds.length) return

        const ejected = await this.loadEjectedCache()

        ejected[chainId] ??= []

        for (const id of rpcIds) {
            if (!ejected[chainId].includes(id)) {
                ejected[chainId].push(id)
            }
        }

        await this.saveEjectedCache(ejected)

        for (const accessType of Object.values(RpcAccessType)) {
            for (const transport of Object.values(RpcTransport)) {
                this.rebuildBalancer(
                    chainId,
                    accessType,
                    transport,
                    ejected[chainId],
                )
            }
        }
    }

    /* ---------------------------------------------------------
     * Internal helpers
     * ------------------------------------------------------- */

    /**
     * Create a new P2C balancer.
     */
    private createBalancer(
        configs: Array<RpcAccessConfig>,
    ): P2CBalancerData {
        return {
            instance: new P2cBalancer(configs.length),
            rpcAccessConfigs: configs,
        }
    }

    /**
     * Rebuild a balancer after ejecting RPCs.
     */
    private rebuildBalancer(
        chainId: ChainId,
        accessType: RpcAccessType,
        transport: RpcTransport,
        ejectedIds: Array<string>,
    ): void {
        const entry =
            this.balancers[chainId]?.[accessType]?.[transport]

        if (!entry) return

        const rest = entry.rpcAccessConfigs.filter(
            cfg => !ejectedIds.includes(cfg.id),
        )

        if (!rest.length) {
            this.winstonLogger.error(WinstonLog.AllRpcsEjected, {
                chainId,
                accessType,
                transport,
            })
            throw new AllRpcsEjectedException(
                chainId,
                `All ${transport} RPCs ejected for ${accessType} on chain ${chainId}`,
            )
        }

        this.balancers[chainId]![accessType]![transport] =
            this.createBalancer(rest)
    }

    /**
     * Expand RPC configs by weight.
     *
     * Example:
     * [{ A, weight: 3 }, { B, weight: 1 }]
     * =>
     * [A, A, A, B]
     */
    private expandByWeight(
        configs: Array<RpcAccessConfig>,
    ): Array<RpcAccessConfig> {
        const expanded: Array<RpcAccessConfig> = []

        for (const rpc of configs) {
            const weight = Math.max(1, Math.floor(rpc.weight ?? 1))
            for (let i = 0; i < weight; i++) {
                expanded.push(rpc)
            }
        }

        return expanded
    }

    /**
     * Load eject state from Redis.
     */
    private async loadEjectedCache(): Promise<EjectedRpcsCacheResult> {
        const serialized = await this.cacheManager.get<string>(
            createCacheKey(CacheKey.EjectRpcs),
        )
        return serialized
            ? this.superjson.parse<EjectedRpcsCacheResult>(serialized)
            : {}
    }

    /**
     * Persist eject state to Redis.
     */
    private async saveEjectedCache(
        data: EjectedRpcsCacheResult,
    ): Promise<void> {
        await this.cacheManager.set(
            createCacheKey(CacheKey.EjectRpcs),
            this.superjson.stringify(data),
            envConfig().cache.ttl.ejectRpcs,
        )
    }

    /**
     * Restore ejected RPCs on startup.
     */
    private async restoreEjectedRpcs(ejected?: EjectedRpcsCacheResult): Promise<void> {
        ejected = ejected ?? await this.loadEjectedCache()
        for (const chainId of Object.keys(this.balancers)) {
            const ids = ejected[chainId as ChainId] ?? []
            if (!ids.length) continue
            for (const accessType of Object.values(RpcAccessType)) {
                for (const transport of Object.values(RpcTransport)) {
                    this.rebuildBalancer(
                        chainId as ChainId,
                        accessType,
                        transport,
                        ids,
                    )
                }
            }
        }
    }
}
