import {
    Injectable 
} from "@nestjs/common"
import {
    AccountRole,
    address,
    Instruction,
} from "@solana/kit"
import {
    AtaInstructionService, AnchorUtilsService, KeypairGeneratorsService 
} from "../../../tx-builder"
import {
    MeteoraLiquidityPoolMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    i32, BeetArgsStruct 
} from "@metaplex-foundation/beet"
import { 
    buildLiquidityStrategyParameters, 
    getBinCount, 
    getLiquidityStrategyParameterBuilder, 
    getPositionCountByBinCount, 
    StrategyType
} from "@meteora-ag/dlmm"
import {
    DlmmLiquidityPoolState 
} from "../../types"
import Decimal from "decimal.js"
import BN from "bn.js"
import {
    InvalidPoolTokensException, LiquidityPoolDlmmStateNotFoundException, MeteoraMultipleDlmmPositionsNotSupportedException 
} from "@modules/exceptions"
import {
    getTransferSolInstruction, SYSTEM_PROGRAM_ADDRESS 
} from "@solana-program/system"
import {
    SYSVAR_RENT_ADDRESS 
} from "@solana/sysvars"
import {
    EventAuthorityService 
} from "./event-authority.service"
import {
    createNoopSigner 
} from "@solana/signers"
import {
    MeteoraSdkService 
} from "./sdk.service"
import {
    FeeService 
} from "../../../math"
import {
    getTransferInstruction as getTransferInstruction2022 
} from "@solana-program/token-2022"
import {
    getTransferInstruction 
} from "@solana-program/token"
import {
    TokenType 
} from "@modules/common"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    CreateOpenPositionInstructionsParams,
    CreateOpenPositionInstructionsResult
} from "../types"

/**
 * Service responsible for creating open position instructions for Meteora.
 * Handles instruction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionInstructionService(...)
 * const result = await service.createOpenPositionInstructions({ bot, state, amountA, amountB })
 */
