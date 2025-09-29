import { Injectable } from "@nestjs/common"
import { InjectMongoose, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { ConfirmTotpRequest, ConfirmTotpResponse } from "./auth.dto"
import { JwtAuthService, UserLike } from "@modules/passport"
import { 
    UserNotFoundException, 
    UserTotpSecretNotFoundException, 
    TOTPCodeNotVerifiedException 
} from "@modules/errors"
import { TotpService } from "@modules/totp"
import { EncryptionService } from "@modules/crypto"

@Injectable()
export class AuthService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly jwtAuthService: JwtAuthService,
        private readonly totpService: TotpService,
        private readonly encryptionService: EncryptionService,
    ) {}

    async confirmTotp(
        request: ConfirmTotpRequest,
        userLike: UserLike,
    ): Promise<ConfirmTotpResponse> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
            .select("encryptedTotpSecret")
            .lean()
        if (!user) {
            throw new UserNotFoundException()
        }
        if (!user.encryptedTotpSecret) {
            throw new UserTotpSecretNotFoundException()
        }
        const verified = this.totpService.verifyTotp(
            request.totpCode,
            this.encryptionService.decrypt(user.encryptedTotpSecret),
        )
        if (!verified) {
            throw new TOTPCodeNotVerifiedException()
        }
        return this.jwtAuthService.generate(userLike)
    }
}