import {
    Injectable,
} from "@nestjs/common"
import {
    PrepareTransferFeesTransactionParams,
    PrepareTransferFeesTransactionResult,
} from "../types"
import {
    TokenNotFoundException,
    FeeRateNotSetException,
    FeeRateNotValidException,
    FeeToAddressNotFoundException,
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
        feeAmountTarget,
        feeAmountQuote,
    }: PrepareTransferFeesTransactionParams): Promise<PrepareTransferFeesTransactionResult> {
        const feeRate = this.mountStorageService.appConfig.fees?.feeRate
        if (!feeRate) {
            throw new FeeRateNotSetException({
                chainId: ChainId.Sui,
            })
        }
        if (feeRate <= 0) {
            throw new FeeRateNotValidException({
                chainId: ChainId.Sui,
            })
        }

        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString() 
            },
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString() 
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString() 
            },
        })

        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString() 
            })
        }

        const feeToAddress = this.mountStorageService.appConfig.fees?.openPosition?.sui?.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException({
                chainId: ChainId.Sui,
            })
        }

        const txb = new Transaction()
        txb.setSender(bot.accountAddress)

        const suiGasAmount = isSuiCoin(targetToken.tokenAddress)
            ? new BN(
                this.mountStorageService.appConfig.gas?.gasAmountRequired?.[ChainId.Sui]?.targetOperationalAmount ?? 0,
            )
            : undefined

        const { sourceCoin: sourceCoinTarget } = await this.selectCoinsService.fetchAndMergeCoins({
            txb,
            owner: bot.accountAddress,
            coinType: targetToken.tokenAddress,
            requiredAmount: feeAmountTarget,
            suiGasAmount,
        })
        const { sourceCoin: sourceCoinQuote } = await this.selectCoinsService.fetchAndMergeCoins({
            txb,
            owner: bot.accountAddress,
            coinType: quoteToken.tokenAddress,
            requiredAmount: feeAmountQuote,
            suiGasAmount,
        })

        txb.transferObjects(
            [
                sourceCoinTarget.coinArg, 
                sourceCoinQuote.coinArg
            ],
            feeToAddress
        )
        return {
            prepareTxs: [
                {
                    chainId: ChainId.Sui,
                    serializedTx: await txb.toJSON(),
                },
            ],
            feeAmountTarget,
            feeAmountQuote,
        }
    }
}
