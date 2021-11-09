import { Directionality } from '@angular/cdk/bidi';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Directive, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgxVirtualSwiperOptions } from './options';
import { IPositionEvent } from './position-event';
import { getClickPositions, getTouchPositions, isNumber } from './utils';

const VERTICAL_ORIENTATION = 'vertical';
const HORIZONTAL_ORIENTATION = 'horizontal';

type ACTIVATION_TYPE = 'touch' | 'click';
@Directive({
    selector: '[ngxVirtualSwiper]'
})
export class NgxVirtualSwiperDirective implements OnInit, OnDestroy {

    @Input() public itemSize: number;
    @Input() public enabled = true;
    @Input() public scrollbarWidth = 24;
    @Input() public excludeClasses = [];

    @Output() public swipeBeforeStart: EventEmitter<IPositionEvent> = new EventEmitter();
    @Output() public swipeStart: EventEmitter<boolean> = new EventEmitter();
    @Output() public swipeUnlocked: EventEmitter<boolean> = new EventEmitter();
    @Output() public swipeEnd: EventEmitter<boolean> = new EventEmitter();
    @Output() public swipeAfterEnd: EventEmitter<boolean> = new EventEmitter();

    public readonly subscription = new Subscription();
    public index: number;
    public swiped: boolean;
    public clientX: number;
    public clientY: number;
    public prevClientX: number;
    public prevClientY: number;

    private _delta: number;
    private _swipeUnlocked: boolean;

    constructor(
        @Optional() @Inject(Directionality) private dir: Directionality,
        @Inject(NgxVirtualSwiperOptions) private options: NgxVirtualSwiperOptions,
        /** to lean more see https://material.angular.io/cdk/scrolling/api */
        @Inject(CdkVirtualScrollViewport) private cdk: CdkVirtualScrollViewport,
        private el: ElementRef
    ) { }

    public ngOnInit(): void {
        this.addEventListener();
        this.subscription.add(this.cdk.scrolledIndexChange.subscribe(i => this.index = i));
    }

    public ngOnDestroy(): void {
        this.removeEventListener();
        this.subscription.unsubscribe();
    }

    @HostListener('mousedown', ['$event']) public onMousedown = (e): void => this.start(e, 'click');

    @HostListener('touchstart', ['$event']) public onTouchstart = (e): void => this.start(e, 'touch');

    @HostListener('mousemove', ['$event']) public onMousemove = (e): void => this.move(getClickPositions(e));

    @HostListener('touchmove', ['$event']) public onTouchmove = (e): void => this.move(getTouchPositions(e));

    @HostListener('document:mouseup')
    @HostListener('touchend') public onFinish = (): void => {
        if (this.swiped) {
            this.toggleSwiped(false);
            this.finalize();
        }
        this.swipeAfterEnd.emit(true);
    }

    /** the bug-fix to prevent dragging images while swiping */
    @HostListener('document:dragstart', ['$event']) public onDragstart = (e): void => e.preventDefault();

    public get changed(): boolean {
        let result = false;
        if (isNumber(this.prevClientX) && isNumber(this.options.threshold)) {
            const deltaX = Math.abs(this.prevClientX - this.clientX);
            result = deltaX >= this.options.threshold;
        }
        if (isNumber(this.prevClientY) && isNumber(this.options.threshold)) {
            const deltaY = Math.abs(this.prevClientY - this.clientY);
            result = result || deltaY >= this.options.threshold;
        }
        return result;
    }

    public get rtl(): boolean {
        return this.dir?.value === 'rtl';
    }

    public get scrollSize(): number {
        const dataLeng = this.cdk.getDataLength();
        const content = this.cdk.elementRef.nativeElement.querySelector('.ng-scroll-content');
        const defaultSize = (content && (this.rtl ? content.clientWidth : content.clientHeight)) || 1;
        return dataLeng > 0 ? this.cdk.getDataLength() * (this.itemSize || defaultSize) : defaultSize;
    }

    public get isSwiping() {
        return this._swipeUnlocked === true;
    }

