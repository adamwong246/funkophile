import fs from "fs";
import fse from "fs-extra";
import http from "http";
import path from "path";
import { Action, createStore, Store } from "redux";
import { createSelector } from "reselect";
import url from "url";
import { glob } from "glob";
import chokidar from "chokidar";

export type IConfig = {
  mode: "build" | "watch";
  initialState: any;
  options: {
    inFolder: string;
    outFolder: string;
    port?: number;
  };
  encodings: Record<string, string[]>;
  inputs: Record<string, string>;
  outputs: (x: any) => any;
};

export const INITIALIZE = "INITIALIZE";
export const UPSERT = "UPSERT";
export const REMOVE = "REMOVE";

export const previousState: any = {};

export const logger = {
  watchError: (p: string) => console.log("\u001b[7m ! \u001b[0m" + p),
  watchReady: (p: string) =>
    console.log("\u001b[7m\u001b[36m  <  \u001b[0m" + p),
  watchAdd: (p: string) =>
    console.log("\u001b[7m\u001b[34m  +  \u001b[0m./" + p),
  watchChange: (p: string) =>
    console.log("\u001b[7m\u001b[35m  *  \u001b[0m" + p),
  watchUnlink: (p: string) =>
    console.log("\u001b[7m\u001b[31m  -  \u001b[0m./" + p),
  stateChange: () =>
    console.log("\u001b[7m\u001b[31m --- Redux state changed --- \u001b[0m"),
  cleaningEmptyfolder: (p: string) =>
    console.log("\u001b[31m\u001b[7m XXX! \u001b[0m" + p),
  readingFile: (p: string) => console.log("\u001b[31m <-- \u001b[0m" + p),
  removedFile: (p: string) =>
    console.log("\u001b[31m\u001b[7m ??? \u001b[0m./" + p),
  writingString: (p: string) => console.log("\u001b[32m --> \u001b[0m" + p),
  writingFunction: (p: string) => console.log("\u001b[33m ... \u001b[0m" + p),
  writingPromise: (p: string) => console.log("\u001b[33m ... \u001b[0m" + p),
  writingError: (p: string, message: string) =>
    console.log("\u001b[31m !!! \u001b[0m" + p + " " + message),

  waiting: () =>
    console.log(
      "\u001b[7m Funkophile is done for now but waiting on changes...\u001b[0m "
    ),
  done: () => console.log("\u001b[7m Funkophile is done!\u001b[0m "),
};

export function cleanEmptyFoldersRecursively(folder: string) {
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

export const dispatchUpsert = (
  store: Store,
  key: string,
  file: string,
  encodings: Record<string, string[]>
) => {
  const fileType: string = path.basename(file).split(".")[1];

  let encoding: BufferEncoding = Object.keys(encodings).find((e) => {
    return encodings[e].includes(fileType);
  }) as BufferEncoding;

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

export function omit(key: string, obj: any) {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}

export function newStore(funkophileConfig): Store<any, Action<string>, any> {
  const initialInputState = Object.keys(funkophileConfig.inputs).reduce(
    (state, inputKey) => {
      state[inputKey] = {};
      return state;
    },
    {} as Record<string, any>
  );

  return createStore(
    (
      state = {
        initialLoad: true,
        ...initialInputState,
        ...funkophileConfig.initialState,
        timestamp: Date.now(),
      },
      action
    ) => {
      if (state === undefined) {
        throw new Error("Redux state is undefined. This should never happen.");
      }
      console.log(
        `\u001b[35m\u001b[1m[Funkophile]\u001b[0m Redux received action: ${action.type}`
      );
      if (!action.type.includes("@@redux")) {
        if (action.type === INITIALIZE) {
          console.log(
            `\u001b[35m\u001b[1m[Funkophile]\u001b[0m INITIALIZE action - setting initialLoad to false`
          );
          return {
            ...state,
            initialLoad: false,
            timestamp: Date.now(),
          };
        } else if (action.type === UPSERT) {
          console.log(
            `\u001b[35m\u001b[1m[Funkophile]\u001b[0m UPSERT action for key: ${action["payload"].key}, file: ${action["payload"].src}`
          );
          return {
            ...state,
            [action["payload"].key]: {
              // @ts-ignore
              ...state[action.payload.key],
              ...{
                [action["payload"].src]: action["payload"].contents,
              },
            },
            timestamp: Date.now(),
          };
        } else if (action.type === REMOVE) {
          console.log(
            `\u001b[35m\u001b[1m[Funkophile]\u001b[0m REMOVE action for key: ${action["payload"].key}, file: ${action["payload"].file}`
          );
          // Ensure the key exists before trying to omit from it
          const currentKeyState = state[action["payload"].key] || {};
          return {
            ...state,
            [action["payload"].key]: omit(
              action["payload"].file,
              currentKeyState
            ),
            timestamp: Date.now(),
          };
        } else {
          console.error(
            "Redux was asked to handle an unknown action type: " + action.type
          );
          process.exit(-1);
        }
        // return state
      }
      return state;
    }
  );
}

export function makeFinalSelector(funkophileConfig) {
  return funkophileConfig.outputs(
    Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
      return {
        ...mm,
        [inputKey]: createSelector([(x) => x], (root) => {
          // The input key should always be present now, even if it's an empty object
          const result = root[inputKey];
          // If result is undefined, it's a programming error since we initialize all input keys
          if (result === undefined) {
            console.warn(
              `\u001b[33m\u001b[1m[Funkophile]\u001b[0m Input key "${inputKey}" is undefined in state, which shouldn't happen. Using empty object.`
            );
            return {};
          }
          return result;
        }),
      };
    }, {})
  );
}

