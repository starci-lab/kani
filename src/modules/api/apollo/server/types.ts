export enum ApolloServerType {
    Monolithic = "monolithic",
    Federation = "federation",
}
export interface ApolloServerOptions {
    // type of the apollo server
    type: ApolloServerType
    // use services
    useServices?: boolean
}
