import {
    InjectSuperJson,
    DayjsService
} from "@modules/mixin"
import {
    Inject,
    Injectable
} from "@nestjs/common"
import SuperJSON from "superjson"
import fs from "fs"
import path from "path"
import {
    envConfig 
} from "@modules/env"
import {
    MODULE_OPTIONS_TOKEN,
    OPTIONS_TYPE
} from "./loggers.module-definition"

/**
 * Service for logging debug messages to a file.
 */
@Injectable()
export class DebugFileLoggerService {
    /**
     * The path to the log file.
     */
    private readonly logFilePath: string
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly dayjsService: DayjsService
    ) {
        this.logFilePath = path.resolve(process.cwd(),
            ".debug",
            this.options.logFileName
        )
    }

    /**
     * Log a debug message.
     * @param object - The object to log.
     * @returns void.
     */
    async debug(object: unknown): Promise<void> {
        // if production, don't log
        if (envConfig().isProduction || !envConfig().debug.enabled) return
        // create the debug directory if it doesn't exist
        if (!fs.existsSync(path.dirname(this.logFilePath))) {
            fs.mkdirSync(path.dirname(this.logFilePath),
                {
                    recursive: true 
                }
            )
        }
        // get the timestamp
        const timestamp = this.dayjsService.now().toISOString()
        // stringify the object
        const json = this.superjson.stringify(object)
        // create the line
        const line = `[${timestamp}] [DEBUG] ${json}\n`
        // append the line to the file
        await fs.promises.appendFile(this.logFilePath,
            line,
            {
                encoding: "utf8",
            }
        )
    }
}
