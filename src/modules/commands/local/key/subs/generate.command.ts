import {
    CommandRunner, SubCommand 
} from "nest-commander"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    GcpKmsService 
} from "@modules/gcp"
import {
    KeyManagementServiceClient 
} from "@google-cloud/kms"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    Option 
} from "nest-commander"
import {
    promises as fsPromise 
} from "fs"
import {
    join 
} from "path"

@SubCommand({ 
    name: "generate", 
    aliases: [ "gen" ], 
    description: "Generate keys for the application" 
})
export class GenerateCommand extends CommandRunner {
    constructor(
    private readonly gcpKmsService: GcpKmsService,
    private readonly mountStorageService: MountStorageService,
    private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(_: Array<string>, options: GenerateCommandOptions): Promise<void> {
        const lengthBytes = 32
        const location = this.mountStorageService.appConfig.gcp.location
        const projectId = this.mountStorageService.appConfig.gcp.projectId
        const client = new KeyManagementServiceClient({
            credentials: JSON.parse(
                this.mountStorageService.gcpCloudKmsCryptoOperatorSa,
            ),
        })
        const locationName = client.locationPath(projectId,
            location)
        const [{ data }] = await client.generateRandomBytes({
            lengthBytes,
            location: locationName,
            protectionLevel: "HSM",
        })
        this.winstonService.log(WinstonLog.KeyGeneratedSuccess,
            {
            })
        if (!data) {
            this.winstonService.log(WinstonLog.KeyGenerationFailed,
                {
                    error: "Data is empty" 
                })
            process.exit(1)
        }
        // we encrypt the data
        const encryptedData = await this.gcpKmsService.encrypt(data.toString("utf8"))
        this.winstonService.log(WinstonLog.KeyEncryptedSuccess,
            {
            })
        // we decrypt the data
        const decryptedData = await this.gcpKmsService.decrypt(encryptedData)
        // we check if the decrypted data is the same as the original data
        if (decryptedData !== data.toString("utf8")) {
            this.winstonService.log(WinstonLog.KeyDecryptionCheckFailed, 
                {
                    error: "Decrypted data is not the same as the original data" 
                }
            )
            process.exit(1)
        }
        this.winstonService.log(WinstonLog.KeyDecryptionCheckSuccess,
            {
            })
        // store the encrypted data in the filesystem
        await fsPromise.writeFile(
            join(process.cwd(),
                "dump",
                `${options.name}.txt`),
            encryptedData.toString("base64")
        )
        this.winstonService.log(WinstonLog.KeyWrittenSuccess,
            {
                keyName: options.name 
            })
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
