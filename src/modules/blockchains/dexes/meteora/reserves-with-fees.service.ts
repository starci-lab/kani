import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
    DlmmLiquidityPoolState,
} from "../../interfaces"
import {
    Injectable,
} from "@nestjs/common"
import {
    DexId,
    MeteoraLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    RpcExecutorService,
} from "../../clients"
import {
    deriveBinArray,
    getBinArrayIndexesCoverage,
    decodeAccount,
    createProgram,
    PositionV2,
    BinArray,
    getBinArrayLowerUpperBinId,
} from "@meteora-ag/dlmm"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SolanaAccountNotFoundException,
    ErrorSolanaAccountName,
    PositionDlmmStateNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    clusterApiUrl,
    Connection,
    PublicKey,
} from "@solana/web3.js"
import {
    RpcAccessType,
} from "@modules/filesystem"
import {
    address,
    fetchEncodedAccounts,
} from "@solana/kit"
import {
    toDecimalAmount,
    bnDivBn,
    bnDivDecimal,
    Q64,
    Q128,
} from "@modules/utils"
import {
    Decimal,
} from "decimal.js"
import {
    DlmmBinFormulaService,
} from "../../formulas"

@Injectable()
export class MeteoraReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dlmmBinFormulaService: DlmmBinFormulaService,
    ) { }

    async reservesWithFees({
        bot,
        state,
    }: ReservesWithFeesParams): Promise<ReservesWithFeesResult> {
        const _state = state as DlmmLiquidityPoolState
        // Stage: state validation (requires an active position with associated position data)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (position must have DLMM state recorded)
        if (!bot.activePosition.associatedPosition.dlmmState) {
            throw new PositionDlmmStateNotFoundException({
                positionId: bot.activePosition.associatedPosition.positionId,
                botId: bot.id,
            })
        }
        // Stage: state validation (pool must have DLMM static state)
        if (!_state.static.dlmmState) {
            throw new Error("Pool must have DLMM static state")
        }
        const activeBinId = _state.dynamic.activeId
        const positionId = bot.activePosition.associatedPosition.positionId
        const positionMinBinId = bot.activePosition.associatedPosition.dlmmState.minBinId
        const positionMaxBinId = bot.activePosition.associatedPosition.dlmmState.maxBinId
        const binArrayIndexes = getBinArrayIndexesCoverage(
            new BN(positionMinBinId),
            new BN(positionMaxBinId),
        )
        const {
            programAddress,
        } = _state.static.metadata as MeteoraLiquidityPoolMetadata
        const binArrayPubkeys = binArrayIndexes.map(
            (index) =>
                deriveBinArray(
                    new PublicKey(_state.static.poolAddress),
                    index,
                    new PublicKey(programAddress),
                )[0],
        )
        // Stage: on-chain/data fetch (batch fetch position + bin arrays)
        const [
            positionAccount,
            ...binArrayAccounts
        ] = await this.rpcExecutorService.withSolanaRpc({
            accessType: RpcAccessType.Http,
            callback: async ({ rpc }) => {
                return await fetchEncodedAccounts(
                    rpc,
                    [
                        address(positionId),
                        ...binArrayPubkeys.map(pubkey => address(pubkey.toString())),
                    ],
                )
            },
        })
        // Stage: on-chain fetch validation (position account must exist)
        if (!positionAccount || !positionAccount.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.PositionATA,
                address: positionId,
                dexId: DexId.Meteora,
                liquidityPoolId: _state.static.displayId,
            })
        }
        // Stage: on-chain fetch validation (bin array accounts must exist)
        for (const binArrayAccount of binArrayAccounts) {
            if (!binArrayAccount || !binArrayAccount.exists) {
                throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.BinArray,
                    address: binArrayAccount.address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: _state.static.displayId,
                })
            }
        }
        // Decode accounts
        const program = createProgram(
            new Connection(clusterApiUrl("mainnet-beta")),
        )
        const position = decodeAccount<PositionV2>(
            program,
            "positionV2",
            Buffer.from(positionAccount.data),
        )
        const binArrays = binArrayAccounts.map(
            (binArrayAccount) => {
                if (!binArrayAccount.exists) {
                    throw new SolanaAccountNotFoundException({
                        name: ErrorSolanaAccountName.BinArray,
                        address: binArrayAccount.address,
                        dexId: DexId.Meteora,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
                return decodeAccount<BinArray>(
                    program,
                    "binArray",
                    Buffer.from(binArrayAccount.data),
                )
            },
        )
        // Token validation
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const decimalsA = tokenA.decimals
        const decimalsB = tokenB.decimals
        const binLowerAndUpperBinIdsArray = binArrays.map(
            binArray => getBinArrayLowerUpperBinId(binArray.index),
        )
        const binStep = new Decimal(_state.static.dlmmState.binStep)
        const liquidityShares = position.liquidityShares

        // ----------------------------
        // Reserves calculation
        // ----------------------------
        let reserveARaw = new BN(0)
        let reserveBRaw = new BN(0)
        for (let i = 0; i < liquidityShares.length; i++) {
            const liquidityShareRaw = liquidityShares[i]
            const liquidityShare = liquidityShareRaw.div(Q64)
            if (liquidityShare.isZero()) continue
            const binIdCurrent = new BN(positionMinBinId).add(new BN(i))
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
                const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                    (binLowerAndUpperBinIds) => binIdCurrent
                        .gte(binLowerAndUpperBinIds[0])
                        && binIdCurrent
                            .lte(binLowerAndUpperBinIds[1]),
                )
                if (correspondingBinArrayIndex === -1) {
                    throw new SolanaAccountNotFoundException({
                        name: ErrorSolanaAccountName.BinArray,
                        address: binArrayAccounts[correspondingBinArrayIndex].address,
                        dexId: DexId.Meteora,
                        liquidityPoolId: _state.static.displayId,
                    })
                }
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

        // ----------------------------
        // Fee calculation
        // ----------------------------
        let totalFeeX = new BN(0)
        let totalFeeY = new BN(0)
        for (let i = 0; i < position.liquidityShares.length; i++) {
            const binIdCurrent = new BN(positionMinBinId).add(new BN(i))
            const liquidity = new BN(position.liquidityShares[i])
            if (liquidity.isZero()) continue
            const feeInfo = position.feeInfos[i]
            const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                (binLowerAndUpperBinIds) => binIdCurrent
                    .gte(binLowerAndUpperBinIds[0])
                    && binIdCurrent
                        .lte(binLowerAndUpperBinIds[1]),
            )
            if (correspondingBinArrayIndex === -1) {
                throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.BinArray,
                    address: binArrayAccounts[correspondingBinArrayIndex].address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: _state.static.displayId,
                })
            }
            const correspondingBinArray = binArrays[correspondingBinArrayIndex]
            const indexInBinArray = binIdCurrent.sub(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0])
            const deltaX = correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountXPerTokenStored
                .sub(feeInfo.feeXPerTokenComplete)
            const deltaY = correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountYPerTokenStored
                .sub(feeInfo.feeYPerTokenComplete)
            totalFeeX = totalFeeX.add(liquidity.mul(deltaX).div(Q128))
            totalFeeY = totalFeeY.add(liquidity.mul(deltaY).div(Q128))
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
            feeA: toDecimalAmount({
                amount: totalFeeX,
                decimals: new Decimal(tokenA.decimals),
            }),
            feeB: toDecimalAmount({
                amount: totalFeeY,
                decimals: new Decimal(tokenB.decimals),
            }),
            rewards: {
            },
            snapshotAt: _state.dynamic.snapshotAt,
        }
    }
}
