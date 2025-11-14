import { InjectWinston, WinstonLog } from "@modules/winston"
import { Injectable } from "@nestjs/common"
import { Logger as WinstonLogger } from "winston"
import { Model } from "mongoose"
import {
    ChangeStreamInsertDocument,
    ChangeStreamUpdateDocument,
    ChangeStreamDeleteDocument,
    ChangeStreamReplaceDocument,
    ResumeToken
} from "mongodb"
import { AbstractSchema } from "./schemas"
import _ from "lodash"

export type ChangeDoc<T extends AbstractSchema> =
    | ChangeStreamInsertDocument<T>
    | ChangeStreamUpdateDocument<T>
    | ChangeStreamDeleteDocument<T>
    | ChangeStreamReplaceDocument<T>;

export interface ObserveParams<TFilter, TSchema extends AbstractSchema> {
    filter: Array<TFilter>;
    model: Model<TSchema>;
    list: Array<TSchema>;
    insertCondition?: (data: TSchema) => boolean;
    updateCondition?: (data: TSchema) => boolean;
    deleteCondition?: (id: string) => boolean;
}

@Injectable()
export class PrimaryMongooseObserverService {
    constructor(
        @InjectWinston()
        private readonly winstonLogger: WinstonLogger,
    ) {}

    async observe
    <TFilter extends Record<string, unknown>, 
    TSchema extends AbstractSchema>
    (
        { 
            filter, 
            model, 
            list, 
            insertCondition, 
            updateCondition,
            deleteCondition 
        }: ObserveParams<TFilter, TSchema>
    ) {
        // default resume token, it will be updated when a change is detected
        let resumeToken: ResumeToken | null = null
        // create watcher function
        const createWatcher = () => {
            // create change stream
            const changeStream = model.watch(
                filter, {
                    fullDocument: "updateLookup",
                    resumeAfter: resumeToken ?? undefined,
                })
            // log started
            this.winstonLogger.info(
                WinstonLog.MongooseChangeStreamStarted, 
                { model: model.modelName, resumeToken }
            )
            // on change
            changeStream.on("change", (change: ChangeDoc<TSchema>) => {
                try {
                // update resume token
                    resumeToken = change._id // update resume token
                    // update list
                    switch (change.operationType) {
                    case "insert": {
                        const data = model.hydrate(change.fullDocument).toJSON() as TSchema
                        if (insertCondition && !insertCondition(data)) break
                        this.winstonLogger.debug(
                            WinstonLog.MongooseChangeStreamInsert,
                            { data }
                        )
                        list.push(data)
                        break
                    }
                    case "update":
                    case "replace": {
                        if (change.fullDocument) {
                            const data = model.hydrate(change.fullDocument).toJSON() as TSchema
                            if (updateCondition && !updateCondition(data)) break
                            this.winstonLogger.debug(
                                WinstonLog.MongooseChangeStreamUpdate,
                                { data }
                            )
                            // we use lodash to compare the data because the data is a plain object and the list is an array of objects
                            if (_.isEqual(list.find((i) => i.id === data.id), data)) break
                            const idx = list.findIndex((i) => i.id === data.id)
                            if (idx >= 0) list[idx] = data
                        }
                        break   
                    }   
                    case "delete": {
                        const id = change.documentKey._id.toString()
                        if (
                            deleteCondition && !deleteCondition(
                                id)
                        ) break
                        this.winstonLogger.debug(
                            WinstonLog.MongooseChangeStreamDelete,
                            { id }
                        )
                        const idx = list.findIndex((i) => i.id === id)
                        if (idx >= 0) list.splice(idx, 1)
                        break
                    }
                    }
                } catch (err) {
                    console.error(err)
                }
            })
            changeStream.on("error", (err) => {
                this.winstonLogger.error(WinstonLog.MongooseChangeStreamError, { err })
                restartWatcher()
            })

            changeStream.on("close", () => {
                this.winstonLogger.warn(WinstonLog.MongooseChangeStreamClose)
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
            this.winstonLogger.warn(
                WinstonLog.MongooseChangeStreamRestarting
            )
            // restart watcher
            setTimeout(() => {
                createWatcher()
                restarting = false
                retryDelay = Math.min(retryDelay * 2, 5000)
            }, retryDelay)
        }
        // start watcher
        createWatcher()
    }
}