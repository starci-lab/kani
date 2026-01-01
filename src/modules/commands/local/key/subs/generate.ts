import { CommandRunner, SubCommand } from "nest-commander"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { GcpKmsService } from "@modules/gcp"
import { KeyManagementServiceClient } from "@google-cloud/kms"
import { MountFilesystemService } from "@modules/filesystem"
import { GenFilesystemService } from "@modules/filesystem"
import { Option } from "nest-commander"

@SubCommand({ 
    name: "generate", 
    aliases: [ "gen" ], 
    description: "Generate keys for the application" 
})
export class GenerateCommand extends CommandRunner {
    constructor(
    private readonly gcpKmsService: GcpKmsService,
    private readonly mountFilesystemService: MountFilesystemService,
    private readonly genFilesystemService: GenFilesystemService,

    @InjectWinston()
    private readonly logger: WinstonLogger,
    ) {
        super()
    }

    async run(_: Array<string>, options: GenerateCommandOptions): Promise<void> {
        const lengthBytes = 32
        const location = this.mountFilesystemService.apiKeys().gcp.location
        const projectId = this.mountFilesystemService.apiKeys().gcp.projectId
        const client = new KeyManagementServiceClient({
            credentials: JSON.parse(
                this.mountFilesystemService.cloudKmsCryptoOperatorSa(),
            ),
        })
        const locationName = client.locationPath(projectId, location)
        const [{ data }] = await client.generateRandomBytes({
            lengthBytes,
            location: locationName,
            protectionLevel: "HSM",
        })
        this.logger.info(WinstonLog.KeyGeneratedSuccess)
        if (!data) {
            this.logger.error(WinstonLog.KeyGenerationFailed, { error: "Data is empty" })
            process.exit(1)
        }
        // we encrypt the data
        const encryptedData = await this.gcpKmsService.encrypt(data.toString("utf8"))
        this.logger.info(WinstonLog.KeyEncryptedSuccess)
        // we decrypt the data
        const decryptedData = await this.gcpKmsService.decrypt(encryptedData)
        // we check if the decrypted data is the same as the original data
        if (decryptedData !== data.toString("utf8")) {
            this.logger.error(WinstonLog.KeyDecryptionCheckFailed, 
                { error: "Decrypted data is not the same as the original data" }
            )
            process.exit(1)
        }
        this.logger.info(WinstonLog.KeyDecryptionCheckSuccess)
        // store the encrypted data in the filesystem
        await this.genFilesystemService.writeEncryptedKey(options.name, encryptedData)
        this.logger.info(WinstonLog.KeyWrittenSuccess, { keyName: options.name })
        // exit the app
        process.exit(0)
    }
    
    @Option({
        flags: "-n, --name <name>",
        description: "The name of the encrypted key",
        defaultValue: "aes",
    })
    parseName(value: string): string {
        return value
    }
}

interface GenerateCommandOptions {
    name: string
}
