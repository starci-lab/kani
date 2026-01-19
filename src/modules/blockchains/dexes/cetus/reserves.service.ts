import {
    Injectable 
} from "@nestjs/common"
import {
    IReservesService,
    ClmmLiquidityPoolState,
    ReservesParams,
    ReservesResult
} from "../../interfaces"
import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    ActivePositionNotFoundException, InvalidPoolTokensException, LiquidityPoolNotFoundException
} from "@modules/exceptions"
import {
    ClmmReservesFormulaService
} from "../../formulas"
import Decimal from "decimal.js"
import BN from "bn.js"
import {
    Q64 
} from "@modules/utils"
import {
    DayjsService 
} from "@modules/mixin"

@Injectable()
export class CetusReservesService implements IReservesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clmmReservesFormulaService: ClmmReservesFormulaService,
        private readonly dayjsService: DayjsService
    ) { }

    async reserves(
        {
            state,
            bot,
        }: ReservesParams): Promise<ReservesResult> {
        if (!bot.activePosition) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const _state = state as ClmmLiquidityPoolState
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }

        const liquidityPool =
            this.primaryMemoryStorageService
                .liquidityPoolCollection
                .findOne(
                    {
                        id: bot.activePosition.liquidityPool.toString(),
                    }
                )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                {
                    displayId: _state.static.displayId,
                }
            )
        }

        const {
            reserveA,
            reserveB,
        } = this.clmmReservesFormulaService.computeReserves({
            tickLower: new BN(bot.activePosition.associatedPosition?.tickLower ?? 0),
            tickUpper: new BN(bot.activePosition.associatedPosition?.tickUpper ?? 0),
            tickCurrent: _state.dynamic.tickCurrent,
            liquidity: new BN(bot.activePosition.associatedPosition?.liquidity ?? 0),
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
            fixedPointScale: Q64,
        })

        return {
            reserveA,
            reserveB,
            snapshotAt: this.dayjsService.now(),
        }
    }
}