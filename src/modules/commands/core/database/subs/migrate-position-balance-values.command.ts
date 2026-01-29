import {
    CommandRunner,
    SubCommand,
} from "nest-commander"
import {
    InjectPrimaryMongoose,
    PositionSchema,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"

@SubCommand({
    name: "migrate-position-balance-values",
    description: "Migrate position snapshots: set balanceValue = positionValue and balanceValueInUsd = positionValueInUsd",
})
export class MigratePositionBalanceValuesCommand extends CommandRunner {
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
            
            const PositionModel = this.connection.model<PositionSchema>(
                PositionSchema.name
            )

            // Update openSnapshot: set balanceValue = positionValue and balanceValueInUsd = positionValueInUsd
            // Only update positions where openSnapshot exists and has positionValue/positionValueInUsd
            const openSnapshotResult = await PositionModel.updateMany(
                {
                    openSnapshot: {
                        $exists: true,
                        $ne: null,
                    },
                    "openSnapshot.positionValue": {
                        $exists: true,
                        $ne: null,
                    },
                    "openSnapshot.positionValueInUsd": {
                        $exists: true,
                        $ne: null,
                    },
                },
                [
                    {
                        $set: {
                            "openSnapshot.balanceValue": "$openSnapshot.positionValue",
                            "openSnapshot.balanceValueInUsd": "$openSnapshot.positionValueInUsd",
                        },
                    },
                ],
            )

            this.winstonService.log(
                WinstonLog.MigrationOpenSnapshotsUpdated,
                {
                    matched: openSnapshotResult.matchedCount,
                    modified: openSnapshotResult.modifiedCount,
                },
            )

            // Update closeSnapshot: set balanceValue = positionValue and balanceValueInUsd = positionValueInUsd
            // Only update positions where closeSnapshot exists and has positionValue/positionValueInUsd
            const closeSnapshotResult = await PositionModel.updateMany(
                {
                    closeSnapshot: {
                        $exists: true,
                        $ne: null,
                    },
                    "closeSnapshot.positionValue": {
                        $exists: true,
                        $ne: null,
                    },
                    "closeSnapshot.positionValueInUsd": {
                        $exists: true,
                        $ne: null,
                    },
                },
                [
                    {
                        $set: {
                            "closeSnapshot.balanceValue": "$closeSnapshot.positionValue",
                            "closeSnapshot.balanceValueInUsd": "$closeSnapshot.positionValueInUsd",
                        },
                    },
                ],
            )

            this.winstonService.log(
                WinstonLog.MigrationCloseSnapshotsUpdated,
                {
                    matched: closeSnapshotResult.matchedCount,
                    modified: closeSnapshotResult.modifiedCount,
                },
            )

            this.winstonService.log(
                WinstonLog.MigrationCompleted,
                {
                    openSnapshots: {
                        matched: openSnapshotResult.matchedCount,
                        modified: openSnapshotResult.modifiedCount,
                    },
                    closeSnapshots: {
                        matched: closeSnapshotResult.matchedCount,
                        modified: closeSnapshotResult.modifiedCount,
                    },
                },
            )

            // exit the app
            process.exit(0)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.MigrationFailed,
                {
                    error: error.message,
                    stack: error.stack,
                },
            )
            process.exit(1)
        }
    }
}
