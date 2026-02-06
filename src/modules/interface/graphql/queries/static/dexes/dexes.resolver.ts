import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    DexesService 
} from "./dexes.service"
import {
    GraphQLSuccessMessage 
} from "@modules/api"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    DexesResponse 
} from "./graphql-types"    
import {
    DexSchema 
} from "@modules/databases"
import {
    GraphQLTransformInterceptor 
} from "@modules/api"
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

