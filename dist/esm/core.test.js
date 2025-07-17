"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const core_1 = require("./core");
const test_utils_1 = require("./test-utils");
(0, mocha_1.describe)("Funkophile Core", () => {
    const mockConfig = (0, test_utils_1.createMockConfig)();
    (0, mocha_1.describe)("makeStore", () => {
        (0, mocha_1.it)("should create a store with empty state until it is initialized", () => {
            const store = (0, core_1.makeStore)(mockConfig);
            (0, chai_1.expect)(store.getState()).to.be.undefined;
            store.dispatch({ payload: true, type: core_1.INITIALIZE });
            (0, chai_1.expect)(store.getState()).to.not.be.undefined;
            (0, chai_1.expect)(store.getState().timestamp).to.be.greaterThan(0);
            (0, chai_1.expect)(store.getState()).deep.include(mockConfig.initialState);
        });
    });
    (0, mocha_1.describe)('omit', () => {
        (0, mocha_1.it)('should remove the specified key from object', () => {
            const obj = {
                'file1.md': 'content1',
                'file2.md': 'content2'
            };
            const result = (0, core_1.omit)('file1.md', obj);
            (0, chai_1.expect)(result).to.deep.equal({ 'file2.md': 'content2' });
        });
    });
    (0, mocha_1.describe)("selectors", () => {
        const mockState = (0, test_utils_1.createMockState)();
        const pagesAndPosts = (subject) => {
            (0, mocha_1.it)("contentsOfFiles should concatenate all file contents", () => {
                (0, chai_1.expect)((0, core_1.contentsOfFiles)((state) => state[subject])(mockState)).to.equal(Object.entries(mockState[subject]).reduce((mm, [k, v]) => {
                    return `${mm}${v}`;
                }, ""));
            });
            (0, mocha_1.it)("contentOfFile should return first file content", () => {
                (0, chai_1.expect)((0, core_1.contentOfFile)((state) => state[subject])(mockState)).to.equal(mockState[subject][Object.keys(mockState[subject]).sort()[0]]);
            });
            (0, mocha_1.it)("srcAndContentOfFile should return src and content", () => {
                // const filepath = "post2.md";
                const filepath = Object.keys(mockState[subject])[0];
                (0, chai_1.expect)((0, core_1.srcAndContentOfFile)((state) => state[subject], filepath)(mockState)).to.deep.equal({
                    src: filepath,
                    content: mockState[subject][filepath],
                });
            });
            (0, mocha_1.it)("srcAndContentOfFiles should return array of src/content pairs", () => {
                const selector = (0, core_1.srcAndContentOfFiles)((state) => state[subject]);
                (0, chai_1.expect)(selector(mockState)).to.deep.equal(Object.entries(mockState[subject]).reduce((mm, [k, v]) => {
                    mm.push({
                        src: k,
                        content: v,
                    });
                    return mm;
                }, []));
            });
        };
        (0, mocha_1.describe)("for the pages", () => {
            pagesAndPosts("pages");
        });
        (0, mocha_1.describe)("for the posts", () => {
            pagesAndPosts("posts");
        });
    });
    (0, mocha_1.describe)('createInputSelectors', () => {
        (0, mocha_1.it)('should create a selector for each input key', () => {
            const selectors = (0, core_1.createInputSelectors)(mockConfig);
            (0, chai_1.expect)(Object.keys(selectors)).to.deep.equal(['posts', 'pages']);
            (0, chai_1.expect)(typeof selectors.posts).to.equal('function');
            (0, chai_1.expect)(typeof selectors.pages).to.equal('function');
        });
        (0, mocha_1.it)('selectors should return the corresponding state slice', () => {
            const mockState = (0, test_utils_1.createMockState)();
            const selectors = (0, core_1.createInputSelectors)(mockConfig);
            (0, chai_1.expect)(selectors.posts(mockState)).to.equal(mockState.posts);
            (0, chai_1.expect)(selectors.pages(mockState)).to.equal(mockState.pages);
        });
    });
    (0, mocha_1.describe)('makeFinalSelector', () => {
        (0, mocha_1.it)('should create a selector that transforms inputs through output functions', () => {
            const mockConfigWithOutputs = {
                ...mockConfig,
                outputs: (selectors) => ({
                    posts: (0, core_1.contentsOfFiles)(selectors.posts),
                    pages: (0, core_1.contentOfFile)(selectors.pages)
                })
            };
            const selector = (0, core_1.makeFinalSelector)(mockConfigWithOutputs);
            const mockState = (0, test_utils_1.createMockState)();
            const outputs = selector(mockState);
            // Verify posts output is concatenated
            (0, chai_1.expect)(outputs.posts).to.equal('# Post 1# Post 2hello world');
            // Verify pages output is first page
            (0, chai_1.expect)(outputs.pages).to.equal('# About');
        });
        (0, mocha_1.it)('should memoize results properly', () => {
            const selector = (0, core_1.makeFinalSelector)(mockConfig);
            const mockState = (0, test_utils_1.createMockState)();
            const firstOutput = selector(mockState);
            const secondOutput = selector(mockState);
            (0, chai_1.expect)(firstOutput).to.deep.equal(secondOutput);
        });
    });
    (0, mocha_1.describe)('store actions', () => {
        (0, mocha_1.it)('should handle INITIALIZE action', () => {
            const store = (0, core_1.makeStore)(mockConfig);
            store.dispatch({ type: core_1.INITIALIZE, payload: true });
            const state = store.getState();
            (0, chai_1.expect)(state.timestamp).to.be.greaterThan(0);
        });
        (0, mocha_1.it)('should handle UPSERT action', () => {
            const store = (0, core_1.makeStore)(mockConfig);
            store.dispatch({
                type: core_1.UPSERT,
                payload: {
                    key: 'posts',
                    src: 'post3.md',
                    contents: '# Post 3'
                }
            });
            const state = store.getState();
            (0, chai_1.expect)(state.posts['post3.md']).to.equal('# Post 3');
        });
        (0, mocha_1.it)('should handle REMOVE action', () => {
            const store = (0, core_1.makeStore)(mockConfig);
            store.dispatch({
                type: core_1.REMOVE,
                payload: {
                    key: 'posts',
                    file: 'post1.md'
                }
            });
            const state = store.getState();
            (0, chai_1.expect)(state.posts['post1.md']).to.be.undefined;
        });
    });
    (0, mocha_1.describe)('edge cases', () => {
        (0, mocha_1.it)('should handle empty file contents', () => {
            const selector = (0, core_1.contentsOfFiles)(() => ({}));
            (0, chai_1.expect)(selector((0, test_utils_1.createMockState)())).to.equal('');
        });
        (0, mocha_1.it)('should handle Buffer content', () => {
            const buffer = Buffer.from('buffer content');
            const state = (0, test_utils_1.createMockState)({
                posts: { 'file.bin': buffer }
            });
            const selector = (0, core_1.contentOfFile)(() => state.posts);
            (0, chai_1.expect)(selector(state)).to.equal(buffer);
        });
        (0, mocha_1.it)('should throw on invalid selector', () => {
            const selector = (0, core_1.contentOfFile)(() => ({}));
            (0, chai_1.expect)(() => selector({})).to.throw();
        });
    });
});
