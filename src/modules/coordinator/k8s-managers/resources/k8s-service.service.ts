// import { EventEmitter2 } from "@nestjs/event-emitter"
// import { Injectable, Scope } from "@nestjs/common"
// import { EventName } from "@modules/event"

// @Injectable({
//     scope: Scope.REQUEST,
//     durable: true,
// })
// export class K8sServiceService {
//     constructor(
//         private readonly eventEmitter: EventEmitter2,
//     ) {}
    
//     @OnEvent(EventName.ExecutorCreated)
//     async handleExecutorCreated(payload: ExecutorCreatedEvent) {
//         console.log(payload)
//     }
// }