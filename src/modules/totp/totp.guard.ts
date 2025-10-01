import { 
    CanActivate, 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException
} from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { TotpService } from "./totp.service"
import { UserJwtLike } from "@modules/passport"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class GraphQLTOTPGuard implements CanActivate {
    constructor(
        private readonly totpService: TotpService,
        private readonly encryptionService: EncryptionService,
    ) {}

    async canActivate(
        context: ExecutionContext): Promise<boolean> {
        const request = GqlExecutionContext.create(context).getContext().req
        const totpCode = request.headers["x-totp"]
        if (!totpCode) {
            throw new UnauthorizedException("TOTP code is required")
        }
        const user = request.user as UserJwtLike
        if (!user.encryptedTotpSecret) {
            throw new UnauthorizedException("Encrypted TOTP secret is required in JWT payload")
        }
        const decryptedTotpSecret = this.encryptionService.decrypt(user.encryptedTotpSecret)
        const verified = this.totpService.verifyTotp(totpCode, decryptedTotpSecret)
        if (!verified) {
            throw new UnauthorizedException("Invalid TOTP code")
        }
        return true
    }
}