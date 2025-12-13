import Promise from "bluebird";
import fse from "fs-extra";
import { Action, Store } from "redux";
import {
  IConfig,
  INITIALIZE,
  cleanEmptyFoldersRecursively,
  logger,
  makeFinalSelector,
  makePromissesArray,
  newStore,
  previousState,
  startServing,
} from "./utils";

console.log("hello funkophile 0.0.4");

Promise.config({
  cancellation: true,
});

export default (funkophileConfig: IConfig): void => {
  let outputPromise: Promise<any> = Promise.resolve();
  const store: Store<any, Action<string>, any> = newStore(funkophileConfig);
  const finalSelector = makeFinalSelector(funkophileConfig);

  if (funkophileConfig.mode === "watch") {
    startServing(funkophileConfig);
  }

  // Wait for all the file watchers to check in
  Promise.all(
    makePromissesArray(funkophileConfig, store)
  ).then(function (): void {
    console.log(
      "\u001b[32m\u001b[1m[Funkophile]\u001b[0m All input watchers are ready. Setting up store subscription..."
    );

    // listen for changes to the store
    store.subscribe(() => {
      const s = store.getState();

      logger.stateChange();
      const outputs = finalSelector(s);

      if (outputPromise.isPending()) {
        console.log("\u001b[33m\u001b[1m[Funkophile]\u001b[0m Cancelling previous write operation!");
        outputPromise.cancel();
      }

      outputPromise = Promise.all(
        Array.from(
          new Set(Object.keys(previousState).concat(Object.keys(outputs)))
        ).map((key) => {
          return new Promise<void>((fulfill, reject) => {
            if (!(key in outputs)) {
              const file = funkophileConfig.options.outFolder + "/" + key;
              logger.removedFile(file);

              try {
                fse.unlinkSync("./" + file);
                cleanEmptyFoldersRecursively(
                  "./" + file.substring(0, file.lastIndexOf("/"))
                );
              } catch (ex: any) {
                // Log error but don't fail
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

                if (typeof contents === "function") {
                  logger.writingFunction(relativeFilePath);
                  contents((err: Error | null, res: any) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      if (typeof res !== "string" && !Buffer.isBuffer(res)) {
                        console.error(
                          `\u001b[31m\u001b[1m[Funkophile]\u001b[0m Invalid content type from function for ${relativeFilePath}`
                        );
                        fulfill();
                        return;
                      }
                      fse.outputFile(relativeFilePath, res, (err: Error | null) => {
                        if (err) {
                          logger.writingError(relativeFilePath, err.message);
                          fulfill();
                        } else {
                          logger.writingString(relativeFilePath);
                          fulfill();
                        }
                      });
                    }
                  });
                } else if (typeof contents === "string" || Buffer.isBuffer(contents)) {
                  fse.outputFile(relativeFilePath, contents, (err: Error | null) => {
                    if (err) {
                      logger.writingError(relativeFilePath, err.message);
                      fulfill();
                    } else {
                      logger.writingString(relativeFilePath);
                      fulfill();
                    }
                  });
                } else if (Array.isArray(contents) || (typeof contents === "object" && contents !== null)) {
                  fse.outputFile(
                    relativeFilePath,
                    JSON.stringify(contents),
                    (err: Error | null) => {
                      if (err) {
                        logger.writingError(relativeFilePath, err.message);
                        fulfill();
                      } else {
                        logger.writingString(relativeFilePath);
                        fulfill();
                      }
                    }
                  );
                } else if (typeof contents?.then === "function") {
                  logger.writingPromise(relativeFilePath);
                  Promise.resolve(contents).then(
                    function (value) {
                      if (value instanceof Error) {
                        logger.writingError(relativeFilePath, value.message);
                        fulfill();
                      } else {
                        fse.outputFile(relativeFilePath, value, (err: Error | null) => {
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
                    function (value) {
                      logger.writingError(relativeFilePath, String(value));
                      fulfill();
                    }
                  );
                } else {
                  fse.outputFile(relativeFilePath, String(contents), (err: Error | null) => {
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

        if (funkophileConfig.mode === "build") {
          console.log(
            "\u001b[32m\u001b[1m[Funkophile]\u001b[0m Build completed successfully!"
          );
          logger.done();
        } else if (funkophileConfig.mode === "watch") {
          console.log(
            "\u001b[36m\u001b[1m[Funkophile]\u001b[0m Watching for file changes..."
          );
          const port = funkophileConfig.options.port || 8080;
          console.log(
            `\u001b[36m\u001b[1m[Funkophile]\u001b[0m Serving at: http://localhost:${port}/`
          );
          logger.waiting();
        } else {
          console.error(
            `\u001b[31m\u001b[1m[Funkophile]\u001b[0m The mode should be 'watch' or 'build', not "${funkophileConfig.mode}"`
          );
          process.exit(1);
        }
      });
    });

    // lastly, turn the store `on`.
    // This is to prevent unnecessary recomputations when initially adding files to redux
    store.dispatch({
      type: INITIALIZE,
      payload: true,
    });
  });
};
