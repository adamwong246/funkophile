import Promise from "bluebird";
import fse from "fs-extra";

import { Action, Store } from "redux";
import {
  IConfig,
  INITIALIZE,
  cleanEmptyFoldersRecursively,
  logDone,
  logInputKeys,
  logger,
  makeFinalSelector,
  makePromissesArray,
  newStore,
  previousState,
  startServing,
} from "./utils";

Promise.config({
  cancellation: true,
});

export default (funkophileConfig: IConfig) => {
  let outputPromise = Promise.resolve();
  const store: Store<any, Action<string>, any> = newStore(funkophileConfig);
  const finalSelector = makeFinalSelector(funkophileConfig);

  if (funkophileConfig.mode === "watch") {
    startServing(funkophileConfig);
  }

  // Wait for all the file watchers to check in
  Promise.all(
    makePromissesArray(funkophileConfig, store)
  ).then(function () {
    console.log(
      "\u001b[32m\u001b[1m[Funkophile]\u001b[0m All input watchers are ready. Setting up store subscription..."
    );

    // Set up the store subscription BEFORE initializing to catch all changes
    store.subscribe(() => {
      const s = store.getState();
      console.log(
        `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Store updated. initialLoad: ${s.initialLoad}, timestamp: ${s.timestamp}`
      );

      // Skip processing during initial load
      if (s.initialLoad) {
        console.log(
          "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Initial load in progress, skipping processing..."
        );
        console.log(
          "\u001b[36m\u001b[1m[Funkophile]\u001b[0m State keys during initial load:",
          Object.keys(s)
        );
        return;
      }

      logger.stateChange();
      console.log(
        "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Processing state changes..."
      );
      console.log(
        "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Current state keys:",
        Object.keys(s)
      );

      let outputs;
      try {
        outputs = finalSelector(s);
        console.log(
          `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Generated ${
            Object.keys(outputs).length
          } outputs`
        );
      } catch (error) {
        console.error(
          "\u001b[31m\u001b[1m[Funkophile]\u001b[0m FATAL: Error in output selector chain ? :"
        );
        console.error("  Error:", error.message);
        console.error("  Stack:", error.stack);
        // Don't exit the process in watch mode, just log the error and continue
        if (funkophileConfig.mode === "build") {
          process.exit(1);
        } else {
          console.log(
            "\u001b[33m\u001b[1m[Funkophile]\u001b[0m Continuing to watch for changes despite error..."
          );
          // Reset previousState to empty to ensure we try processing again on next change
          Object.keys(previousState).forEach((key) => {
            delete previousState[key];
          });
          return;
        }
      }

      if (outputPromise.isPending()) {
        console.log(
          "\u001b[33m\u001b[1m[Funkophile]\u001b[0m Cancelling previous write operation!"
        );
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
              console.log(
                `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Removing file: ${file}`
              );

              try {
                fse.unlinkSync("./" + file);
                cleanEmptyFoldersRecursively(
                  "./" + file.substring(0, file.lastIndexOf("/"))
                );
              } catch (ex) {
                // Log error but don't fail the entire process
                console.error(
                  `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Error removing file ${file}:`,
                  ex.message
                );
              } finally {
                delete previousState[key];
                fulfill();
              }
            } else {
              if (outputs[key] !== previousState[key]) {
                previousState[key] = outputs[key];

                const relativeFilePath =
                  "./" + funkophileConfig.options.outFolder + "/" + key;
                const contents = outputs[key];

                // console.log(`\u001b[32m\u001b[1m[Funkophile]\u001b[0m Writing file: ${relativeFilePath}`);

                if (typeof contents === "function") {
                  logger.writingFunction(relativeFilePath);
                  contents((err, res) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill(); // Still fulfill to continue processing other files
                    } else {
                      fse.outputFile(relativeFilePath, res, (err) => {
                        if (err) {
                          logger.writingError(relativeFilePath, err.message);
                          fulfill(); // Still fulfill to continue processing other files
                        } else {
                          logger.writingString(relativeFilePath);
                          fulfill();
                        }
                      });
                    }
                  });
                } else if (typeof contents === "string") {
                  fse.outputFile(relativeFilePath, contents, (err) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                } else if (Buffer.isBuffer(contents)) {
                  fse.outputFile(relativeFilePath, contents, (err) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                } else if (Array.isArray(contents)) {
                  fse.outputFile(
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
                  Promise.resolve(contents).then(
                    function (value) {
                      if (value instanceof Error) {
                        logger.writingError(relativeFilePath, value.message);
                        fulfill();
                      } else {
                        fse.outputFile(relativeFilePath, value, (err) => {
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
                    function (error) {
                      logger.writingError(relativeFilePath, error.message);
                      fulfill();
                    }
                  );
                } else {
                  console.log(
                    `\u001b[33m\u001b[1m[Funkophile]\u001b[0m Unrecognized content type for ${relativeFilePath}, attempting to write:`,
                    typeof contents
                  );
                  fse.outputFile(relativeFilePath, contents, (err) => {
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
                // console.log(`\u001b[90m\u001b[1m[Funkophile]\u001b[0m Skipping unchanged file: ${key}`);
                fulfill();
              }
            }
          });
        })
      ).then(() => {
        // console.log('\u001b[36m\u001b[1m[Funkophile]\u001b[0m Cleaning empty folders...');
        cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);

        logDone(funkophileConfig, currentState) 
      });
      //   .catch((error) => {
      //   // console.error('\u001b[31m\u001b[1m[Funkophile]\u001b[0m Error during file operations:', error);
      // });
    });

    console.log(
      "\u001b[32m\u001b[1m[Funkophile]\u001b[0m Dispatching INITIALIZE action to enable processing..."
    );
    // Debug: log the current state after all files are processed
    const currentState = store.getState();
    console.log(
      "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Current state keys:",
      Object.keys(currentState)
    );

    logInputKeys(funkophileConfig, currentState);

    // Add a small delay to ensure all file operations are complete before initializing
    setTimeout(() => {
      // lastly, turn the store `on`.
      // This is to prevent unecessary recomputations when initialy adding files to redux
      store.dispatch({
        type: INITIALIZE,
        payload: true,
      });
      console.log(
        "\u001b[32m\u001b[1m[Funkophile]\u001b[0m Store initialized. Ready to process changes!"
      );
    }, 100);
  });
};
