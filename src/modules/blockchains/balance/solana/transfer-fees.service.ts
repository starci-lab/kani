import {
    Injectable,
} from "@nestjs/common"
import {
    PrepareTransferFeesTransactionParams,
    PrepareTransferFeesTransactionResult,
} from "../types"
import {
    FeeToAddressNotFoundException,
    FeeRateNotValidException,
    TokenNotFoundException,
    FeeRateNotSetException,
} from "@modules/exceptions"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    MountStorageService,
} from "@modules/filesystem"
import {
    TransferInstructionService,
} from "../../tx-builder"
import {
    ChainId,
} from "@modules/common"
import {
    InjectSuperJson,
} from "@modules/mixin"
import {
    address,
    Instruction,
} from "@solana/kit"
import {
    SuperJSON,
} from "superjson"  
import BN from "bn.js"

/**
 * Service for preparing transfer fees transactions on Solana.
 * Computes fee as ROI (feeRate) of current target token balance and transfers to feeToAddress.
 *
 * @example
 * const result = await service.prepare({ bot, feeAmountTarget, feeAmountQuote })
 */
@Injectable()
export class SolanaTransferFeesService {
    constructor(
        private readonly mountStorageService: MountStorageService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly transferInstructionService: TransferInstructionService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * Prepares a transfer fees transaction (ROI of target token to feeToAddress).
     *
     * @param param - Bot and current target token balance amount
     * @returns Prepared transaction and fee amount, or empty if feeRate/feeToAddress missing or fee is zero
     */
    public async prepare({
        bot,
        feeAmountTarget,
        feeAmountQuote,
    }: PrepareTransferFeesTransactionParams): Promise<PrepareTransferFeesTransactionResult> {
        const feeRate = this.mountStorageService.appConfig.fees?.feeRate
        if (!feeRate) {
            throw new FeeRateNotSetException({
                chainId: ChainId.Solana,
            })
        }
        if (feeRate <= 0) {
            throw new FeeRateNotValidException({
                chainId: ChainId.Solana,
            })
        }
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.targetToken.toString() 
                },
            }
        )
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString() 
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: bot.quoteToken.toString() 
                },
            }
        )
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString() 
            })
        }
        const feeToAddress = this.mountStorageService.appConfig.fees?.openPosition?.solana?.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException(
                {
                    chainId: ChainId.Solana,
                }
            )
        }
        // if fee amount is less than 0, return empty
        if (feeAmountTarget.lt(new BN(0)) || feeAmountQuote.lt(new BN(0))) {
            return {
                prepareTxs: [],
                feeAmountTarget: new BN(0),
                feeAmountQuote: new BN(0),
            }
        }
        const instructions: Array<Instruction> = []
        const { instructions: transferTargetFeesInstructions } = await this.transferInstructionService.createTransferInstructions({
            fromAddress: address(bot.accountAddress),
            toAddress: address(feeToAddress),
            amount: feeAmountQuote,
            token: targetToken,
        })
        instructions.push(...transferTargetFeesInstructions)
        const { instructions: transferQuoteFeesInstructions } = await this.transferInstructionService.createTransferInstructions({
            fromAddress: address(bot.accountAddress),
            toAddress: address(feeToAddress),
            amount: feeAmountQuote,
            token: quoteToken,
        })
        instructions.push(...transferQuoteFeesInstructions)
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(instructions),
                },
            ],
            feeAmountTarget,
            feeAmountQuote,
        }
    }
}
