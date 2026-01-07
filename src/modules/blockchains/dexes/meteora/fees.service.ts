import { Injectable } from "@nestjs/common"
import { MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService } from "@modules/databases"
import { RpcExecutorService } from "../../clients"
import { FeesParams, IFeesService, FeesResponse } from "../../interfaces"
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
    BinArrayNotFoundException, 
    InvalidPoolTokensException, 
    PositionNotFoundException 
} from "@exceptions"
import BN from "bn.js"
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js"
import { RpcAccessType } from "@modules/filesystem"
import { address, fetchEncodedAccounts } from "@solana/kit"
import { computeDenomination } from "@utils"
import Decimal from "decimal.js"
import { Q128 } from "@utils"

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
    ): Promise<FeesResponse> {
        // get the bin array indexes
        if (!bot.activePosition) throw new ActivePositionNotFoundException("Active position not found")
        // get the bin array indexes
        const positionMinBinId = bot.activePosition.minBinId ?? 0
        const positionMaxBinId = bot.activePosition.maxBinId ?? 0
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
        const positionId = bot.activePosition.positionId
        // fetch the bin array accounts
        const [
            positionAccount,
            ...binArrayAccounts
        ] = await this.rpcExecutorService.withSolanaRpc(
            {
                accessType: RpcAccessType.Read,
                callback: async ({ rpc }) => {
                    return await fetchEncodedAccounts(
                        rpc, 
                        [address(positionId), ...binArrayPubkeys.map(pubkey => address(pubkey.toString()))]
                    )
                }
            }
        )
        // validate the position account
        if (!positionAccount || !positionAccount.exists) {
            throw new PositionNotFoundException("Position not found")
        }
        // validate the bin array accounts
        for (const binArrayAccount of binArrayAccounts) {
            if (!binArrayAccount || !binArrayAccount.exists) {
                throw new BinArrayNotFoundException("Bin array not found")
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
            binArrayAccount => 
            {
                if (!binArrayAccount.exists) throw new BinArrayNotFoundException("Bin array not found")
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
            const currentBinId = new Decimal(bot.activePosition.minBinId ?? 0).add(new Decimal(i)).toNumber()
            // get the liquidity
            const liquidity = new BN(position.liquidityShares[i])
            if (liquidity.isZero()) continue
            // get the fee info
            const feeInfo = position.feeInfos[i]
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
            // get the delta x
            const deltaX = new BN(correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountXPerTokenStored)
                .sub(new BN(feeInfo.feeXPerTokenComplete))
            const deltaY = new BN(correspondingBinArray.bins[indexInBinArray.toNumber()].feeAmountYPerTokenStored)
                .sub(new BN(feeInfo.feeYPerTokenComplete))
            totalFeeX = totalFeeX.add(liquidity.mul(deltaX).div(Q128))
            totalFeeY = totalFeeY.add(liquidity.mul(deltaY).div(Q128))
        }
        const tokenA = this.primaryMemoryStorageService.tokens.find(token => token.id === state.static.tokenA.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find(token => token.id === state.static.tokenB.toString())
        if (!tokenA || !tokenB) throw new InvalidPoolTokensException("Invalid pool tokens")
        return {
            tokenA: computeDenomination(totalFeeX, tokenA.decimals),
            tokenB: computeDenomination(totalFeeY, tokenB.decimals),
            snapshotAt: state.dynamic.snapshotAt,
        }
    }
}