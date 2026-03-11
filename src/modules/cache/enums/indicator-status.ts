/**
 * The status of a violate indicator result.
 */
export enum IndicatorStatus {
    /**
     * The indicator has triggered (violation).
     */
    Trigger = "trigger",
    /**
     * The indicator has reentered (safe to re-enter).
     */
    Reentry = "reentry",
    /**
     * The indicator has no action.
     */
    NoAction = "noAction",
}
