import { P2cBalancer, RandomBalancer } from "load-balancers"
import { Injectable } from "@nestjs/common"

/**
 * Registry entry for a P2C (power-of-two-choices) balancer.
 * Stores the balancer instance and the list of backend URLs it can select from.
 */
export interface P2cBalancerData {
    instance: P2cBalancer
    urls: Array<string>
}

/**
 * Registry entry for a random balancer.
 * Each entry holds the balancer instance and its associated backend URLs.
 */
export interface RandomBalancerData {
    instance: RandomBalancer
    urls: Array<string>
}

@Injectable()
export class LoadBalancerService {
    /**
     * Maps a balancer name to a RandomBalancer instance and its URL list.
     */
    private readonly randomBalancerRegistry: Record<string, RandomBalancerData> = {}

    /**
     * Maps a balancer name to a P2cBalancer instance and its URL list.
     */
    private readonly p2cBalancerRegistry: Record<string, P2cBalancerData> = {}

    constructor() {}

    /**
     * Register a P2C balancer if it doesn't already exist.
     * Each balancer is identified by a unique name.
     */
    initP2cBalancerIfNotExists(name: string, urls: Array<string>): void {
        if (!this.p2cBalancerRegistry[name]) {
            this.p2cBalancerRegistry[name] = {
                instance: new P2cBalancer(urls.length),
                urls,
            }
        }
    }

    /**
     * Register a Random balancer if it doesn't already exist.
     */
    initRandomBalancerIfNotExists(name: string, urls: Array<string>): void {
        if (!this.randomBalancerRegistry[name]) {
            this.randomBalancerRegistry[name] = {
                instance: new RandomBalancer(urls.length),
                urls,
            }
        }
    }

    /**
     * Pick a backend URL using the P2C algorithm.
     * Returns the URL chosen by the balancer.
     */
    balanceP2c(name: string): string {
        const entry = this.p2cBalancerRegistry[name]
        return entry.urls[entry.instance.pick()]
    }

    /**
     * Pick a backend URL randomly.
     * Returns the URL chosen by the balancer.
     */
    balanceRandom(name: string): string {
        const entry = this.randomBalancerRegistry[name]
        return entry.urls[entry.instance.pick()]
    }
}
