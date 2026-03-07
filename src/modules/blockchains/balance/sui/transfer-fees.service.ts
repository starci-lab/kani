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
    SelectCoinsService,
} from "../../tx-builder"
import {
    Transaction,
} from "@mysten/sui/transactions"
import {
    ChainId,
    isSuiCoin,
} from "@modules/common"
import BN from "bn.js"
import {
    Decimal,
} from "decimal.js"

/**
 * Service for preparing transfer fees transactions on Sui.
 * Computes fee as ROI (feeRate) of current target token balance and transfers to feeToAddress.
 *
 * @example
 * const result = await service.prepare({ bot, currentTargetBalanceAmount })
 */
@Injectable()
export class SuiTransferFeesService {
    constructor(
        private readonly mountStorageService: MountStorageService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly selectCoinsService: SelectCoinsService,
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

        const feeToAddress = this.mountStorageService.appConfig.fees?.openPosition?.sui?.feeToAddress
        if (!feeToAddress) {
            return { prepareTxs: [], feeAmount: new BN(0) }
        }

        const txb = new Transaction()
        txb.setSender(bot.accountAddress)

        const suiGasAmount = isSuiCoin(targetToken.tokenAddress)
            ? new BN(
                this.mountStorageService.appConfig.gas?.gasAmountRequired?.[ChainId.Sui]?.targetOperationalAmount ?? 0,
            )
            : undefined

        const { sourceCoin } = await this.selectCoinsService.fetchAndMergeCoins({
            txb,
            owner: bot.accountAddress,
            coinType: targetToken.tokenAddress,
            requiredAmount: feeAmount,
            suiGasAmount,
        })

        txb.transferObjects([sourceCoin.coinArg], feeToAddress)

        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await txb.toJSON(),
                },
            ],
            feeAmount,
        }
    }
}
