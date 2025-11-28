import path from "path";
import chokidar from "chokidar";
import fs from "fs";
import fse from "fs-extra";
import { Store } from "redux";
import Promise from "bluebird";
import { createSelector } from "reselect";
import { Action, createStore } from "redux";
import { glob } from "glob";

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

export type AppState = InputState & {
  timestamp: number;
};

export interface FunkophileConfig {
  mode: "build" | "watch";
  initialState: InputState;
  options: {
    inFolder: string;
    outFolder: string;
  };
  encodings: Record<string, string[]>;
  inputs: Record<string, string>;
  outputs: (
    selectors: Record<string, (state: AppState) => FileContents>
  ) => Record<string, string | Buffer | Promise<string | Buffer> | ((callback: (err: Error | null, res: string | Buffer) => void) => void)>;
}

export const INITIALIZE = "INITIALIZE";
export const UPSERT = "UPSERT";
export const REMOVE = "REMOVE";
export const previousState: Record<string, unknown> = {};

export const basicPromise: Promise<void> = Promise.resolve();

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

export function omit(key: string, obj: FileContents): FileContents {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}

export interface PayloadAction<T = unknown> extends Action<string> {
  payload: T;
}

export const contentsOfFiles = <T extends FileContents>(
  selector: (state: AppState) => T
) => {
  return createSelector([(state: AppState) => selector(state)], (selected) => {
    return Object.keys(selected).reduce((mm, k) => {
      const content = selected[k];
      return mm + (typeof content === "string" ? content : content.toString());
    }, "");
  });
};

export const contentOfFile = <T extends FileContents>(
  selector: (state: AppState) => T
) => {
  return createSelector([(state: AppState) => selector(state)], (selected) => {
    if (!selected || Object.keys(selected).length === 0) {
      throw new Error("No files found");
    }
    return selected[Object.keys(selected)[0]];
  });
};

export const srcAndContentOfFile = <T extends FileContents>(
  selector: (state: AppState) => T,
  key: string
) => {
  return createSelector([(state: AppState) => selector(state)], (selected) => {
    return {
      src: key,
      content: selected[key],
    };
  });
};

export const srcAndContentOfFiles = <T extends FileContents>(
  selector: (state: AppState) => T
) => {
  return createSelector([(state: AppState) => selector(state)], (selected) => {
    const keys = Object.keys(selected);
    return keys.map((key) => {
      return {
        src: key,
        content: selected[key],
      };
    });
  });
};

