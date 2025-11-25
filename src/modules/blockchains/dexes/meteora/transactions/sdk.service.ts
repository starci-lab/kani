import { 
    ActionType,
    buildBitFlagAndNegateStrategyParameters,
    deriveBinArray,
    getBinArrayIndexesCoverage, 
    getSlippageMaxAmount, 
    isOverflowDefaultBinArrayBitmap, 
    LiquidityStrategyParameters, 
    REBALANCE_POSITION_PADDING, 
    RemainingAccountsInfoSlice, 
    resetUninvolvedLiquidityParams, 
    ShrinkMode, 
    StrategyParameters,
    toAmountIntoBins,
} from "@meteora-ag/dlmm"
import { BotSchema, PrimaryMemoryStorageService, MeteoraLiquidityPoolMetadata} from "@modules/databases"
import { Injectable } from "@nestjs/common"     
import { AccountMeta, AccountRole, address, Address, Instruction } from "@solana/kit"
import { DLMMOverflowDefaultBinArrayBitmapException, InvalidPoolTokensException } from "@exceptions"
import BN from "bn.js"
import { SYSTEM_PROGRAM_ADDRESS } from "@solana-program/system"
import { AnchorUtilsService, WSOL_MINT_ADDRESS } from "../../../tx-builder"
import { PublicKey } from "@solana/web3.js"
import { 
    array, 
    BeetArgsStruct, 
    FixableBeetArgsStruct, 
    i32, 
    i64, 
    u64, 
    u16, 
    u8, 
    uniformFixedSizeArray, 
    bignum,
    bool,
    coption
} from "@metaplex-foundation/beet"
import { DlmmLiquidityPoolState } from "../../../interfaces"
import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022"
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { MEMO_PROGRAM_ADDRESS } from "@solana-program/memo"
import { EventAuthorityService } from "./event-authority.service"

export const DEFAULT_INIT_BIN_ARRAY_CU = 350_000
export const DEFAULT_ADD_LIQUIDITY_CU = 1_000_000
export const MAX_CU = 1_400_000

