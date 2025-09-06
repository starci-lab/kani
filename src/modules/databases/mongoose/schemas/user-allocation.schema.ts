import { Field, ObjectType } from "@nestjs/graphql"
import { UserSchema } from "./user.schema"
import { Schema as MongooseSchema, Types } from "mongoose"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { UserDepositSchema } from "./user-deposit.schema"
import { UserCummulativeSchema } from "./user-cummulative.schema"
import { TokenSchema } from "./token.schema"
import { UserWalletSchema } from "./user-wallet.schema"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents the total allocation of capital a user has deposited across one or more instances" })
export class UserAllocationSchema {
    @Field(() => UserSchema, { description: "The user who allocated capital" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserSchema.name, required: true })
        user: UserSchema | Types.ObjectId

    @Field(() => [UserDepositSchema], { description: "List of all deposit transactions this user has made" })
    @Prop({ type: [UserDepositSchema], required: true, default: [] })
        deposits: Array<UserDepositSchema>

    @Field(() => [UserCummulativeSchema], { description: "The cumulative capital and PnL of the user" })
    @Prop({ type: [UserCummulativeSchema], required: true })
        cummulatives: Array<UserCummulativeSchema>

    @Field(() => TokenSchema, { description: "The token that the user has prioritized" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        priorityToken: TokenSchema | Types.ObjectId

    @Field(() => Boolean, { description: "Whether the user wants to auto-exit to USDC when dump is triggered" })
    @Prop({ type: Boolean, required: true, default: false })
        exitToUsdc: boolean

    @Field(() => UserWalletSchema, { description: "The Sui wallet linked to this allocation" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserWalletSchema.name })
        suiWallet: UserWalletSchema | Types.ObjectId

    @Field(() => UserWalletSchema, { description: "The EVM-compatible wallet (Ethereum, BSC, etc.) linked to this allocation" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserWalletSchema.name })
        evmWallet: UserWalletSchema | Types.ObjectId

    @Field(() => UserWalletSchema, { description: "The Solana wallet linked to this allocation" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserWalletSchema.name })
        solanaWallet: UserWalletSchema | Types.ObjectId
}

export const UserAllocationSchemaClass = SchemaFactory.createForClass(UserAllocationSchema)