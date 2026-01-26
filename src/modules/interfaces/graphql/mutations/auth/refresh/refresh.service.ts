import {
    Injectable 
} from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    SessionSchema,
    UserSchema,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    RefreshResponseData 
} from "./refresh.dto"
import {
    JwtAuthService, UserJwtLike 
} from "@modules/passport"
import {
    SessionNotFoundException,
    UserNotFoundException,
    UserTotpSecretNotFoundException,
} from "@modules/exceptions"

@Injectable()
export class RefreshService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly jwtAuthService: JwtAuthService,
    ) {}

    async refresh(userLike: UserJwtLike): Promise<RefreshResponseData> {
        // try first in cache
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException({
                id: userLike.id,
            })
        }
        // if not found, try in database
        if (!user.encryptedTotpSecretPayload) {
            throw new UserTotpSecretNotFoundException({
                id: user.id,
            })
        }
        const session = await this.connection
            .model<SessionSchema>(SessionSchema.name)
            .findOne({
                user: userLike.id 
            })
        if (!session) {
            throw new SessionNotFoundException({
                userId: user.id,
            })
        }
        return this.jwtAuthService.generate({
            id: user.id,
            mfaEnabled: user.mfaEnabled,
            encryptedTotpSecretPayload: user.encryptedTotpSecretPayload,
        })
    }
}