export function startServing(funkophileConfig): void {
  const port = funkophileConfig.options.port || 8080;
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad Request");
      return;
    }

    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;

    // Default to index.html if the path ends with /
    if (pathname && pathname.endsWith("/")) {
      pathname += "index.html";
    }

    // Remove leading slash
    const filePath = pathname ? pathname.substring(1) : "index.html";

    // Construct the full path to the file
    const fullPath = path.join(
      process.cwd(),
      funkophileConfig.options.outFolder,
      filePath
    );

    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
      if (err) {
        // Try with .html extension
        const htmlPath = fullPath + ".html";
        fs.access(htmlPath, fs.constants.F_OK, (htmlErr) => {
          if (htmlErr) {
            // File not found
            res.statusCode = 404;
            res.end("File not found");
          } else {
            // Serve the .html file
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
        // Serve the file
        fs.readFile(fullPath, (readErr, data) => {
          if (readErr) {
            res.statusCode = 500;
            res.end("Internal Server Error");
          } else {
            // Set appropriate content type based on file extension
            const ext = path.extname(fullPath).toLowerCase();
            const contentTypes: Record<string, string> = {
              ".html": "text/html",
              ".css": "text/css",
              ".js": "application/javascript",
              ".json": "application/json",
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".jpeg": "image/jpeg",
              ".gif": "image/gif",
              ".svg": "image/svg+xml",
              ".ico": "image/x-icon",
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
      `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Server running at http://localhost:${port}/`
    );
  });

  // Handle process exit to close the server
  process.on("SIGINT", () => {
    if (server) {
      server.close();
    }
    // process.exit(0);
  });
}

// Log all input keys to see if they're present
export function logInputKeys(funkophileConfig, currentState) {
  Object.keys(funkophileConfig.inputs).forEach((inputKey) => {
    if (currentState[inputKey]) {
      console.log(
        `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Input key "${inputKey}" found in state with ${
          Object.keys(currentState[inputKey]).length
        } files`
      );
      // Only log file names if there are files to avoid cluttering the output
      if (Object.keys(currentState[inputKey]).length > 0) {
        console.log(
          `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Files for "${inputKey}":`,
          Object.keys(currentState[inputKey])
        );
      }
    } else {
      console.warn(
        `\u001b[33m\u001b[1m[Funkophile]\u001b[0m Input key "${inputKey}" NOT found in state`
      );
    }
  });
}

export function logDone(funkophileConfig, currentState) {
  if (funkophileConfig.mode === "build") {
    console.log(
      "\u001b[32m\u001b[1m[Funkophile]\u001b[0m Build completed successfully!"
    );
    logger.done();
  } else if (funkophileConfig.mode === "watch") {
    console.log(
      "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Watching for file changes..."
    );
    // Log the localhost URL if port is specified
    const port = funkophileConfig.options.port || 8080;
    console.log(
      `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Serving at: http://localhost:${port}/`
    );
    logger.waiting();
  } else {
    throw `\u001b[31m\u001b[1m[Funkophile]\u001b[0m The mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`;
  }
}

export function makePromissesArray(funkophileConfig, store) {
  return Object.keys(funkophileConfig.inputs).map((inputRuleKey) => {
    // Ensure the pattern includes the inFolder and is relative to the current working directory
    // Also, make sure to handle patterns that might already include the inFolder
    const pattern = funkophileConfig.inputs[inputRuleKey] || "";
    // For glob, we want the pattern to be relative to process.cwd()
    // Join inFolder and pattern using forward slashes
    const globPattern = path.posix.join(
      funkophileConfig.options.inFolder,
      pattern
    );
    // console.log(`[Funkophile] Looking for files with glob pattern: ${globPattern}`);
    // console.log(`[Funkophile] Current working directory: ${process.cwd()}`);

    return new Promise<void>((fulfill, reject) => {
      if (funkophileConfig.mode === "build") {
        // Use the glob pattern we constructed earlier
        // console.log(`[Funkophile] Searching for files matching pattern: ${globPattern}`);
        // console.log(`[Funkophile] Input rule key: ${inputRuleKey}`);

        glob(globPattern, { cwd: process.cwd() })
          .then((files: string[]) => {
            // console.log(`[Funkophile] Found ${files.length} files for ${inputRuleKey} (pattern: ${pattern}):`, files);
            if (files.length === 0) {
              console.warn(
                `No files found for input key "${inputRuleKey}" with pattern "${globPattern}"`
              );
              // Even if no files are found, the key is already initialized in the state
              // No need to dispatch anything
            } else {
              files.forEach((file) => {
                // Make sure the file path is absolute
                const absoluteFilePath = path.resolve(process.cwd(), file);
                // console.log(`[Funkophile] Adding file to state for key ${inputRuleKey}: ${absoluteFilePath}`);
                dispatchUpsert(
                  store,
                  inputRuleKey,
                  absoluteFilePath,
                  funkophileConfig.encodings
                );
              });
            }
          })
          .then(() => {
            fulfill();
          })
          .catch((error) => {
            // console.error(`[Funkophile] Error globbing for pattern ${globPattern}:`, error);
            reject(error);
          });
      } else if (funkophileConfig.mode === "watch") {
        console.log(
          `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Setting up watcher for pattern: ${globPattern}`
        );
        console.log(
          `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Current working directory: ${process.cwd()}`
        );

        // First, process initial files using glob to ensure all files are loaded
        glob(globPattern, { cwd: process.cwd() })
          .then((files: string[]) => {
            console.log(
              `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Found ${files.length} initial files for ${inputRuleKey}`
            );
            files.forEach((file) => {
              const absoluteFilePath = path.resolve(process.cwd(), file);
              console.log(
                `\u001b[32m\u001b[1m[Funkophile]\u001b[0m Adding initial file: ${file}`
              );
              dispatchUpsert(
                store,
                inputRuleKey,
                absoluteFilePath,
                funkophileConfig.encodings
              );
            });

            // Now set up the watcher
            const watcher = chokidar
              .watch(globPattern, {
                cwd: process.cwd(),
                ignoreInitial: true, // We've already processed initial files
                persistent: true,
                usePolling: false,
                interval: 100,
                binaryInterval: 300,
                alwaysStat: false,
                depth: 99,
                awaitWriteFinish: {
                  stabilityThreshold: 50,
                  pollInterval: 10,
                },
              })
              .on("error", (error) => {
                console.error(
                  `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Watcher error for pattern ${globPattern}:`,
                  error
                );
                logger.watchError(globPattern);
              })
              .on("add", (filePath) => {
                console.log(
                  `\u001b[32m\u001b[1m[Funkophile]\u001b[0m File added: ${filePath}`
                );
                logger.watchAdd(filePath);
                const absoluteFilePath = path.resolve(process.cwd(), filePath);
                console.log(
                  `\u001b[32m\u001b[1m[Funkophile]\u001b[0m Dispatching UPSERT for key: ${inputRuleKey}, file: ${absoluteFilePath}`
                );
                dispatchUpsert(
                  store,
                  inputRuleKey,
                  absoluteFilePath,
                  funkophileConfig.encodings
                );
              })
              .on("change", (filePath) => {
                console.log(
                  `\u001b[33m\u001b[1m[Funkophile]\u001b[0m File changed: ${filePath}`
                );
                logger.watchChange(filePath);
                const absoluteFilePath = path.resolve(process.cwd(), filePath);
                console.log(
                  `\u001b[33m\u001b[1m[Funkophile]\u001b[0m Dispatching UPSERT for key: ${inputRuleKey}, file: ${absoluteFilePath}`
                );
                dispatchUpsert(
                  store,
                  inputRuleKey,
                  absoluteFilePath,
                  funkophileConfig.encodings
                );
              })
              .on("unlink", (filePath) => {
                console.log(
                  `\u001b[31m\u001b[1m[Funkophile]\u001b[0m File removed: ${filePath}`
                );
                logger.watchUnlink(filePath);
                const absoluteFilePath = path.resolve(process.cwd(), filePath);
                console.log(
                  `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Dispatching REMOVE for key: ${inputRuleKey}, file: ${absoluteFilePath}`
                );
                store.dispatch({
                  type: REMOVE,
                  payload: {
                    key: inputRuleKey,
                    file: absoluteFilePath,
                  },
                });
              })
              .on("unlinkDir", (filePath) => {
                console.log(
                  `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Directory removed: ${filePath}`
                );
                logger.watchUnlink(filePath);
              })
              .on("raw", (event, path, details) => {
                console.log(
                  `\u001b[90m\u001b[1m[Funkophile]\u001b[0m Raw event: ${event} for path: ${path}`
                );
              });

            console.log(
              `\u001b[32m\u001b[1m[Funkophile]\u001b[0m Watcher is ready for pattern: ${globPattern}`
            );
            logger.watchReady(globPattern);
            fulfill();
          })
          .catch((error) => {
            console.error(
              `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Error processing initial files for pattern ${globPattern}:`,
              error
            );
            reject(error);
          });
        // .on('raw', (event, p, details) => { // internal
        //   log('Raw event info:', event, p, details);
        // })
      } else {
        console.error(
          `mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
        );
        process.exit(-1);
      }
    });
  });
}
