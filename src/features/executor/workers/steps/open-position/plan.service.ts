import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    OpenPositionPlanParams
} from "../types"

@Injectable()
export class OpenPositionPlanStepService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) { }

    /**
     * Process the OPEN POSITION PLAN step.
     *
     * @param params - The parameters for the step.
     * @returns The result of the step.
     */
    async process(
        {
            botId,
            jobId,
            liquidityPoolId,
        }: OpenPositionPlanParams
    ) {
        // Load the execution context.
        const {
            bot,
            liquidityPool,
            state,
        } = await this.actionExecutionContextService.load(
            {
                botId,
                jobId,
                liquidityPoolId,
            }
        )
    }
}