    public mousemoveX = (e: IPositionEvent): void => {
        if (this.enabled && this.swiped) {
            if (e) {
                const offset = this.cdk.measureScrollOffset();
                const c = this.rtl ? -1 : 1;
                const delta = (this.clientX - e.clientX) * c;
                const value = offset + delta;
                this._delta = Math.abs(delta);
                if (value >= 0 && value <= this.scrollSize && (this._swipeUnlocked || this._delta >= this.options.minimumDragPxToSwipe)) {
                    this.cdk.scrollToOffset(!this._swipeUnlocked ? (offset + (delta * c))
                        : Math.abs(value));
                    if (!this._swipeUnlocked ) {
                        this._swipeUnlocked = true;
                        this.swipeUnlocked.emit(true);
                    }
                    this.clientX = e.clientX;
                }
            }
        }
    }

    public mousemoveY = (e: IPositionEvent): void => {
        if (this.enabled && this.swiped) {
            if (e) {
                const offset = this.cdk.measureScrollOffset();
                const value = offset - e.clientY + this.clientY;
                this._delta = e.clientY >= this.clientY ? e.clientY - this.clientY : this.clientY - e.clientY;
                if (value >= 0 && value <= this.scrollSize && (this._swipeUnlocked || this._delta >= this.options.minimumDragPxToSwipe)) {
                    this.cdk.scrollToOffset(!this._swipeUnlocked ? (offset - ( e.clientY >= this.clientY ? this._delta : this._delta * -1))
                        : value);
                    if (!this._swipeUnlocked ) {
                        this._swipeUnlocked = true;
                        this.swipeUnlocked.emit(true);
                    }
                    this.clientY = e.clientY;
                }
            }
        }
    }

    public start = (e: IPositionEvent, activationType: ACTIVATION_TYPE): void => {
        let canSwipe = (
            this.rtl ? e.currentTarget.clientHeight - e.offsetY : e.currentTarget.clientWidth - e.offsetX
        ) > this.scrollbarWidth;
        if (!canSwipe) {
            return;
        }

        if (this.excludeClasses.length) {
            let node = e.target;
            while (node !== this.el.nativeElement) {
                if (this.excludeClasses.some(className => node.classList.contains(className))) {
                    canSwipe = false;
                    break;
                }
                node = node.parentElement;
            }

            if (!canSwipe) {
                return;
            }
        }

        this.swipeBeforeStart.emit(e);
        if (this.enabled) {
            this.swipeStart.emit(true);
            const position = activationType === 'touch' ? getTouchPositions(e) : getClickPositions(e);
            this.toggleSwiped(true);
            this.clientX = position.clientX;
            this.clientY = position.clientY;
            this.prevClientX = position.clientX;
            this.prevClientY = position.clientY;
            this._delta = 0;
            this._swipeUnlocked = false;
        }
    }

    public move = (e: IPositionEvent): void => {
        if (this.swiped) {
            if (this.cdk.orientation === HORIZONTAL_ORIENTATION) {
                this.mousemoveX(e);
            }
            else if (this.cdk.orientation === VERTICAL_ORIENTATION) {
                this.mousemoveY(e);
            }
        }
    }

    public toggleSwiped = (value: boolean): void => {
        this.swiped = value;
    }

    public finalize = (): void => {
        if (this._swipeUnlocked) {
            if (this.options.finalize) {
                this.scrollToNearestIndex();
            }
            this._swipeUnlocked = false;
            this.swipeEnd.emit(true);
        }
    }

    public scrollToNearestIndex = (): void => {
        const delta = this.cdk.orientation === HORIZONTAL_ORIENTATION ? this.prevClientX - this.clientX :
            this.cdk.orientation === VERTICAL_ORIENTATION ? this.prevClientY - this.clientY :
                null;
        if (isNumber(delta)) {
            const directionDelta = this.rtl ? delta * -1 : delta;
            const index = directionDelta > 0 && Math.abs(directionDelta) >= this.options.threshold ? this.index + 1 : this.index;
            this.cdk.scrollToIndex(index, 'smooth');
        }
    }

    public addEventListener = (): void => {
        this.cdk.elementRef.nativeElement.addEventListener('click', this.preventClicks, true);
    }

    public removeEventListener = (): void => {
        this.cdk.elementRef.nativeElement.removeEventListener('click', this.preventClicks, true);
    }

    /** prevent all type of clicks (e.g. click on links, Angular`s click) */
    public preventClicks = (e): void => {
        if (this.changed && this.options.preventClicks) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }
}
