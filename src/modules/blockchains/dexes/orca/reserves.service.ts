import { Injectable } from "@nestjs/common"
import { 
    IReservesService, 
    ClmmLiquidityPoolState, 
    ReservesParams, 
    ReservesResult 
} from "../../interfaces"
import { PrimaryMemoryStorageService } from "@modules/databases"
import { InvalidPoolTokensException, LiquidityPoolNotFoundException } from "@exceptions"
import { ClmmReservesFormulaService } from "../../formulas"
import Decimal from "decimal.js"
import BN from "bn.js"
import { Q64 } from "@utils"
import { DayjsService } from "@modules/mixin"

@Injectable()
export class OrcaReservesService implements IReservesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
        private readonly dayjsService: DayjsService
    ) {}

    async reserves(
        {
            state,
            bot,
        }: ReservesParams): Promise<ReservesResult> {

        const _state = state as ClmmLiquidityPoolState
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })

        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })

        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                "Either token A or token B is not in the pool"
            )
        }

        const liquidityPool =
            this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                id: bot.activePositionLiquidityPool.toString(),
            })

        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException()
        }

        const {
            tokenA: amountA,
            tokenB: amountB,
        } = this.clmmReservesFormulaService.computeReserves({
            tickLower: new Decimal(bot.activePosition?.tickLower ?? 0),
            tickUpper: new Decimal(bot.activePosition?.tickUpper ?? 0),
            tickCurrent: new Decimal(_state.dynamic.tickCurrent.toNumber()),
            liquidity: new BN(bot.activePosition?.liquidity ?? 0),
            decimalsA: tokenA.decimals,
            decimalsB: tokenB.decimals,
            fixedPointScale: Q64,
        })

        return {
            tokenA: amountA,
            tokenB: amountB,
            snapshotAt: this.dayjsService.now(),
        }
    }
}