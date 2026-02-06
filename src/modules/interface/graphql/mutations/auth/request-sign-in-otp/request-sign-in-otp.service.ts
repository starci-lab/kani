import {
    Injectable 
} from "@nestjs/common"
import {
    RequestSignInOtpRequest 
} from "./graphql-types"
import {
    SendSignInOtpMailService 
} from "@modules/mail"
import {
    CodeGeneratorService 
} from "@modules/code"
import {
    CacheService 
} from "@modules/cache"
import {
    CacheKey 
} from "@modules/cache"

@Injectable()
export class RequestSignInOtpService {
    constructor(
        private readonly cacheService: CacheService,
        private readonly sendSignInOtpMailService: SendSignInOtpMailService,
        private readonly codeGeneratorService: CodeGeneratorService,
    ) {}

    async requestSignInOtp(
        {
            email,
        }: RequestSignInOtpRequest
    ): Promise<void> {
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheService.set(
            {
                key: CacheKey.SendOtpCode,
                args: [email],
                cacheResult: {
                    otp,
                },
            }
        )
        await this.sendSignInOtpMailService.send({
            email,
            otp,
        })
    }
}

