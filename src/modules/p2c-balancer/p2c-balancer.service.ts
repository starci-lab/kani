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
                    P2CBalancerData
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
        // re-arrange the rpc access configs by weight
        const chainIds = Object.keys(this.mountStorageService.rpcAccessConfigs) as Array<ChainId>
        for (
            const chainId of chainIds) {
            const baseConfigs =
                this.mountStorageService.rpcAccessConfigs[chainId]

            const expanded = this.expandByWeight(baseConfigs)
            this.balancers[chainId] = {}
            for (const accessType of Object.values(RpcAccessType)) {
                this.balancers[chainId]![accessType] = this.createBalancer(
                    expanded.filter(
                        cfg => cfg.accessType === accessType
                    )
                )
            }
        }
        // initialize the balancers
        // 1. Load eject state from database
        // 2. Initialize balancers for each chain, access type, and transport
        await this.initializeBalancers()
        // log the initialization
        this.winstonLogger.debug(WinstonLog.P2CBalancersInitialized)
    }

    /* ---------------------------------------------------------
     * Public API
     * ------------------------------------------------------- */

    /**
     * Pick an RPC endpoint using P2C.
     */
    balance(
        { 
            chainId, 
            accessType 
        }: BalanceParams): RpcAccessConfig {
        const entry =
            this.balancers[chainId]?.[accessType]
        if (!entry || entry.rpcAccessConfigs.length === 0) {
            this.winstonLogger.error(
                WinstonLog.NoAvailableRpc, {
                    chainId,
                    accessType,
                }
            )
            // exit the application
            process.exit(1)
        }
        const index = entry.instance.pick()
        return entry.rpcAccessConfigs[index]
    }

    /**
     * Eject one or more RPCs from all balancers of a chain.
     * Eject state is persisted in Redis.
     */
    async ejectRpcs(
        rpcIds: Array<string>,
    ): Promise<void> {
        if (!rpcIds.length) throw new Error("No RPC IDs to eject")
        await this.addEjectedRpcs(rpcIds)
        const ejectedRpcs = await this.loadRpcEjectionState()
        await this.eventEmitterService.emit<ReinitializeBalancersEvent>(
            EventName.ReinitializeBalancers, 
            {
                ejectedRpcs,
            },
            {
                // emit the event to the kafka and local event emitter
                withoutKafka: false,
                // emit the event to the local event emitter
                withoutLocal: false,
            }
        )
    }
    
    // handle the reinitialize balancers event
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
                this.initializeBalancer(
                    chainId,
                    accessType,
                    ejectedRpcs,
                )
            }
        }
    }

    private initializeBalancer(
        chainId: ChainId,
        accessType: RpcAccessType,
        ejectedRpcs: Array<RpcEjection>,
    ) {
        const entry = this.balancers[chainId]?.[accessType]
        if (!entry) return
        const { rpcAccessConfigs } = entry
        const now = this.dayjsService.now()
        const ttl = envConfig().ejection.rpcTtl
        // filter out the ejected RPCs
        const filteredConfigs = rpcAccessConfigs.filter(
            rpcAccessConfig => !ejectedRpcs.some(
                ejected => {
                    // take the time difference between the current time and the ejected time
                    const timeDiff = now.diff(
                        this.dayjsService.from(ejected.ejectedAt),
                        "millisecond"
                    )
                    // check if the ejected RPC is for the same chain and has not expired
                    return ejected.rpcId === rpcAccessConfig.id
                    // check if the time difference is less than the ttl
                    && new Decimal(timeDiff).lt(ttl)
                }
            ),
        )
        this.balancers[chainId]![accessType] = this.createBalancer(filteredConfigs)
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
            return []
        }
        return state.value.data
    }   

    private async addEjectedRpcs(
        rpcIds: Array<string>,
    ): Promise<void> {
        await this.connection
            .model<StateSchema>(StateSchema.name)
            .updateOne(
                { _id: createObjectId(StateId.RpcEjection) },
                [
                    {
                        $set: {
                            "value.data": {
                                $let: {
                                    vars: {
                                        existing: { $ifNull: ["$value.data", []] },
                                        incoming: rpcIds.map(
                                            rpcId => (
                                                {
                                                    rpcId,
                                                    ejectedAt: this.dayjsService.now().toDate(),
                                                }
                                            )
                                        ),
                                    },
                                    in: {
                                        $concatArrays: [
                                            "$$existing",
                                            {
                                                $filter: {
                                                    input: "$$incoming",
                                                    as: "new",
                                                    cond: {
                                                        $not: {
                                                            $anyElementTrue: {
                                                                $map: {
                                                                    input: "$$existing",
                                                                    as: "old",
                                                                    in: {
                                                                        $and: [
                                                                            { $eq: ["$$old.rpcId", "$$new.rpcId"] },
                                                                        ],
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    },
                ],
                {
                    upsert: true,
                }
            )
    }

    /**
     * Remove ejected RPCs from database.
     */
    async removeEjectedRpcs(
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
                                rpcId: { $in: rpcIds },
                            },
                        },
                    },
                },
            )
    }
}
