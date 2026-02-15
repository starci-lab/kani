import {
    WinstonService 
} from "@modules/winston"
import {
    Injectable 
} from "@nestjs/common"

/**
 * Service responsible for handling RPC client fatal errors.
 */
@Injectable()
export class RpcClientFatalService {
    constructor(
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * Handle RPC client fatal errors.
     * @param error - The error to handle.
     */
    async handleRpcClientFatalError(error: Error): Promise<void> {
        this.winstonService.log(
            WinstonLog.RpcClientFatalError,
            {
                error: error.stack,
            }
        )
            error: error.stack,
        })
    }
}