import { Action } from "redux";
import Promise from "bluebird";
export type UpsertPayload = {
    key: string;
    src: string;
    contents: string | Buffer;
};
export type RemovePayload = {
    key: string;
    file: string;
};
export interface FileContents {
    [key: string]: string | Buffer;
}
export interface InputState {
    [key: string]: FileContents;
}
export type AppState = {
    timestamp: number;
} & InputState;
export interface FunkophileConfig {
    mode: "build" | "watch";
    initialState: InputState;
    options: {
        inFolder: string;
        outFolder: string;
    };
    encodings: Record<string, string[]>;
    inputs: Record<string, string>;
    outputs: (selectors: Record<string, (state: AppState) => FileContents>) => Record<string, string | Buffer | Promise<string | Buffer>>;
}
export declare const INITIALIZE = "INITIALIZE";
export declare const UPSERT = "UPSERT";
export declare const REMOVE = "REMOVE";
export declare const previousState: Record<string, unknown>;
export declare const basicPromise: Promise<void>;
export declare const logger: {
    watchError: (p: string) => void;
    watchReady: (p: string) => void;
    watchAdd: (p: string) => void;
    watchChange: (p: string) => void;
    watchUnlink: (p: string) => void;
    stateChange: () => void;
    cleaningEmptyfolder: (p: string) => void;
    readingFile: (p: string) => void;
    removedFile: (p: string) => void;
    writingString: (p: string) => void;
    writingFunction: (p: string) => void;
    writingPromise: (p: string) => void;
    writingError: (p: string, message: string) => void;
    waiting: () => void;
    done: () => void;
};
export declare function omit(key: string, obj: FileContents): FileContents;
export interface PayloadAction<T = unknown> extends Action<string> {
    payload: T;
}
export declare const contentsOfFiles: <T extends FileContents>(selector: (state: AppState) => T) => ((state: {
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
export declare const makeStore: (funkophileConfig: FunkophileConfig) => import("redux").Store<AppState, PayloadAction<boolean | UpsertPayload | RemovePayload>, unknown>;
export declare const makeFinalSelector: (funkophileConfig: FunkophileConfig) => (state: AppState) => Record<string, unknown>;
export declare const createInputSelectors: (funkophileConfig: FunkophileConfig) => Record<string, (state: AppState) => FileContents>;
