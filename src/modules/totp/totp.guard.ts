import { 
    CanActivate, 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException
} from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { TotpService } from "./totp.service"
import { UserJwtLike } from "@modules/passport"
import { DerivedAesKeyService } from "@modules/derived"
import {
    InvalidTOTPCodeException
} from "@modules/exceptions"

@Injectable()
export class GraphQLTOTPGuard implements CanActivate {
    constructor(
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) {}

    async canActivate(
        context: ExecutionContext): Promise<boolean> {
        const request = GqlExecutionContext.create(context).getContext().req
        const totpCode = request.headers["x-totp"]
        if (!totpCode) {
            throw new UnauthorizedException("TOTP code is required")
        }
        const user = request.user as UserJwtLike
        if (!user.encryptedTotpSecretPayload) {
            throw new UnauthorizedException("Encrypted TOTP secret is required in JWT payload")
        }
        const decryptedTotpSecret = this.derivedAesKeyService.decrypt(user.encryptedTotpSecretPayload)
        const verified = this.totpService.verifyTotp(totpCode, decryptedTotpSecret)
        if (!verified) {
            throw new InvalidTOTPCodeException({
                id: user.id,
            })
        }
        return true
    }
}