export const makeStore = (funkophileConfig: FunkophileConfig) =>
  createStore(
    (
      state: AppState = {
        // initialLoad: true,
        ...funkophileConfig.initialState,
        timestamp: Date.now(),
      },
      action: PayloadAction<UpsertPayload | RemovePayload | boolean>
    ): AppState => {
      // console.log("\u001b[7m\u001b[35m ||| Redux recieved action \u001b[0m", action.type)
      if (!action.type.includes("@@redux")) {
        if (action.type === INITIALIZE) {
          return {
            ...state,
            timestamp: Date.now(),
          };
        } else if (action.type === UPSERT) {
          const upsertPayload = action.payload as UpsertPayload;
          return {
            ...state,
            [upsertPayload.key]: {
              ...(state[upsertPayload.key] || {}),
              ...{
                [upsertPayload.src]: upsertPayload.contents,
              },
            },
            timestamp: Date.now(),
          };
        } else if (action.type === REMOVE) {
          const removePayload = action.payload as RemovePayload;
          return {
            ...state,
            [removePayload.key]: omit(
              removePayload.file,
              state[removePayload.key] || {}
            ),
            timestamp: Date.now(),
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

// export const makeFinalSelector = (funkophileConfig: FunkophileConfig) => {
//   const inputSelectors = createInputSelectors(funkophileConfig);
//   const outputFunctions = funkophileConfig.outputs(inputSelectors);

//   return (state: AppState) => {
//     const results: Record<string, unknown> = {};
//     for (const [key, fn] of Object.entries(outputFunctions)) {
//       results[key] = fn(state);  //typeof fn === 'function' ? fn(state) : fn;
//     }
//     return results;
//   };
// };

export const createInputSelectors = (funkophileConfig: FunkophileConfig) => {
  return Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
    return {
      ...mm,
      [inputKey]: createSelector(
        [(state: AppState) => state],
        (root) => root[inputKey]
      ),
    };
  }, {} as Record<string, (state: AppState) => FileContents>);
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////

Promise.config({
  cancellation: true,
});

let outputPromise = basicPromise;

function cleanEmptyFoldersRecursively(folder: string) {
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

const dispatchUpsert = (
  store: Store<
    AppState,
    PayloadAction<UpsertPayload | RemovePayload | boolean>
  >,
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

export default (funkophileConfig: FunkophileConfig) => {
  const store = makeStore(funkophileConfig);

  // const finalSelector = makeFinalSelector(funkophileConfig);
  const inputSelectors = Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
    return {
      ...mm,
      [inputKey]: createSelector([(x: AppState) => x], (root) => root[inputKey] || {}),
    };
  }, {} as Record<string, (state: AppState) => FileContents>);
  
  const finalSelector = funkophileConfig.outputs(inputSelectors);

  // Wait for all the file watchers to check in
  Promise.all(
    Object.keys(funkophileConfig.inputs).map((inputRuleKey) => {
      const p = path.resolve(
        `./${funkophileConfig.options.inFolder}/${
          funkophileConfig.inputs[inputRuleKey] || ""
        }`
      );

      return new Promise<void>((fulfill, reject) => {
        if (funkophileConfig.mode === "build") {
          glob(p, {})
            .then((files: string[]) => {
              files.forEach((file) => {
                dispatchUpsert(
                  store,
                  inputRuleKey,
                  file,
                  funkophileConfig.encodings
                );
              });
            })
            .then(() => {
              fulfill();
            });
        } else if (funkophileConfig.mode === "watch") {
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
              dispatchUpsert(
                store,
                inputRuleKey,
                p,
                funkophileConfig.encodings
              );
            })
            .on("change", (p) => {
              logger.watchChange(p);
              dispatchUpsert(
                store,
                inputRuleKey,
                p,
                funkophileConfig.encodings
              );
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
        } else {
          console.error(
            `mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
          );
          process.exit(-1);
        }
      });
    })
  ).then(function () {
    // listen for changes to the store
    store.subscribe(() => {
      const s = store.getState();

      logger.stateChange();
      const outputs = finalSelector(s);

      if (outputPromise.isPending()) {
        console.log("cancelling previous write!");
        outputPromise.cancel();
      }

      outputPromise = Promise.all(
        Array.from(
          new Set(Object.keys(previousState).concat(Object.keys(outputs)))
        ).map((key) => {
          return new Promise((fulfill, reject) => {
            if (!outputs[key]) {
              const file = funkophileConfig.options.outFolder + "/" + key;
              logger.removedFile(file);

              try {
                fse.unlinkSync("./" + file);
                cleanEmptyFoldersRecursively(
                  "./" + file.substring(0, file.lastIndexOf("/"))
                );
              } catch (ex) {
                // console.error('inner', ex.message);
                // throw ex;
              } finally {
                // console.log('finally');
                return;
              }
              // delete previousState[key]
              // fulfill()
            } else {
              if (outputs[key] !== previousState[key]) {
                previousState[key] = outputs[key];

                const relativeFilePath =
                  "./" + funkophileConfig.options.outFolder + "/" + key;
                const contents = outputs[key];

                if (typeof contents === "function") {
                  logger.writingFunction(relativeFilePath);
                  // Cast to a callable function type
                  const func = contents as (callback: (err: Error | null, res: string | Buffer) => void) => void;
                  func((err: Error | null, res: string | Buffer) => {
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
                } else if (contents && typeof (contents as Promise<any>).then === "function") {
                  logger.writingPromise(relativeFilePath);
                  Promise.resolve(contents as Promise<string | Buffer>).then(
                    function (value) {
                      if (value instanceof Error) {
                        logger.writingError(relativeFilePath, value.message);
                      } else {
                        fse.outputFile(relativeFilePath, value, fulfill);
                        logger.writingString(relativeFilePath);
                      }
                    },
                    function (value) {
                      // not called
                    }
                  );
                } else {
                  console.log(
                    `I don't recognize what this is but I will try to write it to a file: ` +
                      relativeFilePath,
                    typeof contents,
                    contents
                  );
                  fse.outputFile(relativeFilePath, contents as string | Buffer, fulfill);
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

    // lastly, turn the store `on`.
    // This is to prevent unecessary recomputations when initialy adding files to redux
    store.dispatch({
      type: INITIALIZE,
      payload: true,
    });
  });
};