@Injectable()
export class MeteoraSdkService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly eventAuthorityService: EventAuthorityService,
    ) {}

    async depositWithRebalanceEndpoint({
        bot,
        state,
        positionMinBinId,
        positionMaxBinId,
        strategy,
        liquidityStrategyParameters,
        maxActiveBinSlippage,
        slippagePercentage,
        positionAddress,
        ataAddressA,
        ataAddressB,
    }: DepositWithRebalanceEndpointParams): Promise<Array<Instruction>> {
        const instructions: Array<Instruction> = []
        const tokenA = this.primaryMemoryStorageService.tokens.find((t) => t.id === bot.targetToken.toString())
        const tokenB = this.primaryMemoryStorageService.tokens.find((t) => t.id === bot.quoteToken.toString())
        if (!tokenA || !tokenB) throw new InvalidPoolTokensException("Invalid pool tokens")
    
        const {
            programAddress,
            reserveXAddress,
            reserveYAddress,
        } = state.static.metadata as MeteoraLiquidityPoolMetadata
    
        const binArrayIndexes = getBinArrayIndexesCoverage(
            new BN(positionMinBinId),
            new BN(positionMaxBinId)
        )
    
        // // check overflow default bitmap
        const overflowDefaultBinArrayBitmap = binArrayIndexes.some(
            (binArrayIndex) => isOverflowDefaultBinArrayBitmap(binArrayIndex)
        )
        console.log("overflowDefaultBinArrayBitmap", overflowDefaultBinArrayBitmap)
        // track which PDAs have been initialized
        const initTracking = new Set<Address>()
        // need to init bitmap?
        if (overflowDefaultBinArrayBitmap) {
            throw new DLMMOverflowDefaultBinArrayBitmapException("DLMM overflow default bin array bitmap")
        }
        // derive bin array PDAs
        const binArrayPubkeys = binArrayIndexes.map(
            (index) =>
                deriveBinArray(
                    new PublicKey(state.static.poolAddress),
                    index,
                    new PublicKey(programAddress)
                )[0]
        )
        // init bin arrays
        for (const [idx, binArrayPubkey] of binArrayPubkeys.entries()) {
            if (initTracking.has(address(binArrayPubkey.toString()))) continue
            initTracking.add(address(binArrayPubkey.toString()))
            const initBinArrayIx: Instruction = {
                programAddress: address(programAddress),
                accounts: [
                    { address: address(state.static.poolAddress), role: AccountRole.READONLY },
                    { address: address(binArrayPubkey.toString()), role: AccountRole.WRITABLE },
                    { address: address(bot.accountAddress), role: AccountRole.WRITABLE_SIGNER },
                    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
                ],
                data: this.anchorUtilsService.encodeAnchorIx(
                    "initialize_bin_array",
                    InitializeBinArrayArgs.serialize({
                        binArrayIndex: binArrayIndexes[idx],
                    })[0]
                ),
            }
            instructions.push(initBinArrayIx)
        }
    
        // build add parameters
        const minDeltaId = new BN(positionMinBinId).sub(new BN(state.dynamic.activeId))
        const maxDeltaId = new BN(positionMaxBinId).sub(new BN(state.dynamic.activeId))
        console.log("minDeltaId", minDeltaId.toNumber())
        console.log("maxDeltaId", maxDeltaId.toNumber())
        const { deltaX, deltaY, x0, y0 } = resetUninvolvedLiquidityParams(
            minDeltaId,
            maxDeltaId,
            strategy.singleSidedX ?? false,
            {
                ...liquidityStrategyParameters,
            }
        )

        const { bitFlag, ...baseAndDelta } = buildBitFlagAndNegateStrategyParameters(x0, y0, deltaX, deltaY)
    
    
        const addParam: AddLiquidityParamsType = {
            minDeltaId: minDeltaId.toNumber(),
            maxDeltaId: maxDeltaId.toNumber(),
            x0: baseAndDelta.x0,
            y0: baseAndDelta.y0,
            deltaX: baseAndDelta.deltaX,
            deltaY: baseAndDelta.deltaY,
            bitFlag,
            favorXInActiveId: strategy.singleSidedX ?? false,
            padding: Array(16).fill(0),
        }
        // compute deposit amounts (total)
        const { totalAAmount, totalBAmount } = toAmountIntoBins(
            new BN(state.dynamic.activeId),
            minDeltaId,
            maxDeltaId,
            deltaX,
            deltaY,
            x0,
            y0,
            new BN(state.static.binStep),
            strategy.singleSidedX ?? false
        ).reduce(
            (acc, bin) => ({
                totalAAmount: acc.totalAAmount.add(bin.amountX),
                totalBAmount: acc.totalBAmount.add(bin.amountY),
            }),
            { totalAAmount: new BN(0), totalBAmount: new BN(0) }
        )
    
        const maxDepositAAmount = getSlippageMaxAmount(totalAAmount, slippagePercentage)
        const maxDepositBAmount = getSlippageMaxAmount(totalBAmount, slippagePercentage)
        // shrink mode: ALWAYS ShrinkBoth when not parallel
        const shrinkMode = ShrinkMode.ShrinkBoth
    
        // derive event authority PDA
        const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
            programAddress: address(programAddress),
        })
        // build rebalance ix
        const rebalanceIx: Instruction = {
            programAddress: address(programAddress),
            accounts: [
                { 
                    address: positionAddress, 
                    role: AccountRole.WRITABLE 
                },
                { 
                    address: address(state.static.poolAddress), 
                    role: AccountRole.WRITABLE 
                },
                {
                    address: address(programAddress),
                    role: AccountRole.READONLY,
                },
                { 
                    address: address(ataAddressA), 
                    role: AccountRole.WRITABLE 
                },
                { 
                    address: address(ataAddressB), 
                    role: AccountRole.WRITABLE 
                },
                { 
                    address: address(reserveXAddress), 
                    role: AccountRole.WRITABLE 
                },
                { 
                    address: address(reserveYAddress), 
                    role: AccountRole.WRITABLE 
                },
                { 
                    address: tokenA.tokenAddress ? address(tokenA.tokenAddress) : WSOL_MINT_ADDRESS, 
                    role: AccountRole.READONLY 
                },
                { 
                    address: tokenB.tokenAddress ? address(tokenB.tokenAddress) : WSOL_MINT_ADDRESS, 
                    role: AccountRole.READONLY 
                },
                { 
                    address: address(bot.accountAddress), 
                    role: AccountRole.WRITABLE_SIGNER 
                },
                { 
                    address: address(bot.accountAddress), 
                    role: AccountRole.WRITABLE_SIGNER 
                },
                {
                    address: tokenA.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                {
                    address: tokenB.is2022Token ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                { 
                    address: MEMO_PROGRAM_ADDRESS, 
                    role: AccountRole.READONLY 
                },
                { 
                    address: SYSTEM_PROGRAM_ADDRESS, 
                    role: AccountRole.READONLY 
                },
                { 
                    address: eventAuthorityPda, 
                    role: AccountRole.READONLY 
                },
                { 
                    address: address(programAddress), 
                    role: AccountRole.READONLY 
                },
                ...binArrayPubkeys.map((publicKey) => ({
                    address: address(publicKey.toString()),
                    role: AccountRole.WRITABLE,
                })),
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                "rebalance_liquidity",
                RebalanceLiquidityArgs.serialize({
                    params: {
                        activeId: state.dynamic.activeId,
                        maxActiveBinSlippage,
                        shouldClaimFee: false,
                        shouldClaimReward: false,
                        minWithdrawXAmount: new BN(0),
                        maxDepositXAmount: maxDepositAAmount,
                        minWithdrawYAmount: new BN(0),
                        maxDepositYAmount: maxDepositBAmount,
                        shrinkMode,
                        padding: REBALANCE_POSITION_PADDING,
                        removes: [],
                        adds: [addParam],
                    },
                    remainingAccountsInfo: {
                        slices: []
                    },
                })[0]
            ),
        }
        // group the instructions of this chunk
        instructions.push(rebalanceIx)
        return instructions
    }
}

