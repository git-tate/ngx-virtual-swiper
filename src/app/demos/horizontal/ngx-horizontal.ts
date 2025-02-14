import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'ngx-horizontal',
    styleUrls: ['ngx-horizontal.css'],
    templateUrl: 'ngx-horizontal.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxHorizontalComponent {

    public items = Array.from({ length: 100000 }).map((_, i) => `Item #${i}`);
}
