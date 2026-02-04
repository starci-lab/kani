import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    AppVersion,
    BotSchema,
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    BotNotFoundException,
    BotNotOwnedByUserException,
    BotNotV2Exception,
    UserNotFoundException,
} from "@modules/exceptions"
import {
    VerifyAccessTokenResponse
} from "@privy-io/node"
import {
    WithdrawV2Request
} from "./withdraw-v2.dto"
import {
    AxiosService
} from "@modules/axios"
import {
    restConfig, buildExecutorFullEndpointPath
} from "@modules/executor"
import {
    AxiosInstance,
    AxiosResponse
} from "axios"
import {
    AddWithdrawJobResponseDataDto, AddWithdrawJobRequestDto
} from "@modules/executor"

@Injectable()
export class WithdrawV2Service implements OnModuleInit {
    private axiosInstance: AxiosInstance
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly axiosService: AxiosService,
    ) { }

    onModuleInit() {
        this.axiosInstance = this.axiosService.create("executor")
    }

    async withdrawV2(
        response: VerifyAccessTokenResponse,
        {
            id,
            tokenInputs,
        }: WithdrawV2Request,
    ) {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id,
            })
        if (!user) {
            throw new UserNotFoundException({
                privyUserId: response.user_id,
            })
        }
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException({
                id,
            })
        }
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException(
                {
                    id,
                    userId: user.id,
                }
            )
        }
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception({
                id,
            })
        }
        const { data } = await this.axiosInstance.post<
            AddWithdrawJobResponseDataDto,
            AxiosResponse<AddWithdrawJobResponseDataDto>,
            AddWithdrawJobRequestDto
        >(
            buildExecutorFullEndpointPath(
                {
                    tags: restConfig().jobs().tags,
                    api: restConfig().jobs().api().addWithdrawJob.path,
                    bot,
                }
            ),
            {
                tokenInputs,
            },
        )
        const { jobId } = data
        return {
            jobId,
        }
    }
}
