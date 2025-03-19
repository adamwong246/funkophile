declare const _default: (funkophileConfig: {
    mode: "build" | "watch";
    initialState: any;
    options: {
        inFolder: string;
        outFolder: string;
    };
    encodings: Record<string, string[]>;
    inputs: Record<string, string>;
    outputs: (x: any) => any;
}) => void;
export default _default;
