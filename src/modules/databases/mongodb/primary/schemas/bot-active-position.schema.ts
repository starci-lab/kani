import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    ID,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractSchema,
} from "./abstract"
import {
    LiquidityPoolType,
    GraphQLTypeLiquidityPoolType,
} from "../enums"
import {
    Schema as MongooseSchema,
    Types,
} from "mongoose"
import {
    LiquidityPoolSchema,
} from "./liquidity-pool.schema"
import {
    PositionSchema,
} from "./position.schema"
import {
    PrimaryMongoDbCollectionRef,
} from "../enums"

    @ObjectType({
        description: "Represents an active bot position",
    })
    @Schema({
        autoCreate: false,
    })
export class BotActivePositionSchema extends AbstractSchema {
        /**
         * Liquidity pool type the bot is currently operating on (e.g. CLMM, DLMM, AMM).
         */
        @Field(
            () => GraphQLTypeLiquidityPoolType,
            {
                description: "The liquidity pool type of the active bot",
            },
        )
        @Prop({
            type: String,
            enum: LiquidityPoolType,
        })
            type: LiquidityPoolType
        /**
         * Reference to the liquidity pool document (stored as ObjectId in MongoDB).
         */
        @Field(
            () => ID,
            {
                description: "The liquidity pool id",
            },
        )
        @Prop({
            type: MongooseSchema.Types.ObjectId,
            ref: PrimaryMongoDbCollectionRef.LiquidityPool,
        })
            liquidityPool: LiquidityPoolSchema | Types.ObjectId

        /**
         * Reference to the position document (stored as ObjectId in MongoDB).
         */
        @Field(
            () => ID,
            {
                description: "The position id",
            },
        )
        @Prop({
            type: MongooseSchema.Types.ObjectId,
            ref: PrimaryMongoDbCollectionRef.Position,
        })
            position: PositionSchema | Types.ObjectId

        /**
         * Resolved position entity associated with `position`.
         * Not persisted in MongoDB (runtime-only convenience for API/GraphQL).
         */
        @Field(
            () => PositionSchema,
            {
                description: "The resolved position associated with the bot",
                nullable: true,
            },
        )
            associatedPosition?: PositionSchema

        /**
         * Resolved liquidity pool entity associated with `liquidityPool`.
         * Not persisted in MongoDB (runtime-only convenience for API/GraphQL).
         */
        @Field(
            () => LiquidityPoolSchema,
            {
                description: "The resolved liquidity pool associated with the bot",
                nullable: true,
            },
        )
            associatedLiquidityPool?: LiquidityPoolSchema

        /**
         * The created at timestamp of the active position.
         */
        @Field(
            () => Boolean,
            {
                description: "Whether the active position is force closed",
                nullable: true,
            },
        )
        @Prop({
            type: Boolean,
            nullable: true,
        })
            forceClose?: boolean
}

/**
     * The actual Mongoose schema generated from the class definition above.
     * This is what gets registered with the NestJS Mongoose module.
     */
export const BotActivePositionSchemaClass = SchemaFactory.createForClass(BotActivePositionSchema)