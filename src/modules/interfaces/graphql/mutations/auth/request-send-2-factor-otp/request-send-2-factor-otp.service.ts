import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import { UserJwtLike } from "@modules/passport"
import {
    UserNotFoundException,
} from "@exceptions"
import { Send2FactorOtpMailService } from "@modules/mail"
import { CodeGeneratorService } from "@modules/code"
import { createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import ms from "ms"
import SuperJSON from "superjson"
import { InjectSuperJson } from "@modules/mixin"

@Injectable()
export class RequestSend2FactorOtpService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly send2FactorOtpMailService: Send2FactorOtpMailService,
        private readonly codeGeneratorService: CodeGeneratorService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    async requestSend2FactorOtp(
        userLike: UserJwtLike
    ): Promise<void> {
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findById(userLike.id)
        if (!user) {
            throw new UserNotFoundException("User not found")
        }
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheManager.set(
            createCacheKey(CacheKey.SendOtpCode, user.id),
            this.superJson.stringify({
                otp,
            }),
            // temporatory hardcoded to 10 minutes
            ms("10m"),
        )   
        await this.send2FactorOtpMailService.send({
            email: user.email,
            otp,
        })
    }
}

