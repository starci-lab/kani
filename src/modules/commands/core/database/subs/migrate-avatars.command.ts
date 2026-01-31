import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    BotSchema,
    ConfigSchema,
    AvatarsConfig,
    ConfigRecord,
    ConfigId,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    createObjectId,
} from "@modules/utils"
import {
    AvatarsConfigNotFoundException 
} from "@modules/exceptions"

@SubCommand({
    name: "migrate-avatars",
    description: "Migrate bots: assign random avatarUrl to bots that don't have one",
})
export class MigrateAvatarsCommand extends CommandRunner {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        try {
            this.winstonService.log(WinstonLog.MigrationStarted,
                {
                })
        
            const avatarsConfig = await this.connection.model<ConfigSchema>(ConfigSchema.name).findById<ConfigRecord<AvatarsConfig>>(
                createObjectId(ConfigId.Avatars)
            )
            if (!avatarsConfig || !avatarsConfig.value.avatarUrls || avatarsConfig.value.avatarUrls.length === 0) {
                throw new AvatarsConfigNotFoundException({
                })
            }

            const avatarUrls = avatarsConfig.value.avatarUrls
            // Find all bots that don't have an avatarUrl
            const botsWithoutAvatar = await this.connection.model<BotSchema>(
                BotSchema.name
            ).find({
                $or: [
                    {
                        avatarUrl: {
                            $exists: false,
                        },
                    },
                    {
                        avatarUrl: null,
                    },
                    {
                        avatarUrl: "",
                    },
                ],
            })

            // Update each bot with a random avatar
            let updatedCount = 0
            for (const bot of botsWithoutAvatar) {
                const randomAvatar = avatarUrls[Math.floor(Math.random() * avatarUrls.length)]
                await this.connection.model<BotSchema>(
                    BotSchema.name
                ).updateOne(
                    {
                        _id: bot._id,
                    },
                    {
                        $set: {
                            avatarUrl: randomAvatar,
                        },
                    }
                )
                updatedCount++
            }

            this.winstonService.log(
                WinstonLog.MigrationAvatarsCompleted,
                {
                    updatedCount,
                },
            )

            // exit the app
            process.exit(0)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.MigrationAvatarsFailed,
                {
                    error: error.message,
                },
            )
            process.exit(1)
        }
    }
}
