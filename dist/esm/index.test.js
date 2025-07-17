import { expect } from "chai";
import { describe, it } from "mocha";
import { makeStore, 
// makeFinalSelector,
omit, contentsOfFiles, contentOfFile, srcAndContentOfFile, srcAndContentOfFiles, INITIALIZE, UPSERT, REMOVE, createInputSelectors, } from "./index";
import { createMockState, createMockConfig } from "./test-utils";
describe("Funkophile Core", () => {
    const mockConfig = createMockConfig();
    describe("makeStore", () => {
        it("should create a store with empty state until it is initialized", () => {
            const store = makeStore(mockConfig);
            expect(store.getState()).to.be.undefined;
            store.dispatch({ payload: true, type: INITIALIZE });
            expect(store.getState()).to.not.be.undefined;
            expect(store.getState().timestamp).to.be.greaterThan(0);
            expect(store.getState()).deep.include(mockConfig.initialState);
        });
    });
    describe('omit', () => {
        it('should remove the specified key from object', () => {
            const obj = {
                'file1.md': 'content1',
                'file2.md': 'content2'
            };
            const result = omit('file1.md', obj);
            expect(result).to.deep.equal({ 'file2.md': 'content2' });
        });
    });
    describe("selectors", () => {
        const mockState = createMockState();
        const pagesAndPosts = (subject) => {
            it("contentsOfFiles should concatenate all file contents", () => {
                expect(contentsOfFiles((state) => state[subject])(mockState)).to.equal(Object.entries(mockState[subject]).reduce((mm, [k, v]) => {
                    return `${mm}${v}`;
                }, ""));
            });
            it("contentOfFile should return first file content", () => {
                expect(contentOfFile((state) => state[subject])(mockState)).to.equal(mockState[subject][Object.keys(mockState[subject]).sort()[0]]);
            });
            it("srcAndContentOfFile should return src and content", () => {
                // const filepath = "post2.md";
                const filepath = Object.keys(mockState[subject])[0];
                expect(srcAndContentOfFile((state) => state[subject], filepath)(mockState)).to.deep.equal({
                    src: filepath,
                    content: mockState[subject][filepath],
                });
            });
            it("srcAndContentOfFiles should return array of src/content pairs", () => {
                const selector = srcAndContentOfFiles((state) => state[subject]);
                expect(selector(mockState)).to.deep.equal(Object.entries(mockState[subject]).reduce((mm, [k, v]) => {
                    mm.push({
                        src: k,
                        content: v,
                    });
                    return mm;
                }, []));
            });
        };
        describe("for the pages", () => {
            pagesAndPosts("pages");
        });
        describe("for the posts", () => {
            pagesAndPosts("posts");
        });
    });
    describe('createInputSelectors', () => {
        it('should create a selector for each input key', () => {
            const selectors = createInputSelectors(mockConfig);
            expect(Object.keys(selectors)).to.deep.equal(['posts', 'pages']);
            expect(typeof selectors.posts).to.equal('function');
            expect(typeof selectors.pages).to.equal('function');
        });
        it('selectors should return the corresponding state slice', () => {
            const mockState = createMockState();
            const selectors = createInputSelectors(mockConfig);
            expect(selectors.posts(mockState)).to.equal(mockState.posts);
            expect(selectors.pages(mockState)).to.equal(mockState.pages);
        });
    });
    // describe('makeFinalSelector', () => {
    //   it('should create a selector that transforms inputs through output functions', () => {
    //     const mockConfigWithOutputs = {
    //       ...mockConfig,
    //       outputs: (selectors: any) => ({
    //         posts: contentsOfFiles(selectors.posts),
    //         pages: contentOfFile(selectors.pages)
    //       })
    //     };
    //     const selector = makeFinalSelector(mockConfigWithOutputs);
    //     const mockState = createMockState();
    //     const outputs = selector(mockState);
    //     // Verify posts output is concatenated
    //     expect(outputs.posts).to.equal(
    //       '# Post 1# Post 2hello world'
    //     );
    //     // Verify pages output is first page
    //     expect(outputs.pages).to.equal(
    //       '# About'
    //     );
    //   });
    //   it('should memoize results properly', () => {
    //     const selector = makeFinalSelector(mockConfig);
    //     const mockState = createMockState();
    //     const firstOutput = selector(mockState);
    //     const secondOutput = selector(mockState);
    //     expect(firstOutput).to.deep.equal(secondOutput);
    //   });
    // });
    describe('store actions', () => {
        it('should handle INITIALIZE action', () => {
            const store = makeStore(mockConfig);
            store.dispatch({ type: INITIALIZE, payload: true });
            const state = store.getState();
            expect(state.timestamp).to.be.greaterThan(0);
        });
        it('should handle UPSERT action', () => {
            const store = makeStore(mockConfig);
            store.dispatch({
                type: UPSERT,
                payload: {
                    key: 'posts',
                    src: 'post3.md',
                    contents: '# Post 3'
                }
            });
            const state = store.getState();
            expect(state.posts['post3.md']).to.equal('# Post 3');
        });
        it('should handle REMOVE action', () => {
            const store = makeStore(mockConfig);
            store.dispatch({
                type: REMOVE,
                payload: {
                    key: 'posts',
                    file: 'post1.md'
                }
            });
            const state = store.getState();
            expect(state.posts['post1.md']).to.be.undefined;
        });
    });
    describe('edge cases', () => {
        it('should handle empty file contents', () => {
            const selector = contentsOfFiles(() => ({}));
            expect(selector(createMockState())).to.equal('');
        });
        it('should handle Buffer content', () => {
            const buffer = Buffer.from('buffer content');
            const state = createMockState({
                posts: { 'file.bin': buffer }
            });
            const selector = contentOfFile(() => state.posts);
            expect(selector(state)).to.equal(buffer);
        });
        it('should throw on invalid selector', () => {
            const selector = contentOfFile(() => ({}));
            expect(() => selector({})).to.throw();
        });
    });
});
