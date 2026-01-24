import {
    DlmmLiquidityPoolState,
    IReservesService,
    ReservesParams,
    ReservesResult,
} from "../../interfaces"
import {
    Decimal 
} from "decimal.js"
import {
    Injectable 
} from "@nestjs/common"
import {
    InvalidPoolTokensException, 
    SolanaAccountNotFoundException, 
    ErrorSolanaAccountName, 
    ActivePositionNotFoundException,
    PositionDlmmStateNotFoundException,
    LiquidityPoolDlmmStateNotFoundException
} from "@modules/exceptions"
import {
    RpcExecutorService 
} from "../../clients"
import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    address, fetchEncodedAccounts 
} from "@solana/kit"
import {
    createProgram, 
    PositionV2, 
    decodeAccount, 
    getBinArrayIndexesCoverage,
    deriveBinArray, 
    BinArray, 
    getBinArrayLowerUpperBinId 
} from "@meteora-ag/dlmm"
import {
    clusterApiUrl, Connection, PublicKey 
} from "@solana/web3.js"
import {
    DlmmBinFormulaService 
} from "../../formulas"
import {
    DexId,
    MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    bnDivBn,
    bnDivDecimal,
    toDecimalAmount
} from "@modules/utils"
import BN from "bn.js"
import {
    Q64 
} from "@modules/utils"

@Injectable()
export class MeteoraReservesService implements IReservesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dlmmBinFormulaService: DlmmBinFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async reserves({
        bot,
        state,
    }: ReservesParams): Promise<ReservesResult> {
        const _state = state as DlmmLiquidityPoolState
        if (!bot.activePosition
            || !bot.activePosition.associatedPosition
        ) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        if (!bot.activePosition.associatedPosition.dlmmState) {
            throw new PositionDlmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        if (!_state.static.dlmmState) {
            throw new LiquidityPoolDlmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const activeBinId = _state.dynamic.activeId
        const positionId = bot.activePosition.associatedPosition.positionId
        const positionMinBinId = bot.activePosition.associatedPosition.dlmmState.minBinId
        const positionMaxBinId = bot.activePosition.associatedPosition.dlmmState.maxBinId
        const binArrayIndexes = getBinArrayIndexesCoverage(
            new BN(positionMinBinId),
            new BN(positionMaxBinId)
        )
        const binLowerAndUpperBinIdsArray = binArrayIndexes.map(
            binArrayIndex => getBinArrayLowerUpperBinId(binArrayIndex)
        )
        const {
            programAddress,
        } = state.static.metadata as MeteoraLiquidityPoolMetadata
        const binArrayPubkeys = binArrayIndexes.map(
            (index) =>
                deriveBinArray(
                    new PublicKey(state.static.poolAddress),
                    index,
                    new PublicKey(programAddress)
                )[0]
        )
        const [
            positionAccount,
            ...binArrayAccounts
        ] = await this.rpcExecutorService.withSolanaRpc(
            {
                accessType: RpcAccessType.Http,
                callback: async ({ rpc }) => {
                    return await fetchEncodedAccounts(
                        rpc, 
                        [address(positionId),
                            ...binArrayPubkeys.map(pubkey => address(pubkey.toString()))]
                    )
                }
            }
        )
        if (!positionAccount || !positionAccount.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.DLMMPosition,
                address: positionId,
                dexId: DexId.Meteora,
                liquidityPoolId: _state.static.displayId,
            })
        }

        for (const binArrayAccount of binArrayAccounts) {
            if (!binArrayAccount.exists) throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.BinArray,
                address: binArrayAccount.address,
                dexId: DexId.Meteora,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const program = createProgram(
            // dump params to retrieve the idl from the network
            new Connection(clusterApiUrl("mainnet-beta"))
        )
        // decode the position account
        const position = decodeAccount<PositionV2>(
            program,
            "positionV2",
            Buffer.from(positionAccount.data)
        )
        // decode the bin array accounts
        const binArrays = binArrayAccounts.map(
            binArrayAccount => {
                if (!binArrayAccount.exists) throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.BinArray,
                    address: binArrayAccount.address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: _state.static.displayId,
                })
                return decodeAccount<BinArray>(
                    program,
                    "binArray",
                    Buffer.from(binArrayAccount.data)
                )
            }
        )
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
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const decimalsA = tokenA.decimals
        const decimalsB = tokenB.decimals
        // get the liquidity shares
        const liquidityShares = position.liquidityShares
        let reserveARaw = new BN(0)
        let reserveBRaw = new BN(0)
        const binStep = new Decimal(_state.static.dlmmState.binStep)
        for (let i = 0; i < liquidityShares.length; i++) {
            const liquidityShareRaw = liquidityShares[i]
            const liquidityShare = liquidityShareRaw.div(Q64)
            if (liquidityShare.isZero()) continue
            const binIdCurrent = new BN(bot.activePosition.associatedPosition.dlmmState.minBinId).add(new BN(i))
            const { price } = this.dlmmBinFormulaService.activeIdToPriceRaw({
                activeId: binIdCurrent,
                binStep: binStep.toNumber(),
                basisPointMax: _state.static.dlmmState.basisPointMax,
            })
            if (binIdCurrent.lt(activeBinId)) {
                reserveBRaw = reserveBRaw.add(liquidityShare)
            } else if (binIdCurrent.gt(activeBinId)) {
                reserveARaw = reserveARaw.add(bnDivDecimal({
                    bn: liquidityShare,
                    decimal: new Decimal(1).div(price),
                }))
            } else {
                // get the corresponding bin array
                const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                    (binLowerAndUpperBinIds) => binIdCurrent
                        .gte(
                            binLowerAndUpperBinIds[0]
                        ) 
                    && binIdCurrent
                        .lte(
                            binLowerAndUpperBinIds[1]
                        )
                )
                if (correspondingBinArrayIndex === -1) throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.BinArray,
                    address: binArrayAccounts[correspondingBinArrayIndex].address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: _state.static.displayId,
                })
                const correspondingBinArray = binArrays[correspondingBinArrayIndex]
                const indexInBinArray = binIdCurrent.sub(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0])
                const globalBin = correspondingBinArray.bins[indexInBinArray.toNumber()]
                const sharePercentage = bnDivBn({
                    bn1: liquidityShareRaw,
                    bn2: new BN(globalBin.liquiditySupply),
                })
                const amountX = bnDivDecimal({
                    bn: new BN(globalBin.amountX),
                    decimal: sharePercentage,
                })
                const amountY = bnDivDecimal({
                    bn: new BN(globalBin.amountY),
                    decimal: sharePercentage,
                })
                reserveARaw = reserveARaw.add(amountX)
                reserveBRaw = reserveBRaw.add(amountY)
            }
        }
        return {
            reserveA: toDecimalAmount({
                amount: reserveARaw,
                decimals: new Decimal(decimalsA),
            }),
            reserveB: toDecimalAmount({
                amount: reserveBRaw,
                decimals: new Decimal(decimalsB),
            }),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}