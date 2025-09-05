import { Provider } from "@nestjs/common"
import { AXIOS_INSTANCE_TOKEN } from "./axios.constants"
import axios from "axios"
import axiosRetry from "axios-retry"

export const createAxiosProvider = (): Provider => ({
    provide: AXIOS_INSTANCE_TOKEN,
    useFactory: () => { 
        const axiosInstance = axios.create()
        axiosRetry(axiosInstance, {
            retryCondition: (error) => {
                return error.response?.status === 500
            },
            retries: 3,
            retryDelay: (retryCount) => retryCount * 1000,
        })
        return axiosInstance
    },
})