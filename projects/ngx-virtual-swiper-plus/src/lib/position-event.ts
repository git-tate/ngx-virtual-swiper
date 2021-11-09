export interface IPositionEvent {
    clientX: number;
    clientY: number;
    currentTarget: HTMLElement;
    target?: HTMLElement;
    offsetX: number;
    offsetY: number;
}
