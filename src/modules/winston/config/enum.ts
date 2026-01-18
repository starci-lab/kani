export enum WinstonLog {
    KafkaConsumerTopicsSubscribed = "Kafka.Consumer.Topics.Subscribed",
    KafkaTopicsCreated = "Kafka.Topics.Created",
    KafkaTopicsDeleted = "Kafka.Topics.Deleted",
    KafkaProducerReady = "Kafka.Producer.Ready",
    KafkaConsumerReady = "Kafka.Consumer.Ready",
    ClosePositionTransactionExecuted = "Close.Position.Transaction.Executed",
    ClosePositionTransactionFailed = "Close.Position.Transaction.Failed",  
    LiquidityPoolFetchedError = "Liquidity.Pool.Fetched.Error",
    LiquidityPoolWsError = "Liquidity.Pool.Ws.Error",
    OpenPositionTransactionExecuted = "Open.Position.Transaction.Executed",
    OpenPositionTransactionFailed = "Open.Position.Transaction.Failed",
}