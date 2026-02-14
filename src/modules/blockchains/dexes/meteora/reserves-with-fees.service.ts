import {
    ReservesWithFeesParams,
    ReservesWithFeesResult,
    IReservesWithFeesService,
} from "../types"
import {
    DlmmLiquidityPoolState,
} from "../../types"
import {
    Injectable,
} from "@nestjs/common"
import {
    DexId,
    MeteoraLiquidityPoolMetadata,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    AccountKind,
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
} from "@modules/common"
import {
    Decimal,
} from "decimal.js"
import {
    DlmmBinFormulaService,
} from "../../formulas"

/**
 * Service responsible for calculating reserves and fees for Meteora DLMM positions.
 * Fetches on-chain data for position and bin arrays to compute current reserves and accumulated fees.
 *
 * @example
 * const service = new MeteoraReservesWithFeesService(...)
 * const result = await service.reservesWithFees({ state, bot })
 */
@Injectable()
export class MeteoraReservesWithFeesService implements IReservesWithFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly dlmmBinFormulaService: DlmmBinFormulaService,
    ) { }

    /**
     * Computes the current reserves and accumulated fees for a Meteora DLMM position.
     *
     * @param param - Parameters for calculating reserves with fees
     * @param param.state - The DLMM liquidity pool state
     * @param param.bot - The bot schema containing active position details
     * @returns The computed reserves and fees
     * @throws {ActivePositionNotFoundException} If no active position is found for the bot
     * @throws {PositionDlmmStateNotFoundException} If DLMM state is missing for the active position
     * @throws {InvalidPoolTokensException} If token A or B metadata is not found
     * @throws {SolanaAccountNotFoundException} If position or bin array accounts are not found on-chain
     */
    async reservesWithFees({
        bot,
        state,
        liquidityPool,  
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
        if (!liquidityPool.dlmmState) {
            throw new Error("Pool must have DLMM static state")
        }

        // Extract position and pool state information
        const {
            activeId: activeBinId
        } = _state
        const {
            positionId,
            dlmmState: {
                minBinId: positionMinBinId,
                maxBinId: positionMaxBinId
            }
        } = bot.activePosition.associatedPosition

        // Calculate bin array indexes needed to cover the position range
        const binArrayIndexes = getBinArrayIndexesCoverage(
            new BN(positionMinBinId),
            new BN(positionMaxBinId),
        )
        const {
            programAddress,
        } = liquidityPool.metadata as MeteoraLiquidityPoolMetadata

        // Derive bin array public keys
        const binArrayPubkeys = binArrayIndexes.map(
            (index) =>
                deriveBinArray(
                    new PublicKey(liquidityPool.poolAddress),
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
                kind: AccountKind.PositionATA,
                address: positionId,
                dexId: DexId.Meteora,
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        // Stage: on-chain fetch validation (bin array accounts must exist)
        for (const binArrayAccount of binArrayAccounts) {
            if (!binArrayAccount || !binArrayAccount.exists) {
                throw new SolanaAccountNotFoundException({
                    kind: AccountKind.BinArray,
                    address: binArrayAccount.address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
        }
        // Decode accounts using Meteora program
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
                        kind: AccountKind.BinArray,
                        address: binArrayAccount.address,
                        dexId: DexId.Meteora,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                return decodeAccount<BinArray>(
                    program,
                    "binArray",
                    Buffer.from(binArrayAccount.data),
                )
            },
        )

        // Stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const {
            decimals: decimalsA
        } = tokenA
        const {
            decimals: decimalsB
        } = tokenB

        // Calculate bin array coverage ranges
        const binLowerAndUpperBinIdsArray = binArrays.map(
            binArray => getBinArrayLowerUpperBinId(binArray.index),
        )
        const binStep = new Decimal(liquidityPool.dlmmState.binStep)
        const {
            liquidityShares
        } = position

        // ----------------------------
        // Reserves calculation
        // ----------------------------
        let reserveARaw = new BN(0)
        let reserveBRaw = new BN(0)

        // Iterate through each bin in the position range
        for (let i = 0; i < liquidityShares.length; i++) {
            const liquidityShareRaw = liquidityShares[i]
            // Convert liquidity share from Q64 fixed-point to raw amount
            const liquidityShare = liquidityShareRaw.div(Q64)
            // Skip bins with zero liquidity
            if (liquidityShare.isZero()) continue

            // Calculate current bin ID from position min bin ID and index
            const binIdCurrent = new BN(positionMinBinId).add(new BN(i))

            // Get price for this bin ID
            const { price } = this.dlmmBinFormulaService.activeIdToPriceRaw({
                activeId: binIdCurrent,
                binStep: binStep.toNumber(),
                basisPointMax: liquidityPool.dlmmState?.basisPointMax ?? 0,
            })

            // Calculate reserves based on bin position relative to active bin
            if (binIdCurrent.lt(activeBinId)) {
                // Bin is below active bin: all liquidity is in token B
                reserveBRaw = reserveBRaw.add(liquidityShare)
            } else if (binIdCurrent.gt(activeBinId)) {
                // Bin is above active bin: all liquidity is in token A (convert using price)
                reserveARaw = reserveARaw.add(bnDivDecimal({
                    bn: liquidityShare,
                    decimal: new Decimal(1).div(price),
                }))
            } else {
                // Bin is the active bin: calculate share of bin's reserves
                // Find which bin array contains this bin ID
                const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                    (binLowerAndUpperBinIds) => binIdCurrent
                        .gte(binLowerAndUpperBinIds[0])
                        && binIdCurrent
                            .lte(binLowerAndUpperBinIds[1]),
                )
                if (correspondingBinArrayIndex === -1) {
                    throw new SolanaAccountNotFoundException({
                        kind: AccountKind.BinArray,
                        address: binArrayAccounts[correspondingBinArrayIndex].address,
                        dexId: DexId.Meteora,
                        liquidityPoolId: liquidityPool.displayId,
                    })
                }
                const correspondingBinArray = binArrays[correspondingBinArrayIndex]
                // Calculate index within the bin array
                const indexInBinArray = binIdCurrent.sub(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0])
                const globalBin = correspondingBinArray.bins[indexInBinArray.toNumber()]

                // Calculate position's share percentage of the bin's total liquidity
                const sharePercentage = bnDivBn({
                    bn1: liquidityShareRaw,
                    bn2: new BN(globalBin.liquiditySupply),
                })

                // Calculate position's share of token X and Y in the active bin
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

        // Iterate through each bin in the position range to calculate accumulated fees
        for (let i = 0; i < position.liquidityShares.length; i++) {
            const binIdCurrent = new BN(positionMinBinId).add(new BN(i))
            const liquidity = new BN(position.liquidityShares[i])
            // Skip bins with zero liquidity
            if (liquidity.isZero()) continue

            // Get fee checkpoint for this bin
            const feeInfo = position.feeInfos[i]

            // Find which bin array contains this bin ID
            const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                (binLowerAndUpperBinIds) => binIdCurrent
                    .gte(binLowerAndUpperBinIds[0])
                    && binIdCurrent
                        .lte(binLowerAndUpperBinIds[1]),
            )
            if (correspondingBinArrayIndex === -1) {
                throw new SolanaAccountNotFoundException({
                    kind: AccountKind.BinArray,
                    address: binArrayAccounts[correspondingBinArrayIndex].address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: liquidityPool.displayId,
                })
            }
            const correspondingBinArray = binArrays[correspondingBinArrayIndex]
            // Calculate index within the bin array
            const indexInBinArray = binIdCurrent.sub(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0])
            const bin = correspondingBinArray.bins[indexInBinArray.toNumber()]

            // Calculate fee delta: current fee per token - last checkpoint fee per token
            const deltaX = bin.feeAmountXPerTokenStored
                .sub(feeInfo.feeXPerTokenComplete)
            const deltaY = bin.feeAmountYPerTokenStored
                .sub(feeInfo.feeYPerTokenComplete)

            // Calculate fee amount: liquidity * delta / Q128 (fixed-point division)
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
            snapshotAt: _state.snapshotAt,
        }
    }
}
