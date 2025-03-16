"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var chokidar_1 = require("chokidar");
var reselect_1 = require("reselect");
var redux_1 = require("redux");
var fs_1 = require("fs");
var fs_extra_1 = require("fs-extra");
var glob_promise_1 = require("glob-promise");
var path_1 = require("path");
var bluebird_1 = require("bluebird");
if (process.argv[2] && (process.argv[3] === "watch" || process.argv[3] === "build")) {
    var configFile = path_1.default.resolve(process.argv[2]);
    var mode_1 = process.argv[3];
    // console.log("configfile", configFile);
    Promise.resolve("".concat(configFile)).then(function (s) { return require(s); }).then(function (funkophileConfigModule) {
        var funkophileConfig = funkophileConfigModule.default;
        // console.log("funkophileConfig", (funkophileConfig));
        bluebird_1.default.config({
            cancellation: true
        });
        var INITIALIZE = 'INITIALIZE';
        var UPSERT = 'UPSERT';
        var REMOVE = 'REMOVE';
        var previousState = {};
        var outputPromise = bluebird_1.default.resolve();
        var logger = {
            watchError: function (p) { return console.log("\u001b[7m ! \u001b[0m" + p); },
            watchReady: function (p) { return console.log("\u001b[7m\u001b[36m  <  \u001b[0m" + p); },
            watchAdd: function (p) { return console.log("\u001b[7m\u001b[34m  +  \u001b[0m./" + p); },
            watchChange: function (p) { return console.log("\u001b[7m\u001b[35m  *  \u001b[0m" + p); },
            watchUnlink: function (p) { return console.log("\u001b[7m\u001b[31m  -  \u001b[0m./" + p); },
            stateChange: function () { return console.log("\u001b[7m\u001b[31m --- Redux state changed --- \u001b[0m"); },
            cleaningEmptyfolder: function (p) { return console.log("\u001b[31m\u001b[7m XXX! \u001b[0m" + p); },
            readingFile: function (p) { return console.log("\u001b[31m <-- \u001b[0m" + p); },
            removedFile: function (p) { return console.log("\u001b[31m\u001b[7m ??? \u001b[0m./" + p); },
            writingString: function (p) { return console.log("\u001b[32m --> \u001b[0m" + p); },
            writingFunction: function (p) { return console.log("\u001b[33m ... \u001b[0m" + p); },
            writingPromise: function (p) { return console.log("\u001b[33m ... \u001b[0m" + p); },
            writingError: function (p, message) { return console.log("\u001b[31m !!! \u001b[0m" + p + " " + message); },
            waiting: function () { return console.log("\u001b[7m Funkophile is done for now but waiting on changes...\u001b[0m "); },
            done: function () { return console.log("\u001b[7m Funkophile is done!\u001b[0m "); }
        };
        function cleanEmptyFoldersRecursively(folder) {
            var isDir = fs_1.default.statSync(folder).isDirectory();
            if (!isDir) {
                return;
            }
            var files = fs_1.default.readdirSync(folder);
            if (files.length > 0) {
                files.forEach(function (file) {
                    var fullPath = path_1.default.join(folder, file);
                });
                // re-evaluate files; after deleting subfolder
                // we may have parent folder empty now
                files = fs_1.default.readdirSync(folder);
            }
            if (files.length == 0) {
                logger.cleaningEmptyfolder(folder);
                fs_1.default.rmdirSync(folder);
                return;
            }
        }
        var dispatchUpsert = function (store, key, file, encodings) {
            var fileType = file.split('.').slice(-2, -1)[0];
            var encoding = Object.keys(encodings).find(function (e) { return encodings[e].includes(fileType); });
            if (!fileType || !encoding) {
                console.log("Unknown file type for ", file, "Defaulting to utf8");
                encoding = 'utf8';
            }
            // console.log("dispatchUpsert", encoding, file)
            logger.readingFile(file);
            store.dispatch({
                type: UPSERT,
                payload: {
                    key: key,
                    src: file,
                    contents: fs_extra_1.default.readFileSync(file, encoding)
                }
            });
        };
        function omit(key, obj) {
            var _a = obj, _b = key, omitted = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
            return rest;
        }
        var store = (0, redux_1.createStore)(function (state, action) {
            var _a, _b, _c;
            if (state === void 0) { state = __assign(__assign({ initialLoad: true }, funkophileConfig.initialState), { timestamp: Date.now() }); }
            // console.log("\u001b[7m\u001b[35m ||| Redux recieved action \u001b[0m", action.type)
            if (!action.type.includes('@@redux')) {
                if (action.type === INITIALIZE) {
                    return __assign(__assign({}, state), { initialLoad: false, timestamp: Date.now() });
                }
                else if (action.type === UPSERT) {
                    return __assign(__assign({}, state), (_a = {}, _a[action['payload'].key] = __assign(__assign({}, state[action.payload.key]), (_b = {},
                        _b[action['payload'].src] = action['payload'].contents,
                        _b)), _a.timestamp = Date.now(), _a));
                }
                else if (action.type === REMOVE) {
                    return __assign(__assign({}, state), (_c = {}, _c[action['payload'].key] = omit(action['payload'].file, state[action['payload'].key]), _c.timestamp = Date.now(), _c));
                }
                else {
                    console.error("Redux was asked to handle an unknown action type: " + action.type);
                    process.exit(-1);
                }
                // return state
            }
        });
        var finalSelector = funkophileConfig.outputs(Object.keys(funkophileConfig.inputs).reduce(function (mm, inputKey) {
            var _a;
            return __assign(__assign({}, mm), (_a = {}, _a[inputKey] = (0, reselect_1.createSelector)([function (x) { return x; }], function (root) { return root[inputKey]; }), _a));
        }, {}));
        // Wait for all the file watchers to check in
        bluebird_1.default.all(Object.keys(funkophileConfig.inputs)
            .map(function (inputRuleKey) {
            var p = path_1.default.resolve("./".concat(funkophileConfig.options.inFolder, "/").concat(funkophileConfig.inputs[inputRuleKey] || ''));
            return new bluebird_1.default(function (fulfill, reject) {
                if (mode_1 === "build") {
                    (0, glob_promise_1.default)(p, {}).then(function (files) {
                        files.forEach(function (file) {
                            dispatchUpsert(store, inputRuleKey, file, funkophileConfig.encodings);
                        });
                    }).then(function () {
                        fulfill();
                    });
                }
                else if (mode_1 === "watch") {
                    chokidar_1.default.watch(p, {})
                        .on('error', function (error) {
                        logger.watchError(p);
                    })
                        .on('ready', function () {
                        logger.watchReady(p);
                        fulfill();
                    })
                        .on('add', function (p) {
                        logger.watchAdd(p);
                        dispatchUpsert(store, inputRuleKey, './' + p, funkophileConfig.encodings);
                    })
                        .on('change', function (p) {
                        logger.watchChange(p);
                        dispatchUpsert(store, inputRuleKey, './' + p, funkophileConfig.encodings);
                    })
                        .on('unlink', function (p) {
                        logger.watchUnlink(p);
                        store.dispatch({
                            type: REMOVE,
                            payload: {
                                key: inputRuleKey,
                                file: './' + p
                            }
                        });
                    })
                        .on('unlinkDir', function (p) {
                        logger.watchUnlink(p);
                    });
                    // .on('raw', (event, p, details) => { // internal
                    //   log('Raw event info:', event, p, details);
                    // })
                }
                else {
                    console.error("The 3rd argument should be 'watch' or 'build', not \"".concat(mode_1, "\""));
                    process.exit(-1);
                }
            });
        })).then(function () {
            // listen for changes to the store
            store.subscribe(function () {
                var s = store.getState();
                logger.stateChange();
                var outputs = finalSelector(s);
                if (outputPromise.isPending()) {
                    console.log('cancelling previous write!');
                    outputPromise.cancel();
                }
                outputPromise = bluebird_1.default.all(Array.from(new Set(Object.keys(previousState).concat(Object.keys(outputs))))
                    .map(function (key) {
                    return new bluebird_1.default(function (fulfill, reject) {
                        if (!outputs[key]) {
                            var file = funkophileConfig.options.outFolder + "/" + key;
                            logger.removedFile(file);
                            try {
                                fs_extra_1.default.unlinkSync('./' + file);
                                cleanEmptyFoldersRecursively('./' + file.substring(0, file.lastIndexOf("/")));
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
                                var relativeFilePath_1 = './' + funkophileConfig.options.outFolder + "/" + key;
                                var contents = outputs[key];
                                if (typeof contents === "function") {
                                    logger.writingFunction(relativeFilePath_1);
                                    contents(function (err, res) {
                                        fs_extra_1.default.outputFile(relativeFilePath_1, res, fulfill);
                                        logger.writingString(relativeFilePath_1);
                                    });
                                }
                                else if (typeof contents === 'string') {
                                    fs_extra_1.default.outputFile(relativeFilePath_1, contents, fulfill);
                                    logger.writingString(relativeFilePath_1);
                                }
                                else if (Buffer.isBuffer(contents)) {
                                    fs_extra_1.default.outputFile(relativeFilePath_1, contents, fulfill);
                                    logger.writingString(relativeFilePath_1);
                                }
                                else if (Array.isArray(contents)) {
                                    fs_extra_1.default.outputFile(relativeFilePath_1, JSON.stringify(contents), fulfill);
                                    logger.writingString(relativeFilePath_1);
                                }
                                else if (typeof contents.then === 'function') {
                                    logger.writingPromise(relativeFilePath_1);
                                    bluebird_1.default.resolve(contents).then(function (value) {
                                        if (value instanceof Error) {
                                            logger.writingError(relativeFilePath_1, value.message);
                                        }
                                        else {
                                            fs_extra_1.default.outputFile(relativeFilePath_1, value, fulfill);
                                            logger.writingString(relativeFilePath_1);
                                        }
                                    }, function (value) {
                                        // not called
                                    });
                                }
                                else if (typeof contents === 'object') {
                                    fs_extra_1.default.outputFile(relativeFilePath_1, JSON.stringify(contents), fulfill);
                                    logger.writingString(relativeFilePath_1);
                                }
                                else {
                                    console.log("I don't recognize what this is but I will try to write it to a file: " + relativeFilePath_1, typeof contents, contents);
                                    fs_extra_1.default.outputFile(relativeFilePath_1, contents, fulfill);
                                    logger.writingString(relativeFilePath_1);
                                }
                            }
                            else {
                                fulfill();
                            }
                        }
                    });
                })).then(function () {
                    cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);
                    if (mode_1 === "build") {
                        logger.done();
                    }
                    else if (mode_1 === "watch") {
                        logger.waiting();
                    }
                    else {
                        console.error("The 3rd argument should be 'watch' or 'build', not \"".concat(mode_1, "\""));
                        process.exit(-1);
                    }
                });
            });
            // lastly, turn the store `on`.
            // This is to prevent unecessary recomputations when initialy adding files to redux
            store.dispatch({
                type: INITIALIZE,
                payload: true
            });
        });
    });
}
else {
    console.error("command line arguments do not make sense");
    console.error("first argument should be a funkophile config file");
    console.error("second argument should be a 'build' or 'watch'");
    console.error("You passed", process.argv);
    process.exit(-1);
}
