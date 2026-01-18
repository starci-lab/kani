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
    BinArrayNotFoundException, InvalidPoolTokensException, SolanaAccountNotFoundException, ErrorSolanaAccountName, 
    ActivePositionNotFoundException
} from "@exceptions"
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
    createProgram, PositionV2, decodeAccount, getBinArrayIndexesCoverage, deriveBinArray, BinArray, getBinArrayLowerUpperBinId 
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
    computeDenomination, divBn, toScaledBN 
} from "@utils"
import BN from "bn.js"
import {
    Q64 
} from "@utils"

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
        if (!bot.activePosition
            || !bot.activePositionLiquidityPool
            || !bot.activePositionLiquidityPoolType
        ) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        const _state = state as DlmmLiquidityPoolState
        const activeBinId = new Decimal(_state.dynamic.activeId)
        const positionId = bot.activePosition.positionId
        const positionMinBinId = bot.activePosition.minBinId ?? 0
        const positionMaxBinId = bot.activePosition.maxBinId ?? 0
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
            if (!binArrayAccount.exists) throw new BinArrayNotFoundException("Bin array not found")
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
                if (!binArrayAccount.exists) throw new BinArrayNotFoundException("Bin array not found")
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
        const binStep = new Decimal(_state.static.binStep)
        for (let i = 0; i < liquidityShares.length; i++) {
            const liquidityShareRaw = liquidityShares[i]
            const liquidityShare = liquidityShareRaw.div(Q64)
            if (liquidityShare.isZero()) continue
            const currentBinId = new Decimal(bot.activePosition.minBinId ?? 0).add(new Decimal(i))
            const { price } = this.dlmmBinFormulaService.activeIdToPriceRaw({
                activeId: currentBinId.toNumber(),
                binStep: binStep.toNumber(),
                basisPointMax: _state.static.basisPointMax,
            })
            if (currentBinId.lessThan(activeBinId)) {
                reserveBRaw = reserveBRaw.add(liquidityShare)
            } else if (currentBinId.greaterThan(activeBinId)) {
                reserveARaw = reserveARaw.add(toScaledBN(liquidityShare,
                    new Decimal(1).div(price)))
            } else {
                // get the corresponding bin array
                const correspondingBinArrayIndex = binLowerAndUpperBinIdsArray.findIndex(
                    (binLowerAndUpperBinIds) => new Decimal(currentBinId)
                        .greaterThanOrEqualTo(
                            new Decimal(binLowerAndUpperBinIds[0].toString())
                        ) 
                    && new Decimal(currentBinId)
                        .lessThanOrEqualTo(
                            new Decimal(binLowerAndUpperBinIds[1].toString())
                        )
                )
                if (correspondingBinArrayIndex === -1) throw new BinArrayNotFoundException("Bin array not found")
                const correspondingBinArray = binArrays[correspondingBinArrayIndex]
                const indexInBinArray = new Decimal(currentBinId).sub(new Decimal(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0].toString()))
                const globalBin = correspondingBinArray.bins[indexInBinArray.toNumber()]
                const sharePercentage = divBn(liquidityShareRaw,
                    globalBin.liquiditySupply)
                const amountX = toScaledBN(new BN(globalBin.amountX),
                    sharePercentage)
                const amountY = toScaledBN(new BN(globalBin.amountY),
                    sharePercentage)
                reserveARaw = reserveARaw.add(amountX)
                reserveBRaw = reserveBRaw.add(amountY)
            }
        }
        return {
            reserveA: computeDenomination(reserveARaw,
                decimalsA),
            reserveB: computeDenomination(reserveBRaw,
                decimalsB),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}