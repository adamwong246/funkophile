export declare const contentsOfFiles: (selector: any) => ((state: unknown) => string) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: any) => string;
    memoizedResultFunc: ((resultFuncArgs_0: any) => string) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string;
    dependencies: [any];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const contentOfFile: (selector: any) => ((state: unknown) => any) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: any) => any;
    memoizedResultFunc: ((resultFuncArgs_0: any) => any) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => any;
    dependencies: [any];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const srcAndContentOfFile: (selector: any, key: string) => ((state: unknown) => {
    src: string;
    content: any;
}) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: any) => {
        src: string;
        content: any;
    };
    memoizedResultFunc: ((resultFuncArgs_0: any) => {
        src: string;
        content: any;
    }) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        src: string;
        content: any;
    };
    dependencies: [any];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const srcAndContentOfFiles: (selector: any) => ((state: unknown) => {
    src: string;
    content: any;
}[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: any) => {
        src: string;
        content: any;
    }[];
    memoizedResultFunc: ((resultFuncArgs_0: any) => {
        src: string;
        content: any;
    }[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        src: string;
        content: any;
    }[];
    dependencies: [any];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