export interface GetPotentialToken2022IxDataAndAccountsParams {
    actionType: ActionType,
    rewardIndex?: number,
}

export interface GetPotentialToken2022IxDataAndAccountsResponse {
    slices: Array<RemainingAccountsInfoSlice>,
    accounts: Array<AccountMeta>,
}
export interface DepositWithRebalanceEndpointParams {
    bot: BotSchema,
    state: DlmmLiquidityPoolState,
    strategy: StrategyParameters,
    slippagePercentage: number,
    maxActiveBinSlippage: number,
    positionAddress: Address,
    positionMinBinId: number,
    positionMaxBinId: number,
    liquidityStrategyParameters: LiquidityStrategyParameters,
    ataAddressA: Address,
    ataAddressB: Address,
}

export const InitializeBinArrayArgs = new BeetArgsStruct(
    [
        ["binArrayIndex", i64],
    ],
    "InitializeBinArrayArgs"
)

export interface AddLiquidityParamsType {
    minDeltaId: number;
    maxDeltaId: number;
    x0: bignum;
    y0: bignum;
    deltaX: bignum;
    deltaY: bignum;
    bitFlag: number;
    favorXInActiveId: boolean;
    padding: Array<number>;
}
  
export const AddLiquidityParams =
    new FixableBeetArgsStruct<AddLiquidityParamsType>(
        [
            ["minDeltaId", i32],
            ["maxDeltaId", i32],
            ["x0", u64],
            ["y0", u64],
            ["deltaX", u64],
            ["deltaY", u64],
            ["bitFlag", u8],
            ["favorXInActiveId", bool],
            ["padding", uniformFixedSizeArray(u8, 16)],
        ],
        "addLiquidityParams"
    )
  
export interface RemoveLiquidityParamsType {
    minBinId: number | null;
    maxBinId: number | null;
    bps: number;
    padding: Array<number>;
}

export const RemoveLiquidityParams = new FixableBeetArgsStruct<RemoveLiquidityParamsType>(
    [
        ["minBinId", coption(i32)],
        ["maxBinId", coption(i32)],
        ["bps", u16],
        ["padding", uniformFixedSizeArray(u8, 16)],
    ],
    "removeLiquidityParams"
)
/* -------------------------------------------------------------------------- */
/*                           RebalanceLiquidityParams                         */
/* -------------------------------------------------------------------------- */
  
export interface RebalanceLiquidityParamsType {
    activeId: number;
    maxActiveBinSlippage: number;
    shouldClaimFee: boolean;
    shouldClaimReward: boolean;
    minWithdrawXAmount: bignum;
    maxDepositXAmount: bignum;
    minWithdrawYAmount: bignum;
    maxDepositYAmount: bignum;
    shrinkMode: number;
    padding: Array<number>;
    removes: Array<RemoveLiquidityParamsType>;
    adds: Array<AddLiquidityParamsType>;
  }
  
export const RebalanceLiquidityParams =
    new FixableBeetArgsStruct<RebalanceLiquidityParamsType>(
        [
            ["activeId", i32],
            ["maxActiveBinSlippage", u16],
            ["shouldClaimFee", bool],
            ["shouldClaimReward", bool],
            ["minWithdrawXAmount", u64],
            ["maxDepositXAmount", u64],
            ["minWithdrawYAmount", u64],
            ["maxDepositYAmount", u64],
            ["shrinkMode", u8],
            ["padding", uniformFixedSizeArray(u8, 31)],
            ["removes", array(RemoveLiquidityParams)],
            ["adds", array(AddLiquidityParams)],
        ],
        "rebalanceLiquidityParams"
    )
  
/* -------------------------------------------------------------------------- */
/*                           RemainingAccountsInfo                            */
/* -------------------------------------------------------------------------- */
  
export interface RemainingAccountsInfoType {
    slices: Array<number>;
  }
  
export const RemainingAccountsInfoArgs =
    new FixableBeetArgsStruct<RemainingAccountsInfoType>(
        [["slices", array(u8)]],
        "remainingAccountsInfo"
    )
  
/* -------------------------------------------------------------------------- */
/*                               RebalanceArgs                                */
/* -------------------------------------------------------------------------- */
  
export interface RebalanceLiquidityArgsType {
    params: RebalanceLiquidityParamsType;
    remainingAccountsInfo: RemainingAccountsInfoType;
  }
  
export const RebalanceLiquidityArgs =
    new FixableBeetArgsStruct<RebalanceLiquidityArgsType>(
        [
            ["params", RebalanceLiquidityParams],
            ["remainingAccountsInfo", RemainingAccountsInfoArgs],
        ],
        "rebalanceLiquidityArgs"
    )