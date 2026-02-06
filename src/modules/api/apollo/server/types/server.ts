import type {
    ApolloServerType,
} from "../enums"

/** Options for registering the Apollo server module (type and optional services). */
export interface ApolloServerOptions {
    type: ApolloServerType
    useServices?: boolean
}
