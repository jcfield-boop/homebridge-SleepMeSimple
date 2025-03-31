/**
 * Type definitions for the SleepMe API
 */
/**
 * Possible thermal control states
 */
export var ThermalStatus;
(function (ThermalStatus) {
    ThermalStatus["OFF"] = "off";
    ThermalStatus["HEATING"] = "heating";
    ThermalStatus["COOLING"] = "cooling";
    ThermalStatus["ACTIVE"] = "active";
    ThermalStatus["STANDBY"] = "standby";
    ThermalStatus["UNKNOWN"] = "unknown";
})(ThermalStatus = ThermalStatus || (ThermalStatus = {}));
/**
 * Power state of the device
 */
export var PowerState;
(function (PowerState) {
    PowerState["ON"] = "on";
    PowerState["OFF"] = "off";
    PowerState["UNKNOWN"] = "unknown";
})(PowerState = PowerState || (PowerState = {}));
//# sourceMappingURL=types.js.map