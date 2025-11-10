import { Injectable } from "@nestjs/common"
import { InjectMongoose, SessionSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { ConfirmTotpResponseData, RefreshResponseData } from "./auth.dto"
import { JwtAuthService, UserJwtLike } from "@modules/passport"
import { 
    UserNotFoundException,
    UserTotpSecretNotFoundException,
    SessionNotFoundException
} from "@modules/errors"

@Injectable()
export class AuthService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly jwtAuthService: JwtAuthService,
    ) {}

    async confirmTotp(
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
        const { accessToken, refreshToken } = await this.jwtAuthService.generate({
            id: user.id,
            totpVerified: true,
            encryptedTotpSecret: user.encryptedTotpSecret,
        })
        return { accessToken, refreshToken }
    }

    async refresh(
        userLike: UserJwtLike,
    ): Promise<RefreshResponseData> {
        // try first in cache
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException()
        }
        // if not found, try in database
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException()
        }
        const sessionExists = await this.connection
            .model<SessionSchema>(SessionSchema.name)
            .exists({ user: userLike.id })
        if (!sessionExists) {
            throw new SessionNotFoundException()
        }
        return this.jwtAuthService.generate({
            id: user.id,
            totpVerified: user.totpVerified || false,
            encryptedTotpSecret: user.encryptedTotpSecret,
        }) 
    }
}