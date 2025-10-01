import { Injectable } from "@nestjs/common"
import { InjectMongoose, SessionSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { ConfirmTotpRequest, ConfirmTotpResponseData, RefreshResponseData } from "./auth.dto"
import { JwtAuthService, UserJwtLike } from "@modules/passport"
import { 
    UserNotFoundException, 
    UserTotpSecretNotFoundException, 
    TOTPCodeNotVerifiedException,
    SessionNotFoundException
} from "@modules/errors"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"
import { CacheKey, CacheManagerService, createCacheKey } from "@modules/cache"

@Injectable()
export class AuthService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly jwtAuthService: JwtAuthService,
        private readonly totpService: TotpService,
        private readonly encryptionService: EncryptionService,
        private readonly cacheManagerService: CacheManagerService,
    ) {}

    async confirmTotp(
        request: ConfirmTotpRequest,
        userLike: UserJwtLike,
    ): Promise<ConfirmTotpResponseData> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException()
        }
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException()
        }
        // if the user not verified, set the totpVerified to true
        if (!user.totpVerified) {
            await this.connection.model<UserSchema>(UserSchema.name).updateOne({
                id: userLike.id,
            }, {
                $set: {
                    totpVerified: true,
                },
            })
        }
        const verified = this.totpService.verifyTotp(
            request.totpCode,
            this.encryptionService.decrypt(user.encryptedTotpSecret),
        )
        if (!verified) {
            throw new TOTPCodeNotVerifiedException()
        }
        const { accessToken, refreshToken } = await this.jwtAuthService.generate({
            id: user.id,
            totpVerified: true,
        })
        return { accessToken, refreshToken }
    }

    async refresh(
        userLike: UserJwtLike,
    ): Promise<RefreshResponseData> {
        // try first in cache
        const sessionCheck = await this.cacheManagerService.get<boolean>(
            createCacheKey(CacheKey.SessionId, userLike.id),
        )
        // if not found, try in database
        if (!sessionCheck) {
            const sessionExists = await this.connection
                .model<SessionSchema>(SessionSchema.name)
                .exists({ user: userLike.id })
            if (!sessionExists) {
                throw new SessionNotFoundException()
            }
        }
        return this.jwtAuthService.generate({
            id: userLike.id,
            totpVerified: userLike.totpVerified,
        }) 
    }
}