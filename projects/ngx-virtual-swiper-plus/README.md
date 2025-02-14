# NgxVirtualSwiper

Swiper with virtual scroll.

<p align="center">
  <a href="https://www.npmjs.com/package/ngx-virtual-swiper-plus">
    <img alt="npm version" src="https://img.shields.io/npm/v/ngx-virtual-swiper.svg">
  </a>
  <a href="https://www.npmjs.com/package/ngx-virtual-swiper-plus">
    <img alt="npm" src="https://img.shields.io/npm/dm/ngx-virtual-swiper.svg">
  </a>
  <a href="https://github.com/git-tate/ngx-virtual-swiper/blob/master/LICENSE">
    <img alt="licence" src="https://img.shields.io/npm/l/ngx-virtual-swiper.svg">
  </a>
</p>

## [Demo](https://stackblitz.com/edit/angular-5qz2y7)

## [Examples](https://github.com/git-tate/ngx-virtual-swiper/tree/master/src/app/demos)

## Getting Started

### Installation

Install via Package managers such as [npm][npm] or [yarn][yarn]

```bash
npm install ngx-virtual-swiper --save
# or
yarn add ngx-virtual-swiper
```

### Usage

Import `ngx-virtual-swiper` module

```typescript
import { NgxVirtualSwiperModule } from 'ngx-virtual-swiper';
import { ScrollingModule } from '@angular/cdk/scrolling';

@NgModule({
  imports: [
    ...
    ScrollingModule,
    NgxVirtualSwiperModule,
    ...
  ]
})
```

#### PeerDependencies

`ngx-virtual-swiper` depeneds on the following libraries to work.

* [@angular/cdk](https://material.angular.io/cdk/scrolling/api)
