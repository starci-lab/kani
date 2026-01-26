import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    UserJwtLike 
} from "@modules/passport"
import {
    UserNotFoundException,
} from "@modules/exceptions"
import {
    Send2FactorOtpMailService 
} from "@modules/mail"
import {
    CodeGeneratorService 
} from "@modules/code"
import {
    CacheKey,
    CacheService
} from "@modules/cache"

@Injectable()
export class RequestSend2FactorOtpService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly cacheService: CacheService,
        private readonly send2FactorOtpMailService: Send2FactorOtpMailService,
        private readonly codeGeneratorService: CodeGeneratorService,
    ) {}

    async requestSend2FactorOtp(
        userLike: UserJwtLike
    ): Promise<void> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException({
                userId: userLike.id,
            })
        }
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheService.set(
            {
                key: CacheKey.SendOtpCode,
                args: [user.email],
                cacheResult: {
                    otp,
                },
            }
        )   
        await this.send2FactorOtpMailService.send({
            email: user.email,
            otp,
        })
    }
}

