import {
    ChangeDoc,
    ExecutorSchema,
    InjectPrimaryMongoose,
    UserSchema,
} from "@modules/databases"
import { envConfig } from "@modules/env"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { Cron, CronExpression } from "@nestjs/schedule"
import { ReadinessWatcherFactoryService } from "@modules/mixin"
import { ResumeToken } from "mongodb"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { EventName } from "@modules/event"
import Decimal from "decimal.js"
import { PythPriceDiagnosticService } from "../diagnostics"

@Injectable()
export class UsersLoaderService implements OnModuleInit {
    public users: Array<Partial<UserSchema>> = []
    constructor(
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    private readonly readinessWatcherFactoryService: ReadinessWatcherFactoryService,
    private readonly eventEmitter2: EventEmitter2,
    ) {}

    // we listen to moongodb changes and reload users
    async onModuleInit() {
    // create a readiness watcher
        this.readinessWatcherFactoryService.createWatcher(UsersLoaderService.name)
        // load users on application bootstrap
        await this.load()
        // observe users
        this.observe()
        // wait until users are loaded
        this.readinessWatcherFactoryService.setReady(UsersLoaderService.name)
    }

    // load users from database
    async load(): Promise<void> {
        await this.readinessWatcherFactoryService.waitUntilReady(PythPriceDiagnosticService.name)
        const executorId = envConfig().botExecutor.executorId
        // get the executor
        const executor = await this.connection
            .model<ExecutorSchema>(ExecutorSchema.name)
            .findById(executorId)
        // get the assigned users
        const assignedUsers = executor?.assignedUsers ?? []
        // get the users added to cache
        const usersAddedToCache = assignedUsers.filter(
            assignedUser => !this.users.some(user => user.id === assignedUser.userId)
        )
        // get the users removed from cache
        const usersRemovedFromCache = this.users.filter(
            user => !assignedUsers.some(assignedUser => assignedUser.userId === user.id)
        )
        // emit events for users added to cache
        for (const user of usersAddedToCache) {
            this.eventEmitter2.emit(EventName.UserCreated, { id: user.id })
        }
        // emit events for users removed from cache
        for (const user of usersRemovedFromCache) {
            this.eventEmitter2.emit(EventName.UserDeleted, { id: user.id })
        }
        // store the users
        this.users = assignedUsers.map(assignedUser => ({ id: assignedUser.userId }))
    }

  @Cron(CronExpression.EVERY_10_SECONDS)
    async reload() {
        await this.load()
    }

  private observe() {
      const model = this.connection.model<UserSchema>(UserSchema.name)
      // default resume token, it will be updated when a change is detected
      let resumeToken: ResumeToken | null = null
      // create watcher function
      const createWatcher = () => {
      // create change stream
          const changeStream = model.watch([], {
              fullDocument: "updateLookup",
              resumeAfter: resumeToken ?? undefined,
          })
          // on change
          changeStream.on("change", (change: ChangeDoc<UserSchema>) => {
              // update resume token
              resumeToken = change._id // update resume token
              // update list
              switch (change.operationType) {
              case "insert": {
                  const data = model
                      .hydrate(change.fullDocument)
                      .toJSON<UserSchema>()
                  if (this.users.find((user) => user.id === data.id)) break
                  this.users.push({
                      id: data.id,
                  })
                  this.eventEmitter2.emit(EventName.UserCreated, { id: data.id })
                  break
              }
              case "delete": {
                  const id = (change.documentKey._id as Types.ObjectId).toString()
                  const idx = this.users.findIndex((user) => user.id === id)
                  if (idx >= 0) this.users.splice(idx, 1)
                  this.eventEmitter2.emit(EventName.UserDeleted, { id })
                  break
              }
              }
          })
          changeStream.on("error", () => {
              restartWatcher()
          })
          changeStream.on("close", () => {
              restartWatcher()
          })
          return changeStream
      }
      // restart watcher
      let restarting = false
      let retryDelay = 500 // ms

      // restart watcher function
      const restartWatcher = () => {
          if (restarting) return
          restarting = true
          // restart watcher
          setTimeout(() => {
              createWatcher()
              restarting = false
              retryDelay = Decimal.max(
                  new Decimal(retryDelay).mul(2),
                  new Decimal(5000),
              ).toNumber()
          }, retryDelay)
      }
      // start watcher
      createWatcher()
  }
}
