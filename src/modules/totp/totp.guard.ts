import { 
    CanActivate, 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException
} from "@nestjs/common"
import {
    GqlExecutionContext 
} from "@nestjs/graphql"
import {
    TotpService 
} from "./totp.service"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    InvalidTOTPCodeException,
    UserNotFoundException,
    UserTotpSecretNotFoundException
} from "@modules/exceptions"
import {
    InjectPrimaryMongoose, UserSchema 
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

/**
 * The GraphQL TOTP guard.
 */
@Injectable()
export class GraphQLTOTPGuard implements CanActivate {
    constructor(
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    /**
     * Check if the request is authorized.
     * @param context - The execution context.
     * @returns True if the request is authorized, false otherwise.
     */
    async canActivate(
        context: ExecutionContext): Promise<boolean> {
        try {
            const request = GqlExecutionContext.create(context).getContext().req
            const totpCode = request.headers["x-totp"]
            if (!totpCode) {
                throw new UnauthorizedException("TOTP code is required")
            }
            const user = request.user as VerifyAccessTokenResponse
            const userDoc = await this.connection.model<UserSchema>(UserSchema.name).findOne(
                {
                    privyUserId: user.user_id,
                }
            )
            if (!userDoc) {
                throw new UserNotFoundException({
                    privyUserId: user.user_id,
                })
            }
            if (!userDoc.encryptedTotpSecretPayload) {
                throw new UserTotpSecretNotFoundException({
                    id: userDoc.id,
                })
            }
            const decryptedTotpSecret = this.derivedAesKeyService.decrypt(userDoc.encryptedTotpSecretPayload)
            const verified = this.totpService.verifyTotp(totpCode,
                decryptedTotpSecret)
            if (!verified) {
                throw new InvalidTOTPCodeException(
                    {
                        id: userDoc.id,
                    }
                )
            }
            return true
        } catch (error) {
            // friendly throw error
            throw new UnauthorizedException(error.message)
        }
    }
}