import { IPositionEvent } from './position-event';

const getFirstTouch = (e, key: keyof IPositionEvent): number => e?.touches?.[0]?.[key];

export const getClickPositions = (e): IPositionEvent => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    const offsetX = e.offsetX;
    const offsetY = e.offsetY;
    return { clientX, clientY, offsetX, offsetY, currentTarget: e.currentTarget };
};

export const getTouchPositions = (e): IPositionEvent => {
    const clientX = getFirstTouch(e, 'clientX');
    const clientY = getFirstTouch(e, 'clientY');
    const offsetX = getFirstTouch(e, 'offsetX');
    const offsetY = getFirstTouch(e, 'offsetY');
    return { clientX, clientY, offsetX, offsetY, currentTarget: e.currentTarget };
};

export const isNumber = x => typeof x === 'number' && !isNaN(x);
