import { CommandRunner, SubCommand } from "nest-commander"
import { BotSchema, InjectPrimaryMongoose } from "@modules/databases"
import { Connection } from "mongoose"
import { ExecaService } from "@modules/execa"
import { GoogleDriveService } from "@modules/googleapis"
import { DayjsService } from "@modules/mixin"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { MountStorageService } from "@modules/filesystem"
import { KeypairsService } from "@modules/blockchains"
import { GcpKmsService } from "@modules/gcp"

@SubCommand({ name: "re-encryption-private-key", description: "Re-encrypt private key for all bots" })
export class ReEncryptionPrivateKeyCommand extends CommandRunner {
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly execaService: ExecaService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly dayjsService: DayjsService,
    private readonly mountStorageService: MountStorageService,
    private readonly gcpKmsService: GcpKmsService,
    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            const bots = await this.connection.model<BotSchema>(BotSchema.name).find()
            for (const bot of bots) {
                // retrieve the private key from the bot
                const privateKey = await this.keypairsService.getPrivateKey(
                    bot.chainId,
                    bot.encryptedPrivateKey,
                )
            }
            // exit the app
            process.exit(0)
        } catch (error) {
            this.logger.error(WinstonLog.BackupFailed, { error: error.message })
            process.exit(1)
        }
    }
}
