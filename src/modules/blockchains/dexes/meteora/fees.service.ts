import {
    Injectable
} from "@nestjs/common"
import {
    DexId,
    MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService
} from "@modules/databases"
import {
    RpcExecutorService
} from "../../clients"
import {
    FeesParams, IFeesService, FeesResult
} from "../../interfaces"
import {
    deriveBinArray,
    getBinArrayIndexesCoverage,
    decodeAccount,
    createProgram,
    PositionV2,
    BinArray,
    getBinArrayLowerUpperBinId
} from "@meteora-ag/dlmm"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    PositionDlmmStateNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    clusterApiUrl, Connection, PublicKey
} from "@solana/web3.js"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    address, fetchEncodedAccounts
} from "@solana/kit"
import {
    toDecimalAmount
} from "@modules/utils"
import {
    Q128
} from "@modules/utils"
import {
    ErrorSolanaAccountName, SolanaAccountNotFoundException
} from "@modules/exceptions"
import {
    Decimal 
} from "decimal.js"

@Injectable()
export class MeteoraFeesService implements IFeesService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly rpcExecutorService: RpcExecutorService,
    ) { }

    async fees(
        {
            bot,
            state,
        }: FeesParams,
    ): Promise<FeesResult> {
        // get the bin array indexes
        // Stage: state validation (fees require an active position with associated position data)
        if (!bot.activePosition ||
            !bot.activePosition.associatedPosition
        ) {
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
        // get the bin array indexes
        const positionMinBinId = bot.activePosition.associatedPosition.dlmmState.minBinId
        const positionMaxBinId = bot.activePosition.associatedPosition.dlmmState.maxBinId
        const binArrayIndexes = getBinArrayIndexesCoverage(
            new BN(positionMinBinId),
            new BN(positionMaxBinId)
        )
        // get the program address
        const {
            programAddress,
        } = state.static.metadata as MeteoraLiquidityPoolMetadata
        // get the bin array pubkeys
        const binArrayPubkeys = binArrayIndexes.map(
            (index) =>
                deriveBinArray(
                    new PublicKey(state.static.poolAddress),
                    index,
                    new PublicKey(programAddress)
                )[0]
        )
        const positionId = bot.activePosition.associatedPosition.positionId
        // fetch the bin array accounts
        // Stage: on-chain/data fetch (batch fetch position + bin arrays)
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
        // validate the position account
        // Stage: on-chain fetch validation (position account must exist)
        if (!positionAccount || !positionAccount.exists) {
            throw new SolanaAccountNotFoundException({
                name: ErrorSolanaAccountName.PositionATA,
                address: positionId,
                dexId: DexId.Meteora,
                liquidityPoolId: state.static.displayId,
            })
        }
        // validate the bin array accounts
        for (const binArrayAccount of binArrayAccounts) {
            if (!binArrayAccount || !binArrayAccount.exists) {
                throw new SolanaAccountNotFoundException({
                    name: ErrorSolanaAccountName.BinArray,
                    address: binArrayAccount.address,
                    dexId: DexId.Meteora,
                    liquidityPoolId: state.static.displayId,
                })
            }
        }
        // create the program
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
                    liquidityPoolId: state.static.displayId,
                })
                return decodeAccount<BinArray>(
                    program,
                    "binArray",
                    Buffer.from(binArrayAccount.data)
                )
            }
        )
        let totalFeeX = new BN(0)
        let totalFeeY = new BN(0)
        // get the bin lower and upper bin ids array
        const binLowerAndUpperBinIdsArray = binArrays.map(
            binArray => getBinArrayLowerUpperBinId(binArray.index)
        )
        // iterate over the liquidity shares
        for (let i = 0; i < position.liquidityShares.length; i++) {
            // get the current bin id
            const binIdCurrent = new BN(bot.activePosition.associatedPosition.dlmmState.minBinId).add(new BN(i))
            // get the liquidity
            const liquidity = new BN(position.liquidityShares[i])
            if (liquidity.isZero()) continue
            // get the fee info
            const feeInfo = position.feeInfos[i]
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
                liquidityPoolId: state.static.displayId,
            })
            const correspondingBinArray = binArrays[correspondingBinArrayIndex]
            const indexInBinArray = binIdCurrent.sub(binLowerAndUpperBinIdsArray[correspondingBinArrayIndex][0])
            // get the delta x
            const deltaX = correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountXPerTokenStored
                .sub(feeInfo.feeXPerTokenComplete)
            const deltaY = correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountYPerTokenStored
                .sub(feeInfo.feeYPerTokenComplete)
            totalFeeX = totalFeeX.add(liquidity.mul(deltaX).div(Q128))
            totalFeeY = totalFeeY.add(liquidity.mul(deltaY).div(Q128))
        }
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) throw new InvalidPoolTokensException({
            liquidityPoolId: state.static.displayId,
        })
        return {
            feeA: toDecimalAmount({
                amount: totalFeeX,
                decimals: new Decimal(tokenA.decimals),
            }),
            feeB: toDecimalAmount({
                amount: totalFeeY,
                decimals: new Decimal(tokenB.decimals),
            }),  
            rewards: [],
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}