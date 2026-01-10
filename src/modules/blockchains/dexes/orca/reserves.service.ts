import { Injectable } from "@nestjs/common"
import { 
    IReservesService, 
    LiquidityPoolState, 
    ReservesParams, 
    ReservesResponse 
} from "../../interfaces"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException, LiquidityPoolNotFoundException } from "@exceptions"
import { ClmmTickFormulaService } from "../../formulas"
import Decimal from "decimal.js"
import BN from "bn.js"
import { computeDenomination, Q64 } from "@utils"

@Injectable()
export class OrcaReservesService implements IReservesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    async reserves(
        {
            liquidityPoolId,
            state,
            bot,
        }: ReservesParams): Promise<ReservesResponse> {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.displayId === liquidityPoolId.toString(),
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        const _state = state as LiquidityPoolState
        const { dynamic } = _state
        const { tickCurrent } = dynamic
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            token => token.id === _state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            token => token.id === _state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const sqrtPriceX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(tickCurrent),
        })
        const sqrtPriceAX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(bot.activePosition?.tickLower ?? 0),
        })
        const sqrtPriceBX64 = this.clmmTickFormulaService.tickToSqrtPriceX64({
            tickIndex: new Decimal(bot.activePosition?.tickUpper ?? 0),
        })
        const { 
            deltaA, 
            deltaB 
        } = this.calculateLiquidityTokenDeltas(
            tickCurrent,    
            sqrtPriceX64,
            bot.activePosition?.tickLower ?? 0,
            bot.activePosition?.tickUpper ?? 0,
            sqrtPriceAX64,
            sqrtPriceBX64,
            new BN(bot.activePosition?.liquidity ?? 0),
        )
        return {
            tokenA: computeDenomination(deltaA, tokenA.decimals),
            tokenB: computeDenomination(deltaB, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }

    private calculateLiquidityTokenDeltas(
        tickCurrent: number,
        sqrtPriceX64: BN,
        tickLower: number,
        tickUpper: number,
        sqrtPriceLowerX64: BN,
        sqrtPriceUpperX64: BN,
        liquidityDelta: BN, // signed
    ): { deltaA: BN; deltaB: BN } {
        const liquidity = liquidityDelta.abs()
    
        // Case 1: below range
        if (tickCurrent < tickLower) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
                .mul(Q64)
                .div(sqrtPriceLowerX64.mul(sqrtPriceUpperX64))
            return { deltaA, deltaB: new BN(0) }
        }
    
        // Case 2: in range
        if (tickCurrent < tickUpper) {
            const deltaA = liquidity
                .mul(sqrtPriceUpperX64.sub(sqrtPriceX64))
                .mul(Q64)
                .div(sqrtPriceX64.mul(sqrtPriceUpperX64))
            const deltaB = liquidity
                .mul(sqrtPriceX64.sub(sqrtPriceLowerX64))
                .div(Q64)
    
            return { deltaA, deltaB }
        }
    
        // Case 3: above range
        const deltaB = liquidity
            .mul(sqrtPriceUpperX64.sub(sqrtPriceLowerX64))
            .div(Q64)
        return { deltaA: new BN(0), deltaB }
    }
}