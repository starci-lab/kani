import {
    Injectable 
} from "@nestjs/common"
import {
    Connection 
} from "mongoose"
import {
    BotSchema, InjectPrimaryMongoose 
} from "@modules/databases"
import {
    DayjsService 
} from "@modules/mixin"
import {
    UpdateBotSnapshotBalancesRecordParams 
} from "./types"

@Injectable()
export class BalanceSnapshotService {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly dayjsService: DayjsService,
    ) {}

    async updateBotSnapshotBalancesRecord({
        bot,
        targetBalanceAmount,
        quoteBalanceAmount,
        gasBalanceAmount,
        incentiveBalanceAmounts,
        session,
    }: UpdateBotSnapshotBalancesRecordParams) {

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

        const stages = {
            "balanceSnapshots.targetBalanceAmount": targetBalanceAmount.toString(),
            "balanceSnapshots.quoteBalanceAmount": quoteBalanceAmount.toString(),
            "balanceSnapshots.gasBalanceAmount": gasBalanceAmount.toString(),
            "balanceSnapshots.snapshotAt": this.dayjsService.now().toDate(),
        }
        // only override incentiveSnapshots if there are incentiveBalanceAmounts
        if (incentiveObj && Object.keys(incentiveObj).length > 0) {
            stages["balanceSnapshots.incentiveSnapshots"] = {
                $map: {
                    input: "$balanceSnapshots.incentiveSnapshots",
                    as: "i",
                    in: {
                        $cond: [
                            {
                                $in: [{
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

        await this.connection.model(BotSchema.name).updateOne(
            {
                _id: bot.id 
            },
            [
                {
                    $set: stages,
                },
            ],
            {
                session 
            }
        )
    }
}