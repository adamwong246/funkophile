import { AppState, FileContents, FunkophileConfig } from './core';

export const createMockState = (partial?: Partial<AppState>): AppState => ({
  timestamp: Date.now(),
  posts: {
    'post1.md': '# Post 1',
    'post2.md': '# Post 2',
    'post33.md': 'hello world'
  },
  pages: {
    'about.md': '# About'
  },
  ...partial
});

export const createMockConfig = (partial?: Partial<FunkophileConfig>): FunkophileConfig => ({
  mode: 'build',
  initialState: {
    posts: {
      'post1.md': '# Post 1',
      'post2.md': '# Post 2'
    },
    pages: {
      'about.md': '# About'
    }
  },
  options: {
    inFolder: 'src',
    outFolder: 'dist'
  },
  encodings: {
    utf8: ['md', 'txt']
  },
  inputs: {
    posts: 'posts/**/*.md',
    pages: 'pages/**/*.md'
  },
  outputs: () => ({}),
  ...partial
});
