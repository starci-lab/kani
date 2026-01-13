import { Module } from "@nestjs/common"
import { ConfigurableModuleClass } from "./funding-snapshot-v2.module-definition"
import { FundingSnapshotV2Service } from "./funding-snapshot-v2.service"
import { FundingSnapshotV2Resolver } from "./funding-snapshot-v2.resolver"

@Module({
    providers: [
        FundingSnapshotV2Service,
        FundingSnapshotV2Resolver,
    ],
})
export class FundingSnapshotV2Module extends ConfigurableModuleClass {}

