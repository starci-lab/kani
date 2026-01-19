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
} from "@exceptions"
import {
    ClmmReservesFormulaService 
} from "../../formulas"
import Decimal from "decimal.js"
import BN from "bn.js"
import {
    Q64 
} from "@utils"
import {
    DayjsService 
} from "@modules/mixin"

@Injectable()
export class TurbosReservesService implements IReservesService {
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
        if (!bot.activePosition ||
            !bot.activePosition?.associatedPosition
        ) {
            throw new ActivePositionNotFoundException(
                {
                    botId: bot.id,
                }
            )
        }
        const _state = state as ClmmLiquidityPoolState
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            },
        })

        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
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
                        id: {
                            $eq: bot.activePosition.liquidityPool.toString(),
                        },
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
            tickLower: new Decimal(bot.activePosition.associatedPosition.tickLower ?? 0),
            tickUpper: new Decimal(bot.activePosition.associatedPosition.tickUpper ?? 0),
            tickCurrent: new Decimal(_state.dynamic.tickCurrent.toNumber()),
            liquidity: new BN(bot.activePosition.associatedPosition.liquidity ?? 0),
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