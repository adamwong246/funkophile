// funkophile/index.js

const chokidar = require('chokidar');
const createSelector = require('reselect').createSelector;
const createStore = require('redux').createStore;
const fse = require("fs-extra")
const glob = require("glob-promise");
const path = require("path")
const Promise = require("bluebird")

Promise.config({
	cancellation: true
});

const funkophileConfig = require(process.argv[2])
const mode = process.argv[3]
const keyToWatch = process.argv[4]

const INITIALIZE = 'INITIALIZE';
const UPSERT = 'UPSERT';
const REMOVE = 'REMOVE';

const previousState = {}
let outputPromise = Promise.resolve();

const logger = {
	watchError: (path) => console.log("\u001b[7m ! \u001b[0m" + path),
	watchReady: (path) => console.log("\u001b[7m\u001b[36m  <  \u001b[0m" + path),
	watchAdd: (path) => console.log("\u001b[7m\u001b[34m  +  \u001b[0m./" + path),
	watchChange: (path) => console.log("\u001b[7m\u001b[35m  *  \u001b[0m" + path),
	watchUnlink: (path) => console.log("\u001b[7m\u001b[31m  -  \u001b[0m./" + path),

	stateChange: () => console.log("\u001b[7m\u001b[31m --- Redux state changed --- \u001b[0m"),

	cleaningEmptyfolder: (path) => console.log("\u001b[31m\u001b[7m XXX! \u001b[0m" + path),

	readingFile: (path) => console.log("\u001b[31m <-- \u001b[0m" + path),
	removedFile: (path) => console.log("\u001b[31m\u001b[7m ??? \u001b[0m./" + path),

	writingString: (path) => console.log("\u001b[32m --> \u001b[0m" + path),
	writingFunction: (path) => console.log("\u001b[33m ... \u001b[0m" + path),
	writingPromise: (path) => console.log("\u001b[33m ... \u001b[0m" + path),
	writingError: (path, message) => console.log("\u001b[31m !!! \u001b[0m" + path + " " + message),

	waiting: () => console.log("\u001b[7m Funkophile is done for now but waiting on changes...\u001b[0m "),
	done: () => console.log("\u001b[7m Funkophile is done!\u001b[0m ")

}

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

		// re-evaluate files; after deleting subfolder
		// we may have parent folder empty now
		files = fs.readdirSync(folder);
	}

	if (files.length == 0) {
		logger.cleaningEmptyfolder(folder)

		fs.rmdirSync(folder);
		return;
	}
}

const dispatchUpsert = (store, key, file, encodings) => {
	logger.readingFile(file)
	store.dispatch({
		type: UPSERT,
		payload: {
			key: key,
			src: file,
			contents: fse.readFileSync(file, Object.keys(encodings).find((e) => encodings[e].includes(file.split('.')[2])))
		}
	});

	// const filetype = file.split('.')[2]
	// const encoding = Object.keys(encodings).find((e) => encodings[e].includes(filetype))
	// const relativeFilePath = './' + file;
	// console.log("\u001b[31m <-- \u001b[0m" + file)
	// fse.readFile(file, encoding).then((contents) => {
	//   store.dispatch({
	//     type: UPSERT,
	//     payload: {
	//       key: key,
	//       src: file,
	//       contents: contents
	//     }
	//   });
	// });


};

function omit(key, obj) {
	const {
		[key]: omitted, ...rest
	} = obj;
	return rest;
}

const store = createStore((state = {
	initialLoad: true,
	...funkophileConfig.initialState,
	timestamp: Date.now()
}, action) => {
	// console.log("\u001b[7m\u001b[35m ||| Redux recieved action \u001b[0m", action.type)
	if (!action.type.includes('@@redux')) {

		if (action.type === INITIALIZE) {
			return {
				...state,
				initialLoad: false,
				timestamp: Date.now()
			}
		} else if (action.type === UPSERT) {
			return {
				...state,
				[action.payload.key]: {
					...state[action.payload.key],
					...{
						[action.payload.src]: action.payload.contents
					}
				},
				timestamp: Date.now()
			}
		} else if (action.type === REMOVE) {
			return {
				...state,
				[action.payload.key]: omit(action.payload.file, state[action.payload.key]),
				timestamp: Date.now()
			}
		} else {
			console.error("Redux was asked to handle an unknown action type: " + action.type)
			process.exit(-1)
		}
		return state
	}
})

const finalSelector = funkophileConfig.outputs(Object.keys(funkophileConfig.inputs).reduce((mm, inputKey) => {
	return {
		...mm,
		[inputKey]: createSelector([(x) => x], (root) => root[inputKey])
	}
}, {}))


