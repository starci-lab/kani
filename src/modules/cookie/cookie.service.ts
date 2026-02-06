import {
    Injectable
} from "@nestjs/common"
import type {
    CookieOptions
} from "express"
import {
    envConfig
} from "@modules/env"
import type {
    AttachHttpOnlyCookieParams,
    AttachHttpOnlyCookieResult,
    ClearCookieParams,
    ClearCookieResult
} from "./types"

/**
 * Service for attaching and clearing HttpOnly cookies on Express response.
 * Used for refresh tokens and logout.
 *
 * @example
 * cookieService.attachHttpOnlyCookie({ res, name: "refreshToken", value: token })
 * cookieService.clearCookie({ res, name: "refreshToken" })
 */
@Injectable()
export class CookieService {
    constructor() {}

    /**
     * Attaches a secure HttpOnly cookie to the response.
     * Typically used for refresh tokens (not accessible via JavaScript).
     *
     * @param param - Response, cookie name, value, optional cookie options
     * @returns void
     *
     * @example
     * cookieService.attachHttpOnlyCookie({ res, name: "refreshToken", value: token })
     */
    attachHttpOnlyCookie({
        res,
        name,
        value,
        options,
    }: AttachHttpOnlyCookieParams): AttachHttpOnlyCookieResult {
        const defaultOptions: CookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: envConfig().jwt.refreshToken.expiration,
        }

        res.cookie(name,
            value,
            {
                ...defaultOptions,
                ...options,
            })
    }

    /**
     * Clears a cookie by name (e.g. on logout).
     *
     * @param param - Response, cookie name, optional options
     * @returns void
     *
     * @example
     * cookieService.clearCookie({ res, name: "refreshToken" })
     */
    clearCookie({
        res,
        name,
        options,
    }: ClearCookieParams): ClearCookieResult {
        res.clearCookie(name,
            {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                ...options,
            })
    }
}
