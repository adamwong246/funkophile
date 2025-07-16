# Funkophile

The _func_tional _file_ processor.

#### *What* is Funkophile?

Funkophile is a very small build tool with 1 simple purpose- it reads files, processes them, and then outputs them. Optionally, it can watch those files for changes, and updating the output files very efficiently. 

#### What is Funkophile *not*?

- Funkophile is _not_ webpack or rollup. 
- Funkophile is _not_ grunt or gulp. 
- Funkophile is _not_ a module loader.
- Funkophile is _not necessarily_ for web development. It has a much broader use-case.

#### What Funkophile *can do for you*

- Funkophile can functionally and efficiently watch files for changes, process them, then write them back to the filesystem.
- Funkophile can replace your flavor-of-the-week State Site Generator
- Funkophile is also very unopinionated and works well with other tools grunt, gulp, webpack, and rollup.

#### What Funkophile *should not be used for*

- Funkophile should only be used in a purely functional way. Being based on "selectors", you should only write "pure" aka side effect free functions. 

### Funkophile.config.js

Funkophile is configured with Funkophile.config.js. It has 3 sections of note:

#### inputs
`inputs` is a list of configurations defining which files get read and where to store those results in the redux stores

#### outputs
`outputs` is a function which accepts object of selectors, keyed by inputs. These selectors are connected to the redux state and you can use it to handle changes to the redux state, which itself is reacting to changes in the filesystem. This function returns hash object, where the keys are files to write, and the values are the contents of those files.

#### selectors
At the heart of Funkophile is the selector. Within the `outputs` function, you can define any selectors you like, using any JS library you want, provided they are _purely functional_. This means that Funkophile needs no community plugins and can be made to do complex logic cleanly.
