## Taro Plugin For WX Calendar
![NPM Version](https://img.shields.io/npm/v/@lspriv/plugin-taro)
![Static Badge](https://img.shields.io/badge/coverage-later-a9a9a9)
![GitHub License](https://img.shields.io/github/license/lspriv/plugin-taro)

小程序日历 [`wx-calendar`](https://github.com/lspriv/wx-calendar) Taro插件

#### 安装
```bash
npm i @lspriv/plugin-taro -D
# pnpm add @lspriv/plugin-taro -D
```

#### Taro配置插件
```js
export default defineConfig({
  plugins: [
    [
      '@lspriv/plugin-taro',
      {
        plugins: ['@lspriv/wc-plugin-lunar'], // 要使用的小程序插件
        pkgManager: 'pnpm' // 设置包管理器
      }
    ]
  ]
});
```

#### 插件配置选项
[***`cli`***](#cli) `string` 小程序开发工具的cli路径，可选
```text
如果小程序开发工具不是默认安装位置，请设置cli路径
未设置时将会在以下几个位置尝试寻找：
Mac：/Applications/wechatwebdevtools.app/Contents/MacOS/cli
Win：C:/Program Files (x86)/Tencent/微信web开发者工具/cli.bat
```
[***`plugins`***](#plugins) `string[]` 要使用的小程序日历插件

[***`pkgManager`***](#pkgManager) `npm | pnpm | cnpm` 包管理工具，可选
```text
未设置时会依次尝试 cnpm、pnpm、npm
```

[***`resolveMnpApiTypings`***](#resolveMnpApiTypings) `boolean` 是否补充小程序类型miniprogram-api-typings，默认是

#### 插件说明
插件会补充完善tsconfig.json或者jsconig.json中的compilerOptions.paths字段和files字段，提供完整的日历类型声明
```json
{
  "compilerOptions": {
    "paths": {
      "@lspriv/wx-calendar/*": ["./node_modules/@lspriv/wx-calendar/dist/*"]
    }
  },
  "files": ["node_modules/miniprogram-api-typings/index.d.ts"]
}
```
> [!NOTE]
> 如果想关闭小程序miniprogram-api-typings的类型补充，请设置属性 `resolveMnpApiTypings` 为 `false`

#### 页面使用示例
```js
// page.config.js
export default definePageConfig({
  usingComponents: {
    calendar: '@lspriv/wx-calendar'
  }
});
```
```tsx
// [react] page.tsx
import { View } from '@tarojs/components'
import { WxCalendar, CalendarMark, CalendarCustomEvent } from '@lspriv/wx-calendar/lib';
import { LunarPlugin } from '@lspriv/wc-plugin-lunar';
import { ReactWxCalendarElement, CalendarTaroEvent } from '@lspriv/plugin-taro';

WxCalendar.use(LunarPlugin);

// 声明calendar组件类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      calendar: ReactWxCalendarElement;
    }
  }
}

export default function Index () {

  const marks: CalendarMark[] = [];

  const onChange = (e: CalendarTaroEvent<'change'>) => {
    console.log(e);
  }

  // 有时触发的事件参数可能是这样的
  // const onChange = (e: CalendarCustomEvent<'change'>) => {
  //   console.log(e);
  // }

  const onViewchange = (e: CalendarTaroEvent<'viewchange'>) => {
    console.log(e);
  }

  return (
    <View>
      <calendar marks={marks} onChange={onChange} onViewchange={onViewchange} />
    </View>
  )
}
```

```html
// [vue] page.vue
<template>
  <calendar :marks="marks" @change="onChange" @viewchange="onViewchange" />
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { CalendarMark, CalendarCustomEvent } from '@lspriv/wx-calendar/lib';
  import { LunarPlugin } from '@lspriv/wc-plugin-lunar';
  import { CalendarTaroEvent } from '@lspriv/plugin-taro';

  const marks = ref<CalendarMark[]>([]);
  const onChange = (e: CalendarTaroEvent<'change'>) => {
    console.log(e);
  }
  // 有时触发的事件参数可能是这样的
  // const onChange = (e: CalendarCustomEvent<'change'>) => {
  //   console.log(e);
  // }
  const onViewchange = (e: CalendarTaroEvent<'viewchange'>) => {
    console.log(e);
  }
</script>
```

### 关于

>     有任何问题或是需求请到 `Issues` 面板提交
>     忙的时候还请见谅
>     有兴趣开发维护的道友加微信

![wx_qr](https://chat.qilianyun.net/static/git/calendar/wx.png)

