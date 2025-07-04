
export interface Controls {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
}

export interface TouchControls {
    steering: number; // -1 to 1
    throttle: number; // 0 to 1
    brake: number; // 0 to 1
}
