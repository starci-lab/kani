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
    ActivePositionNotFoundException, 
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException, 
    LiquidityPoolNotFoundException
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
export class TurbosReservesService implements IReservesService {
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
        // Stage: state validation (reserves require an active position with associated position data)
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
        // Stage: state validation (pool token metadata must exist)
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

        // Stage: state validation (ensure we can resolve the liquidity pool record referenced by the active position)
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
        // Stage: state validation (CLMM state must be present on the associated position)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException(
                {
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }

        const {
            reserveA,
            reserveB,
        } = this.clmmReservesFormulaService.computeReserves({
            tickLower: new BN(bot.activePosition.associatedPosition.clmmState.tickLower),
            tickUpper: new BN(bot.activePosition.associatedPosition.clmmState.tickUpper),
            tickCurrent: _state.dynamic.tickCurrent,
            liquidity: new BN(bot.activePosition.associatedPosition.clmmState.liquidity),
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