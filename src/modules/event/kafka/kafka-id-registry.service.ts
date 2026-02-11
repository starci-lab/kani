
import {
    Injectable
} from "@nestjs/common"
import {
    envConfig
} from "@modules/env"
import {
    InstanceService 
} from "@modules/mixin"

@Injectable()
export class KafkaIdRegistryService {
    constructor(
        private readonly instanceService: InstanceService
    ) {}

    getId(): string {
        return envConfig().isProduction ? envConfig().k8s.global.podName : this.instanceService.getId()
    }
}