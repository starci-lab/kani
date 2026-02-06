import Sentry from "@sentry/nestjs"
import dotenv from "dotenv"
import {
    getAppConfig 
} from "@modules/filesystem"
// config dotenv
dotenv.config()
// init sentry
Sentry.init({
    dsn: getAppConfig().sentryDsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
})