import { Injectable } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import {
    JWT_ACCESS_TOKEN_STRATEGY,
    JWT_REFRESH_TOKEN_STRATEGY,
    JWT_TEMPORARY_ACCESS_TOKEN_STRATEGY,
} from "../strategies"

@Injectable()
export class JwtAccessTokenAuthGuard extends AuthGuard(
    JWT_ACCESS_TOKEN_STRATEGY,
) {
    constructor() {
        super()
    }
}

@Injectable()
export class JwtTemporaryAccessTokenAuthGuard extends AuthGuard(
    JWT_TEMPORARY_ACCESS_TOKEN_STRATEGY,
) {
    constructor() {
        super()
    }
}

@Injectable()
export class JwtRefreshTokenAuthGuard extends AuthGuard(
    JWT_REFRESH_TOKEN_STRATEGY,
) {
    constructor() {
        super()
    }
}
