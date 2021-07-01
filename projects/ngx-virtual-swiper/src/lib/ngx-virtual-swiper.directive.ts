import { Directionality } from '@angular/cdk/bidi';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Directive, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgxVirtualSwiperOptions } from './options';
import { IPositionEvent } from './position-event';
import { getClickPositions, getTouchPositions, isNumber } from './utils';

const VERTICAL_ORIENTATION = 'vertical';
const HORIZONTAL_ORIENTATION = 'horizontal';

@Directive({
    selector: '[ngxVirtualSwiper]'
})
export class NgxVirtualSwiperDirective implements OnInit, OnDestroy {

    @Input() public itemSize: number;
    @Output() public swipeStart: EventEmitter<boolean> = new EventEmitter();
    @Output() public swipeEnd: EventEmitter<boolean> = new EventEmitter();

    public readonly subscription = new Subscription();
    public index: number;
    public swiped: boolean;
    public clientX: number;
    public clientY: number;
    public prevClientX: number;
    public prevClientY: number;
    public delta: number;
    public deltaFree: boolean;

    constructor(
        @Optional() @Inject(Directionality) private dir: Directionality,
        @Inject(NgxVirtualSwiperOptions) private options: NgxVirtualSwiperOptions,
        /** to lean more see https://material.angular.io/cdk/scrolling/api */
        @Inject(CdkVirtualScrollViewport) private cdk: CdkVirtualScrollViewport
    ) { }

    public ngOnInit(): void {
        this.addEventListener();
        this.subscription.add(this.cdk.scrolledIndexChange.subscribe(i => this.index = i));
    }

    public ngOnDestroy(): void {
        this.removeEventListener();
        this.subscription.unsubscribe();
    }

    @HostListener('mousedown', ['$event']) public onMousedown = (e): void => this.start(getClickPositions(e));

    @HostListener('touchstart', ['$event']) public onTouchstart = (e): void => this.start(getTouchPositions(e));

    @HostListener('mousemove', ['$event']) public onMousemove = (e): void => this.move(getClickPositions(e));

    @HostListener('touchmove', ['$event']) public onTouchmove = (e): void => this.move(getTouchPositions(e));

    @HostListener('document:mouseup')
    @HostListener('touchend') public onFinish = (): void => {
        if (this.swiped) {
            this.toggleSwiped(false);
            this.finalize();
        }
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
        return this.cdk.getDataLength() * this.itemSize;
    }

    public mousemoveX = (e: IPositionEvent): void => {
        if (e) {
            const offset = this.cdk.measureScrollOffset();
            const c = this.rtl ? -1 : 1;
            const delta = (this.clientX - e.clientX) * c;
            const value = offset + delta;
            this.delta = Math.abs(delta);
            if (value >= 0 && value <= this.scrollSize && (this.deltaFree || this.delta >= this.options.minimumDragPxToSwipe)) {
                this.cdk.scrollToOffset(!this.deltaFree ? (offset + (delta * c))
                    : Math.abs(value));
                if (!this.deltaFree ) {
                    this.deltaFree = true;
                    this.swipeStart.emit(true);
                }
                this.clientX = e.clientX;
            }
        }
    }

    public mousemoveY = (e: IPositionEvent): void => {
        if (e) {
            const offset = this.cdk.measureScrollOffset();
            const value = offset - e.clientY + this.clientY;
            this.delta = e.clientY >= this.clientY ? e.clientY - this.clientY : this.clientY - e.clientY;
            if (value >= 0 && value <= this.scrollSize && (this.deltaFree || this.delta >= this.options.minimumDragPxToSwipe)) {
                this.cdk.scrollToOffset(!this.deltaFree ? (offset - ( e.clientY >= this.clientY ? this.delta : this.delta * -1))
                    : value);
                if (!this.deltaFree ) {
                    this.deltaFree = true;
                    this.swipeStart.emit(true);
                }
                this.clientY = e.clientY;
            }
        }
    }

    public start = (e: IPositionEvent): void => {
        this.toggleSwiped(true);
        this.clientX = e.clientX;
        this.clientY = e.clientY;
        this.prevClientX = e.clientX;
        this.prevClientY = e.clientY;
        this.delta = 0;
        this.deltaFree = false;
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
        if (this.deltaFree) {
            if (this.options.finalize) {
                this.scrollToNearestIndex();
            }
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
