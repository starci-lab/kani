import { Injectable } from "@nestjs/common"
import { ChainId } from "@typedefs"
import { P2cBalancer } from "load-balancers"
import {
    ReadinessWatcherFactoryService,
} from "@modules/mixin"
import { MountStorageService, RpcAccessType } from "@modules/filesystem"
import { RpcAccessConfig } from "@modules/filesystem"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import {
    AllRpcsEjectedException,
    NoAvailableRpcException,
} from "@exceptions"
import { 
    RpcEjection, 
    InjectPrimaryMongoose, 
    StateId,
    StateSchema,
    StateRecord,
    RpcEjectionState
} from "@modules/databases"
import { DayjsService } from "@modules/mixin"
import { Connection } from "mongoose"
import { createObjectId } from "@utils"
import { envConfig } from "@modules/env"
import { Decimal } from "decimal.js"
import { OnEvent } from "@nestjs/event-emitter"
import { EventEmitterService, EventName, ReinitializeBalancersEvent } from "@modules/event"

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
        private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
        private readonly mountStorageService: MountStorageService,
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        private readonly eventEmitterService: EventEmitterService,
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
        // wait until mount storage and primary memory storage are ready
        await this.readinessWatcherFactoryService.waitUntilReady(
            MountStorageService.name,
        )
        for (
            const chainId of Object.keys(
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
        await this.initializeBalancers()
        this.winstonLogger.info(WinstonLog.P2CBalancersInitialized)
    }

    /* ---------------------------------------------------------
     * Public API
     * ------------------------------------------------------- */

    /**
     * Pick an RPC endpoint using P2C.
     */
    balance({ 
        chainId, 
        transport, 
        accessType 
    }: BalanceParams): RpcAccessConfig {
        const entry =
            this.balancers[chainId]?.[accessType]?.[transport]

        if (!entry || entry.rpcAccessConfigs.length === 0) {
            throw new NoAvailableRpcException(
                chainId,
                `No available ${transport} RPC for ${accessType} on chain ${chainId}`,
            )
        }
        const index = entry.instance.pick()
        return entry.rpcAccessConfigs[index]
    }

    /**
     * Eject one or more RPCs from all balancers of a chain.
     * Eject state is persisted in Redis.
     */
    async ejectRpcs(
        chainId: ChainId,
        rpcIds: Array<string>,
    ): Promise<void> {
        if (!rpcIds.length) throw new Error("No RPC IDs to eject")
        await this.addEjectedRpcs(chainId, rpcIds)
        const ejectedRpcs = await this.loadRpcEjectionState()
        await this.eventEmitterService.emit<ReinitializeBalancersEvent>(
            EventName.ReinitializeBalancers, 
            {
                ejectedRpcs,
            },
            {
                withoutKafka: false,
                withoutLocal: false,
            }
        )
    }

    @OnEvent(EventName.ReinitializeBalancers)
    async handleReinitializeBalancers(
        event?: ReinitializeBalancersEvent
    ) {
        await this.initializeBalancers(event)
    }

    private async initializeBalancers(event?: ReinitializeBalancersEvent) {
        const ejectedRpcs = event?.ejectedRpcs ?? await this.loadRpcEjectionState()
        for (const chainId of Object.values(ChainId)) {
            for (const accessType of Object.values(RpcAccessType)) {
                for (const transport of Object.values(RpcTransport)) {
                    this.initializeBalancer(
                        chainId,
                        accessType,
                        transport,
                        ejectedRpcs,
                    )
                }
            }
        }
    }

    private initializeBalancer(
        chainId: ChainId,
        accessType: RpcAccessType,
        transport: RpcTransport,
        ejectedRpcs: Array<RpcEjection>,
    ) {
        const entry = this.balancers[chainId]?.[accessType]?.[transport]
        if (!entry) return
        const now = this.dayjsService.now()
        const ttl = envConfig().ejection.rpcTtl
        // filter out the ejected RPCs
        const filteredConfigs = entry.rpcAccessConfigs.filter(
            rpcAccessConfig => !ejectedRpcs.some(
                ejected => {
                    const timeDiff = now.diff(
                        this.dayjsService.from(ejected.ejectedAt),
                        "millisecond"
                    )
                    return ejected.chainId === chainId
                    && ejected.rpcId === rpcAccessConfig.id
                    && new Decimal(timeDiff).lt(ttl)

                }),
        )
        if (!filteredConfigs.length) {
            this.winstonLogger.error(
                WinstonLog.AllRpcsEjected, {
                    chainId,
                    accessType,
                    transport,
                })
            throw new AllRpcsEjectedException(
                chainId,
                `All ${transport} RPCs ejected for ${accessType} on chain ${chainId}`,
            )
        }
        this.balancers[chainId]![accessType]![transport] = this.createBalancer(filteredConfigs)
    }

    /* ---------------------------------------------------------
     * Internal helpers
     * ------------------------------------------------------- */

    /**
     * Create a new P2C balancer.
     */
    private createBalancer(
        rpcAccessConfigs: Array<RpcAccessConfig>,
    ): P2CBalancerData {
        return {
            instance: new P2cBalancer(rpcAccessConfigs.length),
            rpcAccessConfigs,
        }
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
        rpcAccessConfigs: Array<RpcAccessConfig>,
    ): Array<RpcAccessConfig> {
        const expanded: Array<RpcAccessConfig> = []

        for (const rpcAccessConfig of rpcAccessConfigs) {
            const weight = Math.max(1, Math.floor(rpcAccessConfig.weight ?? 1))
            for (let i = 0; i < weight; i++) {
                expanded.push(rpcAccessConfig)
            }
        }

        return expanded
    }

    /**
     * Load eject state from database.
     */
    private async loadRpcEjectionState(): Promise<Array<RpcEjection>> {
        const state = await this.connection.model<StateSchema>(StateSchema.name)
            .findById<StateRecord<RpcEjectionState>>(
                createObjectId(StateId.RpcEjection)
            )
        if (!state) {
            // create a new state
            await this.connection.model<StateSchema>(StateSchema.name)
                .create(
                    [
                        {
                            _id: createObjectId(StateId.RpcEjection),
                            displayId: StateId.RpcEjection,
                            value: {
                                data: [],
                            },
                        }
                    ]
                )
            return []
        }
        return state.value.data
    }   

    private async addEjectedRpcs(
        chainId: ChainId,
        rpcIds: Array<string>,
    ): Promise<void> {
        await this.connection
            .model<StateSchema>(StateSchema.name)
            .updateOne(
                { _id: createObjectId(StateId.RpcEjection) },
                {
                    $push: {
                        "value.data": {
                            $each: rpcIds.map(rpcId => ({
                                chainId,
                                rpcId,
                                ejectedAt: this.dayjsService.now().toDate(),
                            })),
                        },
                    },
                }
            )
    }

    /**
     * Remove ejected RPCs from database.
     */
    async removeEjectedRpcs(
        chainId: ChainId,
        rpcIds: Array<string>,
    ): Promise<void> {
        await this.connection
            .model<StateSchema>(StateSchema.name)
            .updateOne(
                { _id: createObjectId(StateId.RpcEjection) },
                {
                    $pull: {
                        value: {
                            data: {
                                chainId,
                                rpcId: { $in: rpcIds },
                            },
                        },
                    },
                },
            )
    }
}
