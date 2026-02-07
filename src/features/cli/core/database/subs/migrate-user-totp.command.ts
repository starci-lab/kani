import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    TotpService 
} from "@modules/totp"
import {
    DerivedAesKeyService 
} from "@modules/derived"
import {
    PrivyClient 
} from "@privy-io/node"
import {
    InjectPrivyClient 
} from "@modules/privy"

@SubCommand({
    name: "migrate-user-totp",
    description: "Migrate users: add temporaryTotpUrl and encryptedTotpSecretPayload to users that don't have them",
})
export class MigrateUserTotpCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly totpService: TotpService,
        private readonly derivedAesKeyService: DerivedAesKeyService,
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            this.winstonService.log(WinstonLog.MigrationStarted,
                {
                }
            )
            // Find all users
            const users = await this.connection.model<UserSchema>(
                UserSchema.name
            ).find()
            // Update each user with TOTP secret
            // Note: We get the email from Privy for each user and use it to generate the TOTP secret
            let updatedCount = 0
            let skippedCount = 0
            for (const user of users) {
                if (!user.privyUserId) {
                    this.winstonService.log(
                        WinstonLog.MigrationUserTotpFailed,
                        {
                            error: `User ${user._id} does not have privyUserId`,
                        },
                    )
                    skippedCount++
                    continue
                }
                
                try {
                    // Get user email from Privy
                    const privyUser = await this.privyClient
                        .users()
                        ._get(user.privyUserId)
                    const email = privyUser.linked_accounts.find(account => account.type === "email")?.address
                    
                    if (!email) {
                        this.winstonService.log(
                            WinstonLog.MigrationUserTotpFailed,
                            {
                                error: `User ${user._id} (privyUserId: ${user.privyUserId}) does not have an email`,
                            },
                        )
                        skippedCount++
                        continue
                    }
                    
                    // Generate TOTP secret with email
                    const totpSecret = this.totpService.generateSecret(email)
                    await this.connection.model<UserSchema>(
                        UserSchema.name
                    ).updateOne(
                        {
                            _id: user._id,
                        },
                        {
                            $set: {
                                mfaEnabled: false,
                                encryptedTotpSecretPayload: this.derivedAesKeyService.encrypt(totpSecret.base32),
                            },
                        },
                    )
                    updatedCount++
                } catch (error) {
                    this.winstonService.log(
                        WinstonLog.MigrationUserTotpFailed,
                        {
                            error: `Failed to process user ${user._id} (privyUserId: ${user.privyUserId}): ${error.message}`,
                        },
                    )
                    skippedCount++
                }
            }

            this.winstonService.log(
                WinstonLog.MigrationUserTotpCompleted,
                {
                    updatedCount,
                    skippedCount,
                },
            )

            // exit the app
            process.exit(0)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.MigrationUserTotpFailed,
                {
                    error: error.message,
                },
            )
            process.exit(1)
        }
    }
}
