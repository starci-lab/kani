import {
    Injectable 
} from "@nestjs/common"
import {
    AppVersion, InjectPrimaryMongoose, UserSchema 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"
import {
    CodeGeneratorService 
} from "@modules/code"

@Injectable()
export class UserV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly codeGeneratorService: CodeGeneratorService,
    ) {}

    async userV2(
        response: VerifyAccessTokenResponse
    ): Promise<UserSchema> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({
                privyUserId: response.user_id 
            })
        if (!user) {
            // create the user
            const [userRaw] = await this.connection
                .model<UserSchema>
                (UserSchema.name)
                .create([{
                    privyUserId: response.user_id,
                    version: AppVersion.V2,
                    referralCode: this.codeGeneratorService.generateCode("KANI"),
                }])
            return userRaw.toJSON<UserSchema>()
        }
        return user.toJSON<UserSchema>()
    }
}

