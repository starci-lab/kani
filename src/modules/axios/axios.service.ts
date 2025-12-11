import { Injectable } from "@nestjs/common"
import { sleep } from "@utils"
import axios, { AxiosInstance, CreateAxiosDefaults } from "axios"
import axiosRetry from "axios-retry"
import Decimal from "decimal.js"

@Injectable()
export class AxiosService {
    private readonly axiosMap: Map<string, AxiosInstance> = new Map()
    
    create(key: string, config?: CreateAxiosDefaults) {
        if (this.axiosMap.has(key)) {
            return this.axiosMap.get(key) as AxiosInstance
        }
        const axiosInstance = axios.create(config)
        this.axiosMap.set(key, axiosInstance)
        return axiosInstance
    } 

    addJitter(key: string, maxJitterMs: number = 200) {
        const axiosInstance = this.axiosMap.get(key) as AxiosInstance
        if (!axiosInstance) {
            throw new Error(`Axios instance with key "${key}" not found`)
        }
        axiosInstance.interceptors.request.use(async (config) => {
            const jitter = new Decimal(Math.random()).mul(maxJitterMs).toNumber()
            await sleep(jitter)
            return config
        })
    }
    
    addRetry({ key, maxRetries = 5, retryDelay = 100 }: AddRetryParams) {
        const axiosInstance = this.axiosMap.get(key) as AxiosInstance
        if (!axiosInstance) {
            throw new Error(`Axios instance with key "${key}" not found`)
        }
        axiosRetry(
            axiosInstance, {
                retries: maxRetries,
                retryDelay: (retryCount) => {
                    const baseDelay = Math.pow(2, retryCount) * 100 // exponential
                    const jitter = new Decimal(Math.random()).mul(retryDelay).toNumber()
                    return new Decimal(baseDelay).add(jitter).toNumber()
                },
                retryCondition: (error) =>
                    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                error.response?.status && error.response.status >= 500 ? true : false,
            })
    }
}

export interface AddRetryParams {
    key: string
    maxJitterMs?: number
    maxRetries?: number
    retryDelay?: number
}