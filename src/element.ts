/*
 * Copyright 2025 lspriv. All Rights Reserved.
 * Distributed under MIT license.
 * See File LICENSE for detail or copy at https://opensource.org/licenses/MIT
 * @Description: Description
 * @Author: lspriv
 * @LastEditTime: 2025-01-19 13:33:50
 */
import {
  CalendarProp,
  CalendarExport,
  PluginConstructor,
  LowerCamelToSnake,
  CalendarEventSimplified,
  CalendarCustomEvent,
} from '@lspriv/wx-calendar/lib';
import { type TaroEvent } from '@tarojs/runtime';

export type CalendarElementProps = {
  [P in keyof CalendarProp as LowerCamelToSnake<P, '-'>]?: WechatMiniprogram.Component.PropertyToData<CalendarProp[P]>;
};

export type CalendarTaroEvent<T> = Omit<TaroEvent, 'mpEvent'> & { mpEvent: CalendarCustomEvent<T> };

type CalendarElementEvents = {
  [P in CalendarEventSimplified as `on${Capitalize<P>}`]: (event: CalendarTaroEvent<P> | CalendarCustomEvent<P>) => void;
};

type CalendarElementKeys =
  | keyof CalendarElementProps
  | keyof CalendarElementEvents;

export type ReactWxCalendarElement<Plugins extends PluginConstructor[] = []> =
  CalendarElementProps &
    Partial<CalendarElementEvents> &
    Omit<
      React.ClassAttributes<CalendarExport<Plugins>> &
        React.HTMLAttributes<HTMLElement>,
      CalendarElementKeys
    >;
