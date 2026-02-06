import {
    Injectable
} from "@nestjs/common"
import {
    Connection
} from "mongoose"
import {
    BotSchema,
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    DayjsService
} from "@modules/mixin"
import {
    UpdateBotSnapshotBalancesRecordParams,
    UpdateBotSnapshotBalancesRecordResult
} from "./types"

/**
 * Service responsible for updating bot balance snapshot records.
 *
 * @example
 * await balanceSnapshotService.updateBotSnapshotBalancesRecord({ bot, targetBalanceAmount, ... })
 */
@Injectable()
export class BalanceSnapshotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Updates the balance snapshot fields for a bot (target, quote, gas, incentives).
     *
     * @param param - Bot and balance amounts to persist
     * @returns Resolves when the update completes
     *
     * @example
     * await service.updateBotSnapshotBalancesRecord({ bot, targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount })
     */
    async updateBotSnapshotBalancesRecord({
        bot,
        targetBalanceAmount,
        quoteBalanceAmount,
        gasBalanceAmount,
        incentiveBalanceAmounts,
        session,
    }: UpdateBotSnapshotBalancesRecordParams): Promise<UpdateBotSnapshotBalancesRecordResult> {
        // convert Record<string, BN> -> Record<string, string>
        const incentiveObj: Record<string, string> | null =
            incentiveBalanceAmounts
                ? Object.fromEntries(
                    Object.entries(incentiveBalanceAmounts).map(([k,
                        v]) => [
                        k,
                        v.toString(),
                    ])
                )
                : null

        // build update payload for balance snapshot fields
        const $set = {
            "balanceSnapshots.targetBalanceAmount": targetBalanceAmount.toString(),
            "balanceSnapshots.quoteBalanceAmount": quoteBalanceAmount.toString(),
            "balanceSnapshots.gasBalanceAmount": gasBalanceAmount.toString(),
            "balanceSnapshots.snapshotAt": this.dayjsService.now().toDate(),
        }

        // only override incentiveSnapshots when incentive amounts provided
        if (incentiveObj && Object.keys(incentiveObj).length > 0) {
            $set["balanceSnapshots.incentiveSnapshots"] = {
                $map: {
                    input: "$balanceSnapshots.incentiveSnapshots",
                    as: "i",
                    in: {
                        $cond: [
                            {
                                $in: [
                                    {
                                        $toString: "$$i.token" 
                                    },
                                    Object.keys(incentiveObj)],
                            },
                            {
                                token: "$$i.token",
                                amount: {
                                    $getField: {
                                        field: {
                                            $toString: "$$i.token" 
                                        },
                                        input: incentiveObj,
                                    },
                                },
                            },
                            "$$i",
                        ],
                    },
                },
            }
        }

        // persist balance snapshot to bot document
        await this.connection.model(BotSchema.name).updateOne(
            {
                _id: bot.id 
            },
            [
                {
                    $set,
                },
            ],
            {
                session 
            }
        )
    }
}