import {
    ArgumentsHost, Catch, WsExceptionFilter 
} from "@nestjs/common"
import {
    WsException 
} from "@nestjs/websockets"

@Catch(WsException)
export class SilentWsExceptionFilter implements WsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        const client = host.switchToWs().getClient()
        client.emit(
            "error",
            exception.getError()
        )
    }
}