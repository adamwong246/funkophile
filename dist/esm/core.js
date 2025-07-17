"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInputSelectors = exports.makeFinalSelector = exports.makeStore = exports.srcAndContentOfFiles = exports.srcAndContentOfFile = exports.contentOfFile = exports.contentsOfFiles = exports.logger = exports.basicPromise = exports.previousState = exports.REMOVE = exports.UPSERT = exports.INITIALIZE = void 0;
exports.omit = omit;
const reselect_1 = require("reselect");
const redux_1 = require("redux");
const bluebird_1 = __importDefault(require("bluebird"));
exports.INITIALIZE = "INITIALIZE";
exports.UPSERT = "UPSERT";
exports.REMOVE = "REMOVE";
exports.previousState = {};
exports.basicPromise = bluebird_1.default.resolve();
exports.logger = {
    watchError: (p) => console.log("\u001b[7m ! \u001b[0m" + p),
    watchReady: (p) => console.log("\u001b[7m\u001b[36m  <  \u001b[0m" + p),
    watchAdd: (p) => console.log("\u001b[7m\u001b[34m  +  \u001b[0m./" + p),
    watchChange: (p) => console.log("\u001b[7m\u001b[35m  *  \u001b[0m" + p),
    watchUnlink: (p) => console.log("\u001b[7m\u001b[31m  -  \u001b[0m./" + p),
    stateChange: () => console.log("\u001b[7m\u001b[31m --- Redux state changed --- \u001b[0m"),
    cleaningEmptyfolder: (p) => console.log("\u001b[31m\u001b[7m XXX! \u001b[0m" + p),
    readingFile: (p) => console.log("\u001b[31m <-- \u001b[0m" + p),
    removedFile: (p) => console.log("\u001b[31m\u001b[7m ??? \u001b[0m./" + p),
    writingString: (p) => console.log("\u001b[32m --> \u001b[0m" + p),
    writingFunction: (p) => console.log("\u001b[33m ... \u001b[0m" + p),
    writingPromise: (p) => console.log("\u001b[33m ... \u001b[0m" + p),
    writingError: (p, message) => console.log("\u001b[31m !!! \u001b[0m" + p + " " + message),
    waiting: () => console.log("\u001b[7m Funkophile is done for now but waiting on changes...\u001b[0m "),
    done: () => console.log("\u001b[7m Funkophile is done!\u001b[0m "),
};
function omit(key, obj) {
    const { [key]: omitted, ...rest } = obj;
    return rest;
}
const contentsOfFiles = (selector) => {
    return (0, reselect_1.createSelector)([(state) => selector(state)], (selected) => {
        return Object.keys(selected).reduce((mm, k) => {
            const content = selected[k];
            return mm + (typeof content === 'string' ? content : content.toString());
        }, "");
    });
};
exports.contentsOfFiles = contentsOfFiles;
const contentOfFile = (selector) => {
    return (0, reselect_1.createSelector)([(state) => selector(state)], (selected) => {
        if (!selected || Object.keys(selected).length === 0) {
            throw new Error("No files found");
        }
        return selected[Object.keys(selected)[0]];
    });
};
exports.contentOfFile = contentOfFile;
const srcAndContentOfFile = (selector, key) => {
    return (0, reselect_1.createSelector)([(state) => selector(state)], (selected) => {
        return {
            src: key,
            content: selected[key],
        };
    });
};
exports.srcAndContentOfFile = srcAndContentOfFile;
const srcAndContentOfFiles = (selector) => {
    return (0, reselect_1.createSelector)([(state) => selector(state)], (selected) => {
        const keys = Object.keys(selected);
        return keys.map((key) => {
            return {
                src: key,
                content: selected[key],
            };
        });
    });
};
exports.srcAndContentOfFiles = srcAndContentOfFiles;
const makeStore = (funkophileConfig) => (0, redux_1.createStore)((state = {
    // initialLoad: true,
    ...funkophileConfig.initialState,
    timestamp: Date.now(),
}, action) => {
    // console.log("\u001b[7m\u001b[35m ||| Redux recieved action \u001b[0m", action.type)
    const typedAction = action;
    if (!action.type.includes("@@redux")) {
        if (typedAction.type === exports.INITIALIZE) {
            return {
                ...state,
                timestamp: Date.now(),
            };
        }
        else if (typedAction.type === exports.UPSERT) {
            return {
                ...state,
                [typedAction.payload.key]: {
                    ...state[typedAction.payload.key],
                    ...{
                        [typedAction.payload.src]: typedAction.payload.contents,
                    },
                },
                timestamp: Date.now(),
            };
        }
        else if (typedAction.type === exports.REMOVE) {
            return {
                ...state,
                [typedAction.payload.key]: omit(typedAction.payload.file, state[typedAction.payload.key]),
                timestamp: Date.now(),
            };
        }
        else {
            console.error("Redux was asked to handle an unknown action type: " + action.type);
            process.exit(-1);
        }
        // return state
    }
});
exports.makeStore = makeStore;
const makeFinalSelector = (funkophileConfig) => {
    const inputSelectors = (0, exports.createInputSelectors)(funkophileConfig);
    const outputFunctions = funkophileConfig.outputs(inputSelectors);
    return (state) => {
        const results = {};
        for (const [key, fn] of Object.entries(outputFunctions)) {
            results[key] = typeof fn === 'function' ? fn(state) : fn;
        }
        return results;
    };
};
exports.makeFinalSelector = makeFinalSelector;
const createInputSelectors = (funkophileConfig) => {
    return Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
        return {
            ...mm,
            [inputKey]: (0, reselect_1.createSelector)([(state) => state], (root) => root[inputKey]),
        };
    }, {});
};
exports.createInputSelectors = createInputSelectors;