// Wait for all the file watchers to check in
Promise.all(
	Object.keys(funkophileConfig.inputs)
	// ['FUNKYBUNDLE']
.map((inputRuleKey) => {
	const path = `./${funkophileConfig.options.inFolder}/${funkophileConfig.inputs[inputRuleKey] || ''}`
	return new Promise((fulfill, reject) => {
		if (mode === "build") {
			glob(path, {}).then((files) => {
				files.forEach((file) => {
					dispatchUpsert(store, inputRuleKey, file, funkophileConfig.encodings);
				})
			}).then(() => {
				fulfill()
			})
		} else if (mode === "watch") {

			chokidar.watch(path, {})
				.on('error', error => {
					logger.watchError(path)
				})
				.on('ready', () => {
					logger.watchReady(path)
					fulfill()
				})
				.on('add', path => {
					logger.watchAdd(path)
					dispatchUpsert(store, inputRuleKey, './' + path, funkophileConfig.encodings);
				})
				.on('change', path => {
					logger.watchChange(path)
					dispatchUpsert(store, inputRuleKey, './' + path, funkophileConfig.encodings);
				})
				.on('unlink', path => {
					logger.watchUnlink(path)
					store.dispatch({
							type: REMOVE,
							payload: {
								key: inputRuleKey,
								file: './' + path
							}
						})
				})
        .on('unlinkDir', path => {
          logger.watchUnlink(path)
        })
        // .on('raw', (event, path, details) => { // internal
        //   log('Raw event info:', event, path, details);
        // })

		} else {
			console.error(`The 3rd argument should be 'watch' or 'build', not "${mode}"`)
			process.exit(-1)
		}

	});
})).then(function() {

	// listen for changes to the store
	store.subscribe(() => {
		logger.stateChange()
		const outputs = finalSelector(store.getState())

		if (outputPromise.isPending()) {
			console.log('cancelling previous write!')
			outputPromise.cancel()
		}

		outputPromise = Promise.all(
			Array.from(new Set(Object.keys(previousState).concat(Object.keys(outputs))))
			.map((key) => {

				return new Promise((fulfill, reject) => {
					if (!outputs[key]) {

						const file = funkophileConfig.options.outFolder + "/" + key
						logger.removedFile(file)

						try {
							fse.unlinkSync('./' + file)
							cleanEmptyFoldersRecursively('./' + file.substring(0, file.lastIndexOf("/")))
						} catch (ex) {
							// console.error('inner', ex.message);
							// throw ex;
						} finally {
							// console.log('finally');
							return;
						}
						delete previousState[key]
						fulfill()
					} else {
						if (outputs[key] !== previousState[key]) {
							previousState[key] = outputs[key]

							const relativeFilePath = './' + funkophileConfig.options.outFolder + "/" + key;
							const contents = outputs[key];

							if (typeof contents === "function") {
								logger.writingFunction(relativeFilePath)
								contents((err, res) => {
									fse.outputFile(relativeFilePath, res, fulfill);
									logger.writingString(relativeFilePath);
								})

							} else if (typeof contents === 'string') {
								fse.outputFile(relativeFilePath, contents, fulfill);
								logger.writingString(relativeFilePath);

							} else if (Buffer.isBuffer(contents)) {
								fse.outputFile(relativeFilePath, contents, fulfill);
								logger.writingString(relativeFilePath);

							} else if (Array.isArray(contents)) {
								fse.outputFile(relativeFilePath, JSON.stringify(contents), fulfill);
								logger.writingString(relativeFilePath);

							} else if (typeof contents.then === 'function') {
								logger.writingPromise(relativeFilePath)
								Promise.resolve(contents).then(function(value) {

									if (value instanceof Error) {
										logger.writingError(relativeFilePath, value.message)
									} else {
										fse.outputFile(relativeFilePath, value, fulfill);
										logger.writingString(relativeFilePath);
									}

								}, function(value) {
									// not called
								});

							} else {
								console.log("I don't recognize what this is but I will try to write it to a file: " + relativeFilePath, contents)
								fse.outputFile(relativeFilePath, contents, callback);
								logger.writingString(relativeFilePath);
							}
						} else {
							fulfill()
						}
					}
				});

			})
		).then(() => {
			cleanEmptyFoldersRecursively(funkophileConfig.options.outFolder);

			if (mode === "build") {
				logger.done()
			} else if (mode === "watch") {
				logger.waiting()
			} else {
				console.error(`The 3rd argument should be 'watch' or 'build', not "${mode}"`)
				process.exit(-1)
			}

		})
	})

	// lastly, turn the store `on`.
	// This is to prevent unecessary recomputations when initialy adding files to redux
	store.dispatch({
		type: INITIALIZE,
		payload: true
	});

})
