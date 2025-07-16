import chokidar from "chokidar";
import { createSelector } from "reselect";
import { createStore } from "redux";
import fs from "fs";
import fse from "fs-extra";
import { glob } from "glob";
import path from "path";
import Promise from "bluebird";
export const contentsOfFiles = (selector) => {
    return createSelector([selector], (selected) => {
        return Object.keys(selected).reduce((mm, k) => mm + selected[k], "");
    });
};
export const contentOfFile = (selector) => {
    return createSelector([selector], (selected) => {
        try {
            return selected[Object.keys(selected)[0]];
        }
        catch (e) {
            console.error("error", e);
            console.error("selected", selected);
            console.error("selector", selector);
            process.exit(-1);
        }
    });
};
export const srcAndContentOfFile = (selector, key) => {
    return createSelector([selector], (selected) => {
        return {
            src: key,
            content: selected[key],
        };
    });
};
export const srcAndContentOfFiles = (selector) => {
    return createSelector([selector], (selected) => {
        const keys = Object.keys(selected);
        return keys.map((key) => {
            return {
                src: key,
                content: selected[key],
            };
        });
    });
};
export default (funkophileConfig) => {
    Promise.config({
        cancellation: true,
    });
    const INITIALIZE = "INITIALIZE";
    const UPSERT = "UPSERT";
    const REMOVE = "REMOVE";
    const previousState = {};
    let outputPromise = Promise.resolve();
    const logger = {
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
    function cleanEmptyFoldersRecursively(folder) {
        var isDir = fs.statSync(folder).isDirectory();
        if (!isDir) {
            return;
        }
        var files = fs.readdirSync(folder);
        if (files.length > 0) {
            files.forEach(function (file) {
                var fullPath = path.join(folder, file);
            });
            // re-evaluate files; after deleting subfolder
            // we may have parent folder empty now
            files = fs.readdirSync(folder);
        }
        if (files.length == 0) {
            logger.cleaningEmptyfolder(folder);
            fs.rmdirSync(folder);
            return;
        }
    }
    const dispatchUpsert = (store, key, file, encodings) => {
        const fileType = path.basename(file).split(".")[1];
        let encoding = Object.keys(encodings).find((e) => {
            return encodings[e].includes(fileType);
        });
        logger.readingFile(file);
        store.dispatch({
            type: UPSERT,
            payload: {
                key: key,
                // key: path.relative(process.cwd(), key),
                src: file,
                contents: fse.readFileSync(file, encoding),
            },
        });
    };
    function omit(key, obj) {
        const { [key]: omitted, ...rest } = obj;
        return rest;
    }
    const store = createStore((state = {
        initialLoad: true,
        ...funkophileConfig.initialState,
        timestamp: Date.now(),
    }, action) => {
        // console.log("\u001b[7m\u001b[35m ||| Redux recieved action \u001b[0m", action.type)
        const typedAction = action;
        if (!action.type.includes("@@redux")) {
            if (typedAction.type === INITIALIZE) {
                return {
                    ...state,
                    initialLoad: false,
                    timestamp: Date.now(),
                };
            }
            else if (typedAction.type === UPSERT) {
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
            else if (typedAction.type === REMOVE) {
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
    const finalSelector = funkophileConfig.outputs(Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
        return {
            ...mm,
            [inputKey]: createSelector([(x) => x], (root) => root[inputKey]),
        };
    }, {}));
    // Wait for all the file watchers to check in
    Promise.all(Object.keys(funkophileConfig.inputs).map((inputRuleKey) => {
        const p = path.resolve(`./${funkophileConfig.options.inFolder}/${funkophileConfig.inputs[inputRuleKey] || ""}`);
        return new Promise((fulfill, reject) => {
            if (funkophileConfig.mode === "build") {
                glob(p, {})
                    .then((files) => {
                    files.forEach((file) => {
                        dispatchUpsert(store, inputRuleKey, file, funkophileConfig.encodings);
                    });
                })
                    .then(() => {
                    fulfill();
                });
            }
            else if (funkophileConfig.mode === "watch") {
                chokidar
                    .watch(p, {})
                    .on("error", (error) => {
                    logger.watchError(p);
                })
                    .on("ready", () => {
                    logger.watchReady(p);
                    fulfill();
                })
                    .on("add", (p) => {
                    logger.watchAdd(p);
                    dispatchUpsert(store, inputRuleKey, p, funkophileConfig.encodings);
                })
                    .on("change", (p) => {
                    logger.watchChange(p);
                    dispatchUpsert(store, inputRuleKey, p, funkophileConfig.encodings);
                })
                    .on("unlink", (p) => {
                    logger.watchUnlink(p);
                    store.dispatch({
                        type: REMOVE,
                        payload: {
                            key: inputRuleKey,
                            file: p,
                        },
                    });
                })
                    .on("unlinkDir", (p) => {
                    logger.watchUnlink(p);
                });
                // .on('raw', (event, p, details) => { // internal
                //   log('Raw event info:', event, p, details);
                // })
            }
            else {
                console.error(`mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`);
                process.exit(-1);
            }
        });
    })).then(function () {
        // listen for changes to the store
        store.subscribe(() => {
            const s = store.getState();
            logger.stateChange();
            const outputs = finalSelector(s);
            if (outputPromise.isPending()) {
                console.log("cancelling previous write!");
                outputPromise.cancel();
            }
            outputPromise = Promise.all(Array.from(new Set(Object.keys(previousState).concat(Object.keys(outputs)))).map((key) => {
                return new Promise((fulfill, reject) => {
                    if (!outputs[key]) {
                        const file = funkophileConfig.options.outFolder + "/" + key;
                        logger.removedFile(file);
                        try {
                            fse.unlinkSync("./" + file);
                            cleanEmptyFoldersRecursively("./" + file.substring(0, file.lastIndexOf("/")));
                        }
                        catch (ex) {
                            // console.error('inner', ex.message);
                            // throw ex;
                        }
                        finally {
                            // console.log('finally');
                            return;
                        }
                        // delete previousState[key]
                        // fulfill()
                    }
                    else {
                        if (outputs[key] !== previousState[key]) {
                            previousState[key] = outputs[key];
                            const relativeFilePath = "./" + funkophileConfig.options.outFolder + "/" + key;
                            const contents = outputs[key];
                            if (typeof contents === "function") {
                                logger.writingFunction(relativeFilePath);
                                contents((err, res) => {
                                    if (err) {
                                        throw err;
                                    }
                                    if (typeof res !== 'string' && !Buffer.isBuffer(res)) {
                                        throw new Error('Invalid content type');
                                    }
                                    fse.outputFile(relativeFilePath, res, fulfill);
                                    logger.writingString(relativeFilePath);
                                });
                            }
                            else if (typeof contents === "string") {
                                fse.outputFile(relativeFilePath, contents, fulfill);
                                logger.writingString(relativeFilePath);
                            }
                            else if (Buffer.isBuffer(contents)) {
                                fse.outputFile(relativeFilePath, contents, fulfill);
                                logger.writingString(relativeFilePath);
                            }
                            else if (Array.isArray(contents)) {
                                fse.outputFile(relativeFilePath, JSON.stringify(contents), fulfill);
                                logger.writingString(relativeFilePath);
                            }
                            else if (typeof contents.then === "function") {
                                logger.writingPromise(relativeFilePath);
                                Promise.resolve(contents).then(function (value) {
                                    if (value instanceof Error) {
                                        logger.writingError(relativeFilePath, value.message);
                                    }
                                    else {
                                        fse.outputFile(relativeFilePath, value, fulfill);
                                        logger.writingString(relativeFilePath);
                                    }
                                }, function (value) {
                                    // not called
                                });
                            }
                            else {
                                console.log(`I don't recognize what this is but I will try to write it to a file: ` +
                                    relativeFilePath, typeof contents, contents);
                                fse.outputFile(relativeFilePath, contents, fulfill);
                                logger.writingString(relativeFilePath);
                            }
                        }
                        else {
                            fulfill();
                        }
                    }
                });
            })).then(() => {
                cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);
                if (funkophileConfig.mode === "build") {
                    logger.done();
                }
                else if (funkophileConfig.mode === "watch") {
                    logger.waiting();
                }
                else {
                    console.error(`The mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`);
                    process.exit(-1);
                }
            });
        });
        // lastly, turn the store `on`.
        // This is to prevent unecessary recomputations when initialy adding files to redux
        store.dispatch({
            type: INITIALIZE,
            payload: true,
        });
    });
};
