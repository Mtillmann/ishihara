import type { Options as circlePackerOptions } from '@mtillmann/circlepacker'

export type Options = {
  circlePackerOptions: Partial<circlePackerOptions>,
  textColors: string[],
  backgroundColors: string[],
  text: string,
  font: string,
  radius: number | 'auto',
  padding: number | string,
  margin: number | string,
  debug: boolean,
}