@Injectable()
export class OpenPositionInstructionService {
    constructor(
        private readonly eventAuthorityService: EventAuthorityService,
        private readonly ataInstructionService: AtaInstructionService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly keypairGeneratorsService: KeypairGeneratorsService,
        private readonly anchorUtilsService: AnchorUtilsService,
        private readonly meteoraSdkService: MeteoraSdkService,
        private readonly feeService: FeeService,
        private readonly mountStorageService: MountStorageService,
    ) { }
    /**
     * Creates open position instructions for Meteora.
     * @param bot - The bot.
     * @param state - The state.
     * @param amountA - The amount of token A.
     * @param amountB - The amount of token B.
     * @returns The open position instructions.
     */
    async createOpenPositionInstructions({
        bot,
        state,
        amountA,
        amountB,
    }: CreateOpenPositionInstructionsParams)
    : Promise<CreateOpenPositionInstructionsResult>
    {
        const _state = state as DlmmLiquidityPoolState
        if (!_state.static.dlmmState) {
            throw new LiquidityPoolDlmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const {
            feeAmount: feeAmountA,
            remainingAmount: remainingAmountA,
        } = this.feeService.splitAmount({
            amount: amountA,
            chainId: bot.chainId,
        })
        const {
            feeAmount: feeAmountB,
            remainingAmount: remainingAmountB,
        } = this.feeService.splitAmount({
            amount: amountB,
            chainId: bot.chainId,
        })
        const metadata = state.static.metadata as MeteoraLiquidityPoolMetadata
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
        // transfer the fees to the fee address
        const feeToAddress = this.mountStorageService.appConfig.fees.openPosition.solana.feeToAddress
        const instructions: Array<Instruction> = []
        // if A or B is sol, we must transfer the fees to the fee address
        if (tokenA.type === TokenType.Native) {
            instructions.push(
                getTransferSolInstruction({
                    source: createNoopSigner(address(bot.accountAddress)),
                    destination: address(feeToAddress),
                    amount: BigInt(feeAmountA.toString()),
                }))
        }
        if (tokenB.type === TokenType.Native) {
            instructions.push(
                getTransferSolInstruction({
                    source: createNoopSigner(address(bot.accountAddress)),
                    destination: address(feeToAddress),
                    amount: BigInt(feeAmountB.toString()),
                }))
        }
        const endInstructions: Array<Instruction> = []
        const minBinId = _state.dynamic.activeId.sub(new BN(_state.static.dlmmState.binOffset))
        const maxBinId = _state.dynamic.activeId.add(new BN(_state.static.dlmmState.binOffset))
        const binCount = getBinCount(minBinId.toNumber(),
            maxBinId.toNumber())
        const positionCount = getPositionCountByBinCount(binCount)
        if (positionCount > 1) {
            throw new MeteoraMultipleDlmmPositionsNotSupportedException({
                positionCount,
                liquidityPoolId: state.static.displayId,
            })
        }
        const positionKeyPairs = await this.keypairGeneratorsService.generateKeypairs(positionCount)
        // we only support one position at a time
        const positionKeyPair = positionKeyPairs[0]
        const liquidityStrategyParameters = buildLiquidityStrategyParameters(
            remainingAmountA,
            remainingAmountB,
            minBinId.sub(state.dynamic.activeId),
            maxBinId.sub(state.dynamic.activeId),
            new BN(_state.static.dlmmState.binStep),
            false,
            _state.dynamic.activeId,
            getLiquidityStrategyParameterBuilder(StrategyType.Curve)
        )
        const {
            instructions: createAtaAInstructions,
            endInstructions: closeAtaAInstructions,
            ataAddress: ataAAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenA.is2022Token,
            amount: remainingAmountA,
        })
        if (createAtaAInstructions?.length) {
            instructions.push(...createAtaAInstructions)
        }
        if (closeAtaAInstructions?.length) {
            endInstructions.push(...closeAtaAInstructions)
        }
        const {
            instructions: createAtaBInstructions,
            endInstructions: closeAtaBInstructions,
            ataAddress: ataBAddress,
        } = await this.ataInstructionService.getOrCreateAtaInstructions({
            tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
            ownerAddress: address(bot.accountAddress),
            is2022Token: tokenB.is2022Token,
            amount: remainingAmountB,
        })
        if (createAtaBInstructions?.length) {
            instructions.push(...createAtaBInstructions)
        }
        if (closeAtaBInstructions?.length) {
            endInstructions.push(...closeAtaBInstructions)
        }
        const getTransferAInstruction = tokenA.is2022Token ? getTransferInstruction2022 : getTransferInstruction
        const getTransferBInstruction = tokenB.is2022Token ? getTransferInstruction2022 : getTransferInstruction
        // if A and B is not sol, we must transfer the fees to the fee address
        if (tokenA.type !== TokenType.Native) {
            const {
                instructions: createAtaAInstructions,
                ataAddress: feeToAAtaAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                ownerAddress: address(feeToAddress),
                tokenMint: tokenA.tokenAddress ? address(tokenA.tokenAddress) : undefined,
                is2022Token: tokenA.is2022Token,
                amount: feeAmountA,
            })
            if (createAtaAInstructions?.length) {
                instructions.push(...createAtaAInstructions)
            }
            instructions.push(
                getTransferAInstruction({
                    source: ataAAddress,
                    destination: feeToAAtaAddress,
                    amount: BigInt(feeAmountA.toString()),
                    authority: address(bot.accountAddress),
                }))
        }
        if (tokenB.type !== TokenType.Native) {
            const {
                instructions: createAtaBInstructions,
                ataAddress: feeToBAtaAddress,
            } = await this.ataInstructionService.getOrCreateAtaInstructions({
                ownerAddress: address(feeToAddress),
                tokenMint: tokenB.tokenAddress ? address(tokenB.tokenAddress) : undefined,
                is2022Token: tokenB.is2022Token,
                amount: feeAmountB,
            })
            if (createAtaBInstructions?.length) {
                instructions.push(...createAtaBInstructions)
            }
            instructions.push(
                getTransferBInstruction({
                    source: ataBAddress,
                    destination: feeToBAtaAddress,
                    amount: BigInt(feeAmountB.toString()),
                    authority: address(bot.accountAddress),
                })
            )
        }
        const { pda: eventAuthorityPda } = await this.eventAuthorityService.getPda({
            programAddress: address(metadata.programAddress),
        })
        const [
            openPositionArgs
        ] = OpenPositionArgs.serialize({
            lowerBinId: minBinId.toNumber(),
            width: binCount,
        })
        const initializePositionInstruction: Instruction = {
            programAddress: address(metadata.programAddress),
            accounts: [
                // payer
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // position owner
                {
                    address: address(positionKeyPair.address),
                    role: AccountRole.WRITABLE_SIGNER,
                },
                // pool address
                {
                    address: address(state.static.poolAddress),
                    role: AccountRole.WRITABLE,
                },
                // owner
                {
                    address: address(bot.accountAddress),
                    role: AccountRole.WRITABLE,
                },
                // system program
                {
                    address: SYSTEM_PROGRAM_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // rent 
                {
                    address: SYSVAR_RENT_ADDRESS,
                    role: AccountRole.READONLY,
                },
                // event authority
                {
                    address: address(eventAuthorityPda),
                    role: AccountRole.READONLY,
                },
                // dlmm metadata program
                {
                    address: address(metadata.programAddress),
                    role: AccountRole.READONLY,
                },
            ],
            data: this.anchorUtilsService.encodeAnchorIx(
                {
                    ixName: "initialize_position",
                    data: openPositionArgs,
                }
            ),
        }
        instructions.push(initializePositionInstruction)
        const slippagePercentage = new Decimal(envConfig().dexes.meteora.openPosition.slippage)
        const depositWithRebalanceEndpointInstructions 
        = await this.meteoraSdkService.depositWithRebalanceEndpoint({
            bot,
            state,
            strategy: {
                minBinId: minBinId.toNumber(),
                maxBinId: maxBinId.toNumber(),
                strategyType: StrategyType.Spot,
                singleSidedX: false,
            },
            slippagePercentage: slippagePercentage.toNumber(),
            maxActiveBinSlippage: slippagePercentage.toNumber(),
            positionAddress: address(positionKeyPair.address),
            positionMinBinId: minBinId.toNumber(),
            positionMaxBinId: maxBinId.toNumber(),
            liquidityStrategyParameters,
            ataAddressA: ataAAddress,
            ataAddressB: ataBAddress,
        })
        instructions.push(...depositWithRebalanceEndpointInstructions) 
        instructions.push(...endInstructions) 
        return {
            instructions,
            positionKeyPair,
            minBinId,
            maxBinId,
            feeAmountA,
            feeAmountB,
        }
    }
}
export const OpenPositionArgs = new BeetArgsStruct(
    [
        ["lowerBinId",
            i32],
        ["width",
            i32],
    ],
    "OpenPositionArgs"
)
