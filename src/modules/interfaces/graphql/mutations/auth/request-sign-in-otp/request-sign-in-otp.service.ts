import { Injectable } from "@nestjs/common"
import { RequestSignInOtpRequest } from "./request-sign-in-otp.dto"
import { SendSignInOtpMailService } from "@modules/mail"
import { CodeGeneratorService } from "@modules/code"
import { createCacheKey, InjectRedisCache, SignInOtpCacheResult } from "@modules/cache"
import { Cache } from "cache-manager"
import { CacheKey } from "@modules/cache"
import ms from "ms"

@Injectable()
export class RequestSignInOtpService {
    constructor(
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        private readonly sendSignInOtpMailService: SendSignInOtpMailService,
        private readonly codeGeneratorService: CodeGeneratorService,
    ) {}

    async requestSignInOtp(
        {
            email,
        }: RequestSignInOtpRequest
    ): Promise<void> {
        const otp = this.codeGeneratorService.generateOtpCode()
        await this.cacheManager.set<SignInOtpCacheResult>(
            createCacheKey(CacheKey.SignInOtpCode, email),
            {
                otp,
            },
            // temporatory hardcoded to 10 minutes
            ms("10m"),
        )
        await this.sendSignInOtpMailService.send({
            email,
            otp,
        })
    }
}

