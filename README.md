# Funkophile

The _func_ tional _file_ processor.

### About
#### *What* is Funkophile?

Funkophile is a build tool that inputs files, processes them, and then outputs them. Optionally, it can watch those files for changes, and updating the output files very efficiently. No plugins are needed because what once was configuration is now code- EVERYTHING is done in redux selectors.

#### What is Funkophile *not*?

- Funkophile is _not_ webpack or rollup. It does not *just* build JS bundles, though it could help you do so.
- Funkophile is _not_ grunt or gulp. It is not *just* a task runner, it is a file-processor. The "tasks" Funkophile runs are functions run on files. 
- Funkophile is _not_ a module loader.
- Funkophile is _not necessarily_ for web development. It has a much broader use-case.

#### *Why* is Funkophile **awesome**?

Funkophile is a functional file processor. It lets you manipulate files in a *functional* way- using redux selectors- and it does so efficiently- using promises. **It lets you focus on the logic of your selectors and disregard the processing of files**. You setup in some files to read, some files to write, and some selectors filled with easily testable logic- Funkophile will handle the borings parts for you! When you first start Funkophile, it will process every file. Subsequent changes to an input file will run through your selectors and automatically update _only_ the dependent output files. It just works! (tm)

#### What Funkophile *can do*

- Funkophile can replace your flavor-of-the-week State Site Generator with a hackable and lightweight solution.
- Funkophile can replace some of the things that grunt or gulp do.
- Funkophile can replace some of the things that webpack is used for.
- Funkophile can replace both build tools (like grunt and gulp) and bundlers (like webpack and rollup).
- Funkophile is also very unopinionated and works well with other tools grunt, gulp, webpack, and rollups.
- Funkophile can functionally and efficiently watch files for changes, process them, then write them back to the filesystem.

#### What Funkophile *should not be used for*

- Funkophile should only be used in a purely functional way. __Funkophile is asynchronous so that your code does not need to be.__ You should only use Funkophile if you can write purely functional redux selectors. Luckily, these concepts are not that difficult to learn!

### Funkophile.config.js

Funkophile is configured with Funkophile.config.js. It has 3 sections of note:

#### inputs
`inputs` is a list of configurations defining which files get read and where to store those results in the redux stores

#### outputs
`outputs` is a function which accepts object of selectors, keyed by inputs. These selectors are connected to the redux state and you can use it to handle changes to the redux state, which itself is reacting to changes in the filesystem. This function returns hash object, where the keys are files to write, and the values are the contents of those files.

#### selectors
At the heart of Funkophile is the selector. Within the `outputs` function, you can define any selectors you like, using any JS library you want, provided they are _purely functional_. This means that Funkophile needs no community plugins and can be made to do complex logic cleanly.
