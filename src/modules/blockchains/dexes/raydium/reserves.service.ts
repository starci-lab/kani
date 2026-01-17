import { Injectable } from "@nestjs/common"
import { 
    IReservesService, 
    LiquidityPoolState, 
    ReservesParams, 
    ReservesResult 
} from "../../interfaces"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException, LiquidityPoolNotFoundException } from "@exceptions"
import { ClmmTickFormulaService } from "../../formulas"
import Decimal from "decimal.js"
import { LiquidityMath } from "@raydium-io/raydium-sdk-v2"
import BN from "bn.js"
import { computeDenomination } from "@utils"

@Injectable()
export class RaydiumReservesService implements IReservesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clmmTickFormulaService: ClmmTickFormulaService,
    ) {}

    async reserves(
        {
            liquidityPoolId,
            state,
            bot,
        }: ReservesParams): Promise<ReservesResult> {
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
            amountA, 
            amountB 
        } = LiquidityMath.getAmountsFromLiquidity(
            sqrtPriceX64, 
            sqrtPriceAX64, 
            sqrtPriceBX64, 
            new BN(bot.activePosition?.liquidity ?? 0), 
            false
        )
        return {
            tokenA: computeDenomination(amountA, tokenA.decimals),
            tokenB: computeDenomination(amountB, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}