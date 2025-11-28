// index.ts
import path from "path";
import chokidar from "chokidar";
import fs from "fs";
import fse from "fs-extra";
import Promise2 from "bluebird";
import { createSelector } from "reselect";
import { createStore } from "redux";
import { glob } from "glob";
var INITIALIZE = "INITIALIZE";
var UPSERT = "UPSERT";
var REMOVE = "REMOVE";
var previousState = {};
var basicPromise = Promise2.resolve();
var logger = {
  watchError: (p) => console.log("\x1B[7m ! \x1B[0m" + p),
  watchReady: (p) => console.log("\x1B[7m\x1B[36m  <  \x1B[0m" + p),
  watchAdd: (p) => console.log("\x1B[7m\x1B[34m  +  \x1B[0m./" + p),
  watchChange: (p) => console.log("\x1B[7m\x1B[35m  *  \x1B[0m" + p),
  watchUnlink: (p) => console.log("\x1B[7m\x1B[31m  -  \x1B[0m./" + p),
  stateChange: () => console.log("\x1B[7m\x1B[31m --- Redux state changed --- \x1B[0m"),
  cleaningEmptyfolder: (p) => console.log("\x1B[31m\x1B[7m XXX! \x1B[0m" + p),
  readingFile: (p) => console.log("\x1B[31m <-- \x1B[0m" + p),
  removedFile: (p) => console.log("\x1B[31m\x1B[7m ??? \x1B[0m./" + p),
  writingString: (p) => console.log("\x1B[32m --> \x1B[0m" + p),
  writingFunction: (p) => console.log("\x1B[33m ... \x1B[0m" + p),
  writingPromise: (p) => console.log("\x1B[33m ... \x1B[0m" + p),
  writingError: (p, message) => console.log("\x1B[31m !!! \x1B[0m" + p + " " + message),
  waiting: () => console.log(
    "\x1B[7m Funkophile is done for now but waiting on changes...\x1B[0m "
  ),
  done: () => console.log("\x1B[7m Funkophile is done!\x1B[0m ")
};
function omit(key, obj) {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}
var contentsOfFiles = (selector) => {
  return createSelector([(state) => selector(state)], (selected) => {
    return Object.keys(selected).reduce((mm, k) => {
      const content = selected[k];
      return mm + (typeof content === "string" ? content : content.toString());
    }, "");
  });
};
var contentOfFile = (selector) => {
  return createSelector([(state) => selector(state)], (selected) => {
    if (!selected || Object.keys(selected).length === 0) {
      throw new Error("No files found");
    }
    return selected[Object.keys(selected)[0]];
  });
};
var srcAndContentOfFile = (selector, key) => {
  return createSelector([(state) => selector(state)], (selected) => {
    return {
      src: key,
      content: selected[key]
    };
  });
};
var srcAndContentOfFiles = (selector) => {
  return createSelector([(state) => selector(state)], (selected) => {
    const keys = Object.keys(selected);
    return keys.map((key) => {
      return {
        src: key,
        content: selected[key]
      };
    });
  });
};
var makeStore = (funkophileConfig) => createStore(
  (state = {
    // initialLoad: true,
    ...funkophileConfig.initialState,
    timestamp: Date.now()
  }, action) => {
    const typedAction = action;
    if (!action.type.includes("@@redux")) {
      if (typedAction.type === INITIALIZE) {
        return {
          ...state,
          timestamp: Date.now()
        };
      } else if (typedAction.type === UPSERT) {
        return {
          ...state,
          [typedAction.payload.key]: {
            ...state[typedAction.payload.key],
            ...{
              [typedAction.payload.src]: typedAction.payload.contents
            }
          },
          timestamp: Date.now()
        };
      } else if (typedAction.type === REMOVE) {
        return {
          ...state,
          [typedAction.payload.key]: omit(
            typedAction.payload.file,
            state[typedAction.payload.key]
          ),
          timestamp: Date.now()
        };
      } else {
        console.error(
          "Redux was asked to handle an unknown action type: " + action.type
        );
        process.exit(-1);
      }
    }
  }
);
var createInputSelectors = (funkophileConfig) => {
  return Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
    return {
      ...mm,
      [inputKey]: createSelector(
        [(state) => state],
        (root) => root[inputKey]
      )
    };
  }, {});
};
Promise2.config({
  cancellation: true
});
var outputPromise = basicPromise;
function cleanEmptyFoldersRecursively(folder) {
  var isDir = fs.statSync(folder).isDirectory();
  if (!isDir) {
    return;
  }
  var files = fs.readdirSync(folder);
  if (files.length > 0) {
    files.forEach(function(file) {
      var fullPath = path.join(folder, file);
    });
    files = fs.readdirSync(folder);
  }
  if (files.length == 0) {
    logger.cleaningEmptyfolder(folder);
    fs.rmdirSync(folder);
    return;
  }
}
var dispatchUpsert = (store, key, file, encodings) => {
  const fileType = path.basename(file).split(".")[1];
  let encoding = Object.keys(encodings).find((e) => {
    return encodings[e].includes(fileType);
  });
  logger.readingFile(file);
  store.dispatch({
    type: UPSERT,
    payload: {
      key,
      // key: path.relative(process.cwd(), key),
      src: file,
      contents: fse.readFileSync(file, encoding)
    }
  });
};
var index_default = (funkophileConfig) => {
  const store = makeStore(funkophileConfig);
  const finalSelector = funkophileConfig.outputs(
    Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
      return {
        ...mm,
        [inputKey]: createSelector([(x) => x], (root) => root[inputKey])
      };
    }, {})
  );
  Promise2.all(
    Object.keys(funkophileConfig.inputs).map((inputRuleKey) => {
      const p = path.resolve(
        `./${funkophileConfig.options.inFolder}/${funkophileConfig.inputs[inputRuleKey] || ""}`
      );
      return new Promise2((fulfill, reject) => {
        if (funkophileConfig.mode === "build") {
          glob(p, {}).then((files) => {
            files.forEach((file) => {
              dispatchUpsert(
                store,
                inputRuleKey,
                file,
                funkophileConfig.encodings
              );
            });
          }).then(() => {
            fulfill();
          });
        } else if (funkophileConfig.mode === "watch") {
          chokidar.watch(p, {}).on("error", (error) => {
            logger.watchError(p);
          }).on("ready", () => {
            logger.watchReady(p);
            fulfill();
          }).on("add", (p2) => {
            logger.watchAdd(p2);
            dispatchUpsert(
              store,
              inputRuleKey,
              p2,
              funkophileConfig.encodings
            );
          }).on("change", (p2) => {
            logger.watchChange(p2);
            dispatchUpsert(
              store,
              inputRuleKey,
              p2,
              funkophileConfig.encodings
            );
          }).on("unlink", (p2) => {
            logger.watchUnlink(p2);
            store.dispatch({
              type: REMOVE,
              payload: {
                key: inputRuleKey,
                file: p2
              }
            });
          }).on("unlinkDir", (p2) => {
            logger.watchUnlink(p2);
          });
        } else {
          console.error(
            `mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
          );
          process.exit(-1);
        }
      });
    })
  ).then(function() {
    store.subscribe(() => {
      const s = store.getState();
      logger.stateChange();
      const outputs = finalSelector(s);
      if (outputPromise.isPending()) {
        console.log("cancelling previous write!");
        outputPromise.cancel();
      }
      outputPromise = Promise2.all(
        Array.from(
          new Set(Object.keys(previousState).concat(Object.keys(outputs)))
        ).map((key) => {
          return new Promise2((fulfill, reject) => {
            if (!outputs[key]) {
              const file = funkophileConfig.options.outFolder + "/" + key;
              logger.removedFile(file);
              try {
                fse.unlinkSync("./" + file);
                cleanEmptyFoldersRecursively(
                  "./" + file.substring(0, file.lastIndexOf("/"))
                );
              } catch (ex) {
              } finally {
                return;
              }
            } else {
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
                    if (typeof res !== "string" && !Buffer.isBuffer(res)) {
                      throw new Error("Invalid content type");
                    }
                    fse.outputFile(relativeFilePath, res, fulfill);
                    logger.writingString(relativeFilePath);
                  });
                } else if (typeof contents === "string") {
                  fse.outputFile(relativeFilePath, contents, fulfill);
                  logger.writingString(relativeFilePath);
                } else if (Buffer.isBuffer(contents)) {
                  fse.outputFile(relativeFilePath, contents, fulfill);
                  logger.writingString(relativeFilePath);
                } else if (Array.isArray(contents)) {
                  fse.outputFile(
                    relativeFilePath,
                    JSON.stringify(contents),
                    fulfill
                  );
                  logger.writingString(relativeFilePath);
                } else if (typeof contents.then === "function") {
                  logger.writingPromise(relativeFilePath);
                  Promise2.resolve(contents).then(
                    function(value) {
                      if (value instanceof Error) {
                        logger.writingError(relativeFilePath, value.message);
                      } else {
                        fse.outputFile(relativeFilePath, value, fulfill);
                        logger.writingString(relativeFilePath);
                      }
                    },
                    function(value) {
                    }
                  );
                } else {
                  console.log(
                    `I don't recognize what this is but I will try to write it to a file: ` + relativeFilePath,
                    typeof contents,
                    contents
                  );
                  fse.outputFile(relativeFilePath, contents, fulfill);
                  logger.writingString(relativeFilePath);
                }
              } else {
                fulfill();
              }
            }
          });
        })
      ).then(() => {
        cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);
        if (funkophileConfig.mode === "build") {
          logger.done();
        } else if (funkophileConfig.mode === "watch") {
          logger.waiting();
        } else {
          console.error(
            `The mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
          );
          process.exit(-1);
        }
      });
    });
    store.dispatch({
      type: INITIALIZE,
      payload: true
    });
  });
};
export {
  INITIALIZE,
  REMOVE,
  UPSERT,
  basicPromise,
  contentOfFile,
  contentsOfFiles,
  createInputSelectors,
  index_default as default,
  logger,
  makeStore,
  omit,
  previousState,
  srcAndContentOfFile,
  srcAndContentOfFiles
};
//# sourceMappingURL=index.js.map
