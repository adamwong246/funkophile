// index.ts
import Promise2 from "bluebird";
import fse2 from "fs-extra";

// utils.ts
import fs from "fs";
import fse from "fs-extra";
import http from "http";
import path from "path";
import { createStore } from "redux";
import { createSelector } from "reselect";
import url from "url";
import { glob } from "glob";
import chokidar from "chokidar";
var INITIALIZE = "INITIALIZE";
var UPSERT = "UPSERT";
var REMOVE = "REMOVE";
var previousState = {};
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
function omit(key, obj) {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}
function newStore(funkophileConfig) {
  const initialInputState = Object.keys(funkophileConfig.inputs).reduce(
    (state, inputKey) => {
      state[inputKey] = {};
      return state;
    },
    {}
  );
  return createStore(
    (state = {
      initialLoad: true,
      ...initialInputState,
      ...funkophileConfig.initialState,
      timestamp: Date.now()
    }, action) => {
      if (state === void 0) {
        throw new Error("Redux state is undefined. This should never happen.");
      }
      console.log(
        `\x1B[35m\x1B[1m[Funkophile]\x1B[0m Redux received action: ${action.type}`
      );
      if (!action.type.includes("@@redux")) {
        if (action.type === INITIALIZE) {
          console.log(
            `\x1B[35m\x1B[1m[Funkophile]\x1B[0m INITIALIZE action - setting initialLoad to false`
          );
          return {
            ...state,
            initialLoad: false,
            timestamp: Date.now()
          };
        } else if (action.type === UPSERT) {
          console.log(
            `\x1B[35m\x1B[1m[Funkophile]\x1B[0m UPSERT action for key: ${action["payload"].key}, file: ${action["payload"].src}`
          );
          return {
            ...state,
            [action["payload"].key]: {
              // @ts-ignore
              ...state[action.payload.key],
              ...{
                [action["payload"].src]: action["payload"].contents
              }
            },
            timestamp: Date.now()
          };
        } else if (action.type === REMOVE) {
          console.log(
            `\x1B[35m\x1B[1m[Funkophile]\x1B[0m REMOVE action for key: ${action["payload"].key}, file: ${action["payload"].file}`
          );
          const currentKeyState = state[action["payload"].key] || {};
          return {
            ...state,
            [action["payload"].key]: omit(
              action["payload"].file,
              currentKeyState
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
      return state;
    }
  );
}
function makeFinalSelector(funkophileConfig) {
  return funkophileConfig.outputs(
    Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
      return {
        ...mm,
        [inputKey]: createSelector([(x) => x], (root) => {
          const result = root[inputKey];
          if (result === void 0) {
            console.warn(
              `\x1B[33m\x1B[1m[Funkophile]\x1B[0m Input key "${inputKey}" is undefined in state, which shouldn't happen. Using empty object.`
            );
            return {};
          }
          return result;
        })
      };
    }, {})
  );
}
function startServing(funkophileConfig) {
  const port = funkophileConfig.options.port || 8080;
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad Request");
      return;
    }
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    if (pathname && pathname.endsWith("/")) {
      pathname += "index.html";
    }
    const filePath = pathname ? pathname.substring(1) : "index.html";
    const fullPath = path.join(
      process.cwd(),
      funkophileConfig.options.outFolder,
      filePath
    );
    fs.access(fullPath, fs.constants.F_OK, (err) => {
      if (err) {
        const htmlPath = fullPath + ".html";
        fs.access(htmlPath, fs.constants.F_OK, (htmlErr) => {
          if (htmlErr) {
            res.statusCode = 404;
            res.end("File not found");
          } else {
            fs.readFile(htmlPath, (readErr, data) => {
              if (readErr) {
                res.statusCode = 500;
                res.end("Internal Server Error");
              } else {
                res.setHeader("Content-Type", "text/html");
                res.end(data);
              }
            });
          }
        });
      } else {
        fs.readFile(fullPath, (readErr, data) => {
          if (readErr) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          } else {
            const ext = path.extname(fullPath).toLowerCase();
            const contentTypes = {
              ".html": "text/html",
              ".css": "text/css",
              ".js": "application/javascript",
              ".json": "application/json",
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".jpeg": "image/jpeg",
              ".gif": "image/gif",
              ".svg": "image/svg+xml",
              ".ico": "image/x-icon"
            };
            res.setHeader(
              "Content-Type",
              contentTypes[ext] || "application/octet-stream"
            );
            res.end(data);
          }
        });
      }
    });
  });
  server.listen(port, () => {
    console.log(
      `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Server running at http://localhost:${port}/`
    );
  });
  process.on("SIGINT", () => {
    if (server) {
      server.close();
    }
  });
}
function logInputKeys(funkophileConfig, currentState) {
  Object.keys(funkophileConfig.inputs).forEach((inputKey) => {
    if (currentState[inputKey]) {
      console.log(
        `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Input key "${inputKey}" found in state with ${Object.keys(currentState[inputKey]).length} files`
      );
      if (Object.keys(currentState[inputKey]).length > 0) {
        console.log(
          `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Files for "${inputKey}":`,
          Object.keys(currentState[inputKey])
        );
      }
    } else {
      console.warn(
        `\x1B[33m\x1B[1m[Funkophile]\x1B[0m Input key "${inputKey}" NOT found in state`
      );
    }
  });
}
function logDone(funkophileConfig, currentState) {
  if (funkophileConfig.mode === "build") {
    console.log(
      "\x1B[32m\x1B[1m[Funkophile]\x1B[0m Build completed successfully!"
    );
    logger.done();
  } else if (funkophileConfig.mode === "watch") {
    console.log(
      "\x1B[36m\x1B[1m[Funkophile]\x1B[0m Watching for file changes..."
    );
    const port = funkophileConfig.options.port || 8080;
    console.log(
      `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Serving at: http://localhost:${port}/`
    );
    logger.waiting();
  } else {
    throw `\x1B[31m\x1B[1m[Funkophile]\x1B[0m The mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`;
  }
}
function makePromissesArray(funkophileConfig, store) {
  return Object.keys(funkophileConfig.inputs).map((inputRuleKey) => {
    const pattern = funkophileConfig.inputs[inputRuleKey] || "";
    const globPattern = path.posix.join(
      funkophileConfig.options.inFolder,
      pattern
    );
    return new Promise((fulfill, reject) => {
      if (funkophileConfig.mode === "build") {
        glob(globPattern, { cwd: process.cwd() }).then((files) => {
          if (files.length === 0) {
            console.warn(
              `No files found for input key "${inputRuleKey}" with pattern "${globPattern}"`
            );
          } else {
            files.forEach((file) => {
              const absoluteFilePath = path.resolve(process.cwd(), file);
              dispatchUpsert(
                store,
                inputRuleKey,
                absoluteFilePath,
                funkophileConfig.encodings
              );
            });
          }
        }).then(() => {
          fulfill();
        }).catch((error) => {
          reject(error);
        });
      } else if (funkophileConfig.mode === "watch") {
        console.log(
          `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Setting up watcher for pattern: ${globPattern}`
        );
        console.log(
          `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Current working directory: ${process.cwd()}`
        );
        glob(globPattern, { cwd: process.cwd() }).then((files) => {
          console.log(
            `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Found ${files.length} initial files for ${inputRuleKey}`
          );
          files.forEach((file) => {
            const absoluteFilePath = path.resolve(process.cwd(), file);
            console.log(
              `\x1B[32m\x1B[1m[Funkophile]\x1B[0m Adding initial file: ${file}`
            );
            dispatchUpsert(
              store,
              inputRuleKey,
              absoluteFilePath,
              funkophileConfig.encodings
            );
          });
          const watcher = chokidar.watch(globPattern, {
            cwd: process.cwd(),
            ignoreInitial: true,
            // We've already processed initial files
            persistent: true,
            usePolling: false,
            interval: 100,
            binaryInterval: 300,
            alwaysStat: false,
            depth: 99,
            awaitWriteFinish: {
              stabilityThreshold: 50,
              pollInterval: 10
            }
          }).on("error", (error) => {
            console.error(
              `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Watcher error for pattern ${globPattern}:`,
              error
            );
            logger.watchError(globPattern);
          }).on("add", (filePath) => {
            console.log(
              `\x1B[32m\x1B[1m[Funkophile]\x1B[0m File added: ${filePath}`
            );
            logger.watchAdd(filePath);
            const absoluteFilePath = path.resolve(process.cwd(), filePath);
            console.log(
              `\x1B[32m\x1B[1m[Funkophile]\x1B[0m Dispatching UPSERT for key: ${inputRuleKey}, file: ${absoluteFilePath}`
            );
            dispatchUpsert(
              store,
              inputRuleKey,
              absoluteFilePath,
              funkophileConfig.encodings
            );
          }).on("change", (filePath) => {
            console.log(
              `\x1B[33m\x1B[1m[Funkophile]\x1B[0m File changed: ${filePath}`
            );
            logger.watchChange(filePath);
            const absoluteFilePath = path.resolve(process.cwd(), filePath);
            console.log(
              `\x1B[33m\x1B[1m[Funkophile]\x1B[0m Dispatching UPSERT for key: ${inputRuleKey}, file: ${absoluteFilePath}`
            );
            dispatchUpsert(
              store,
              inputRuleKey,
              absoluteFilePath,
              funkophileConfig.encodings
            );
          }).on("unlink", (filePath) => {
            console.log(
              `\x1B[31m\x1B[1m[Funkophile]\x1B[0m File removed: ${filePath}`
            );
            logger.watchUnlink(filePath);
            const absoluteFilePath = path.resolve(process.cwd(), filePath);
            console.log(
              `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Dispatching REMOVE for key: ${inputRuleKey}, file: ${absoluteFilePath}`
            );
            store.dispatch({
              type: REMOVE,
              payload: {
                key: inputRuleKey,
                file: absoluteFilePath
              }
            });
          }).on("unlinkDir", (filePath) => {
            console.log(
              `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Directory removed: ${filePath}`
            );
            logger.watchUnlink(filePath);
          }).on("raw", (event, path2, details) => {
            console.log(
              `\x1B[90m\x1B[1m[Funkophile]\x1B[0m Raw event: ${event} for path: ${path2}`
            );
          });
          console.log(
            `\x1B[32m\x1B[1m[Funkophile]\x1B[0m Watcher is ready for pattern: ${globPattern}`
          );
          logger.watchReady(globPattern);
          fulfill();
        }).catch((error) => {
          console.error(
            `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Error processing initial files for pattern ${globPattern}:`,
            error
          );
          reject(error);
        });
      } else {
        console.error(
          `mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
        );
        process.exit(-1);
      }
    });
  });
}

// index.ts
Promise2.config({
  cancellation: true
});
var index_default = (funkophileConfig) => {
  let outputPromise = Promise2.resolve();
  const store = newStore(funkophileConfig);
  const finalSelector = makeFinalSelector(funkophileConfig);
  if (funkophileConfig.mode === "watch") {
    startServing(funkophileConfig);
  }
  Promise2.all(
    makePromissesArray(funkophileConfig, store)
  ).then(function() {
    console.log(
      "\x1B[32m\x1B[1m[Funkophile]\x1B[0m All input watchers are ready. Setting up store subscription..."
    );
    store.subscribe(() => {
      const s = store.getState();
      console.log(
        `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Store updated. initialLoad: ${s.initialLoad}, timestamp: ${s.timestamp}`
      );
      if (s.initialLoad) {
        console.log(
          "\x1B[36m\x1B[1m[Funkophile]\x1B[0m Initial load in progress, skipping processing..."
        );
        console.log(
          "\x1B[36m\x1B[1m[Funkophile]\x1B[0m State keys during initial load:",
          Object.keys(s)
        );
        return;
      }
      logger.stateChange();
      console.log(
        "\x1B[36m\x1B[1m[Funkophile]\x1B[0m Processing state changes..."
      );
      console.log(
        "\x1B[36m\x1B[1m[Funkophile]\x1B[0m Current state keys:",
        Object.keys(s)
      );
      let outputs;
      try {
        outputs = finalSelector(s);
        console.log(
          `\x1B[36m\x1B[1m[Funkophile]\x1B[0m Generated ${Object.keys(outputs).length} outputs`
        );
      } catch (error) {
        console.error(
          "\x1B[31m\x1B[1m[Funkophile]\x1B[0m FATAL: Error in output selector chain ? :"
        );
        console.error("  Error:", error.message);
        console.error("  Stack:", error.stack);
        if (funkophileConfig.mode === "build") {
          process.exit(1);
        } else {
          console.log(
            "\x1B[33m\x1B[1m[Funkophile]\x1B[0m Continuing to watch for changes despite error..."
          );
          Object.keys(previousState).forEach((key) => {
            delete previousState[key];
          });
          return;
        }
      }
      if (outputPromise.isPending()) {
        console.log(
          "\x1B[33m\x1B[1m[Funkophile]\x1B[0m Cancelling previous write operation!"
        );
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
              console.log(
                `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Removing file: ${file}`
              );
              try {
                fse2.unlinkSync("./" + file);
                cleanEmptyFoldersRecursively(
                  "./" + file.substring(0, file.lastIndexOf("/"))
                );
              } catch (ex) {
                console.error(
                  `\x1B[31m\x1B[1m[Funkophile]\x1B[0m Error removing file ${file}:`,
                  ex.message
                );
              } finally {
                delete previousState[key];
                fulfill();
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
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      fse2.outputFile(relativeFilePath, res, (err2) => {
                        if (err2) {
                          logger.writingError(relativeFilePath, err2.message);
                          fulfill();
                        } else {
                          logger.writingString(relativeFilePath);
                          fulfill();
                        }
                      });
                    }
                  });
                } else if (typeof contents === "string") {
                  fse2.outputFile(relativeFilePath, contents, (err) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                } else if (Buffer.isBuffer(contents)) {
                  fse2.outputFile(relativeFilePath, contents, (err) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                } else if (Array.isArray(contents)) {
                  fse2.outputFile(
                    relativeFilePath,
                    JSON.stringify(contents),
                    (err) => {
                      if (err) {
                        logger.writingError(relativeFilePath, err.message);
                        fulfill();
                      } else {
                        logger.writingString(relativeFilePath);
                        fulfill();
                      }
                    }
                  );
                } else if (typeof contents.then === "function") {
                  logger.writingPromise(relativeFilePath);
                  Promise2.resolve(contents).then(
                    function(value) {
                      if (value instanceof Error) {
                        logger.writingError(relativeFilePath, value.message);
                        fulfill();
                      } else {
                        fse2.outputFile(relativeFilePath, value, (err) => {
                          if (err) {
                            logger.writingError(relativeFilePath, err.message);
                            fulfill();
                          } else {
                            logger.writingString(relativeFilePath);
                            fulfill();
                          }
                        });
                      }
                    },
                    function(error) {
                      logger.writingError(relativeFilePath, error.message);
                      fulfill();
                    }
                  );
                } else {
                  console.log(
                    `\x1B[33m\x1B[1m[Funkophile]\x1B[0m Unrecognized content type for ${relativeFilePath}, attempting to write:`,
                    typeof contents
                  );
                  fse2.outputFile(relativeFilePath, contents, (err) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                }
              } else {
                fulfill();
              }
            }
          });
        })
      ).then(() => {
        cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);
        logDone(funkophileConfig, currentState);
      });
    });
    console.log(
      "\x1B[32m\x1B[1m[Funkophile]\x1B[0m Dispatching INITIALIZE action to enable processing..."
    );
    const currentState = store.getState();
    console.log(
      "\x1B[36m\x1B[1m[Funkophile]\x1B[0m Current state keys:",
      Object.keys(currentState)
    );
    logInputKeys(funkophileConfig, currentState);
    setTimeout(() => {
      store.dispatch({
        type: INITIALIZE,
        payload: true
      });
      console.log(
        "\x1B[32m\x1B[1m[Funkophile]\x1B[0m Store initialized. Ready to process changes!"
      );
    }, 100);
  });
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
