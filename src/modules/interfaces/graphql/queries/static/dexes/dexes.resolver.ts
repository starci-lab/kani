import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    DexesService 
} from "./dexes.service"
import {
    GraphQLSuccessMessage 
} from "../../../interceptors"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    DexesResponse 
} from "./dexes.dto"    
import {
    DexSchema 
} from "@modules/databases"
import {
    GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    UseInterceptors 
} from "@nestjs/common"

@Resolver()
export class DexesResolver {
    constructor(
        private readonly dexesService: DexesService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("DEXes fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => DexesResponse,
        {
            description: "Fetch all supported DEXes.",
        })
    dexes(): Array<DexSchema> {
        return this.dexesService.dexes()
    }
}

