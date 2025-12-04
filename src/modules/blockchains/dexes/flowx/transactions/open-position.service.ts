import { InvalidPoolTokensException } from "@exceptions"
import { LiquidityPoolState } from "../../../interfaces"
import { BotSchema, FlowXLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import { decimalToBips } from "@utils"
import Decimal from "decimal.js"
import BN from "bn.js"

@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async createOpenPositionTxb(
        {
            txb,
            state,
            tickLower,
            tickUpper,
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResponse> {
        txb = txb ?? new Transaction()
        const {
            packageId,
            positionRegistryObject,
            poolRegistryObject,
            versionObject
        } = state.static.metadata as FlowXLiquidityPoolMetadata
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const [
            tickLowerI32, 
            tickUpperI32
        ] = [
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickLower.gte(0) ? "from" : "neg_from"
                }`,
                arguments: [txb.pure.u32(tickLower.abs().toNumber())],
            }),
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickUpper.gte(0) ? "from" : "neg_from"
                }`,
                arguments: [txb.pure.u32(tickUpper.abs().toNumber())],
            }),
        ]
        txb.moveCall({
            target: `${
                packageId
            }::position_manager::open_position`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(positionRegistryObject),
                txb.object(poolRegistryObject),
                txb.pure.u64(decimalToBips(state.static.fee)),
                tickLowerI32,
                tickUpperI32,
                txb.object(versionObject),
            ]
        })
        return {
            txb
        }
    }
}

export interface CreateOpenPositionTxbParams { 
    txb: Transaction 
    bot: BotSchema,
    state: LiquidityPoolState,
    tickLower: Decimal,
    tickUpper: Decimal,
    liquidity: BN,
    amountAMax: BN,
    amountBMax: BN,
}

export interface CreateOpenPositionTxbResponse {
    txb: Transaction
}