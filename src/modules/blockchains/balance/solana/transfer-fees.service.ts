import {
    Injectable,
} from "@nestjs/common"
import {
    PrepareTransferFeesTransactionParams,
    PrepareTransferFeesTransactionResult,
} from "../types"
import {
    TokenNotFoundException,
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
} from "@solana/kit"
import {
    SuperJSON,
} from "superjson"
import BN from "bn.js"
import {
    Decimal,
} from "decimal.js"

/**
 * Service for preparing transfer fees transactions on Solana.
 * Computes fee as ROI (feeRate) of current target token balance and transfers to feeToAddress.
 *
 * @example
 * const result = await service.prepare({ bot, currentTargetBalanceAmount })
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
        currentTargetBalanceAmount,
    }: PrepareTransferFeesTransactionParams): Promise<PrepareTransferFeesTransactionResult> {
        const feeRate = this.mountStorageService.appConfig.fees?.feeRate ?? 0
        if (feeRate <= 0) {
            return { prepareTxs: [], feeAmount: new BN(0) }
        }

        const feeAmountDecimal = new Decimal(currentTargetBalanceAmount.toString()).mul(feeRate).floor()
        let feeAmount = new BN(feeAmountDecimal.toFixed(0))
        if (feeAmount.gt(currentTargetBalanceAmount)) {
            feeAmount = currentTargetBalanceAmount
        }
        if (feeAmount.lte(new BN(0))) {
            return { prepareTxs: [], feeAmount: new BN(0) }
        }

        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: { $eq: bot.targetToken.toString() },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({ id: bot.targetToken.toString() })
        }

        const feeToAddress = this.mountStorageService.appConfig.fees?.openPosition?.solana?.feeToAddress
        if (!feeToAddress) {
            return { prepareTxs: [], feeAmount: new BN(0) }
        }

        const { instructions } = await this.transferInstructionService.createTransferInstructions({
            fromAddress: address(bot.accountAddress),
            toAddress: address(feeToAddress),
            amount: feeAmount,
            token: targetToken,
        })

        return {
            prepareTxs: [
                {
                    chainId: ChainId.Solana,
                    serializedTx: this.superJson.stringify(instructions),
                },
            ],
            feeAmount,
        }
    }
}
