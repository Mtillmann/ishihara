import { Options as Options$1, CirclePacker } from '@mtillmann/circlepacker';

type Options = {
    circlePackerOptions: Partial<Options$1>;
    textColors: string[];
    backgroundColors: string[];
    text: string;
    font: string;
    radius: number | 'auto';
    padding: number | string;
    margin: number | string;
    debug: boolean;
};

declare function export_default(options?: Partial<Options>): CirclePacker | Record<string, any>;

export { type Options, export_default as default };
