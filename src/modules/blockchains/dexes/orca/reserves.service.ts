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
import { computeDenomination } from "@utils"
import { tryGetAmountDeltaB, tryGetAmountDeltaA } from "@orca-so/whirlpools-core"

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
            liquidityPool => liquidityPool.id === liquidityPoolId.toString(),
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
        const amountA = tryGetAmountDeltaA(
            BigInt(sqrtPriceX64.toString()),
            BigInt(sqrtPriceAX64.toString()),
            BigInt(bot.activePosition?.liquidity ?? 0),
            false,
        )
        const amountB = tryGetAmountDeltaB(
            BigInt(sqrtPriceX64.toString()),
            BigInt(sqrtPriceBX64.toString()),
            BigInt(bot.activePosition?.liquidity ?? 0),
            false,
        )
        console.log("amountA", amountA)
        console.log("amountB", amountB)
        return {
            tokenA: computeDenomination(new BN(amountA), tokenA.decimals),
            tokenB: computeDenomination(new BN(amountB), tokenB.decimals),
        }
    }
}