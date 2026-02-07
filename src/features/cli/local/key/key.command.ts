
import {
    Command, CommandRunner 
} from "nest-commander"
import {
    GenerateCommand 
} from "./subs"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"

@Command({
    name: "key",
    description: "manage key actions",
    subCommands: [ GenerateCommand ]
})
export class KeyCommand extends CommandRunner {
    constructor(
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    async run(): Promise<void> {
        this.winstonService.log(
            WinstonLog.CommandError,
            {
                message: "Please specify a subcommand, e.g. generate"
            }
        )
    }
}
