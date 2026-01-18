import {
    envConfig 
} from "@modules/env"
import {
    Injectable 
} from "@nestjs/common"
import axios, {
    AxiosInstance, CreateAxiosDefaults 
} from "axios"
import axiosRetry from "axios-retry"
import Decimal from "decimal.js"

/**
 * Axios service
 */
@Injectable()
export class AxiosService {
    private readonly axiosMap: Map<string, AxiosInstance> = new Map()
    
    /**
     * Create an Axios instance
     */
    create(key: string, config?: CreateAxiosDefaults) {
        // Check if the Axios instance already exists
        if (this.axiosMap.has(key)) {
            return this.axiosMap.get(key) as AxiosInstance
        }
        // Create a new Axios instance
        const axiosInstance = axios.create(config)
        // Add retry to the Axios instance
        this.axiosMap.set(key,
            axiosInstance)
        // Add retry to the Axios instance
        this.addRetry(axiosInstance)
        // Return the Axios instance
        return axiosInstance
    } 
    
    /**
     * Add retry to an Axios instance
     */
    private addRetry(axiosInstance: AxiosInstance) {
        axiosRetry(
            axiosInstance,
            {
                // Retry configuration
                retries: envConfig().client.axios.retry.maxRetries,
                // Retry delay configuration
                retryDelay: (retryCount) => {
                    // Calculate the base delay
                    const baseDelay = new Decimal(2).pow(new Decimal(retryCount)).mul(envConfig().client.axios.retry.delay) // exponential
                    // Calculate the jitter
                    const jitter = new Decimal(Math.random()).mul(envConfig().client.axios.retry.delay)
                    // Return the total delay
                    return baseDelay.add(jitter).toNumber()
                },
                // Retry condition
                retryCondition: (error) => {
                    // Check if the error is a network or idempotent request error
                    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    // Check if the response status is greater than or equal to 500
                    error.response?.status && error.response.status >= 500 ? true : false
                },
            }
        )
    }
}