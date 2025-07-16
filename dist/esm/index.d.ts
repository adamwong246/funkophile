import Promise from "bluebird";
interface FileContents {
    [key: string]: string | Buffer;
}
interface InputState {
    [key: string]: FileContents;
}
type AppState = {
    initialLoad: boolean;
    timestamp: number;
} & InputState;
interface FunkophileConfig {
    mode: 'build' | 'watch';
    initialState: InputState;
    options: {
        inFolder: string;
        outFolder: string;
    };
    encodings: Record<string, string[]>;
    inputs: Record<string, string>;
    outputs: (selectors: Record<string, (state: AppState) => FileContents>) => Record<string, string | Buffer | Promise<string | Buffer>>;
}
export declare const contentsOfFiles: <T extends FileContents>(selector: (state: AppState) => T) => ((state: {
    initialLoad: boolean;
    timestamp: number;
} & InputState) => string) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => string;
    memoizedResultFunc: ((resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => string) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string;
    dependencies: [(state: AppState) => T];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const contentOfFile: <T extends FileContents>(selector: (state: AppState) => T) => ((state: {
    initialLoad: boolean;
    timestamp: number;
} & InputState) => string | Buffer<ArrayBufferLike>) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => string | Buffer<ArrayBufferLike>;
    memoizedResultFunc: ((resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => string | Buffer<ArrayBufferLike>) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | Buffer<ArrayBufferLike>;
    dependencies: [(state: AppState) => T];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const srcAndContentOfFile: <T extends FileContents>(selector: (state: AppState) => T, key: string) => ((state: {
    initialLoad: boolean;
    timestamp: number;
} & InputState) => {
    src: string;
    content: string | Buffer<ArrayBufferLike>;
}) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    };
    memoizedResultFunc: ((resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    }) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    };
    dependencies: [(state: AppState) => T];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const srcAndContentOfFiles: <T extends FileContents>(selector: (state: AppState) => T) => ((state: {
    initialLoad: boolean;
    timestamp: number;
} & InputState) => {
    src: string;
    content: string | Buffer<ArrayBufferLike>;
}[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    }[];
    memoizedResultFunc: ((resultFuncArgs_0: unknown extends T ? [T] extends [null] ? T : any : T) => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    }[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        src: string;
        content: string | Buffer<ArrayBufferLike>;
    }[];
    dependencies: [(state: AppState) => T];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
declare const _default: (funkophileConfig: FunkophileConfig) => void;
export default _default;
