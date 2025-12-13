# Funkophile

The _func_tional _file_ processor.

Funkophile is a lightweight, functional build tool that processes files using Redux selectors. It can operate in both build and watch modes, making it perfect for static site generation, asset pipelines, and other file transformation tasks.

## Example Usage

```javascript
import funkophile from 'funkophile';
import { contentsOfFiles } from './funkophileHelpers';

const config = {
  mode: 'watch', // or 'build'
  initialState: {},
  options: {
    inFolder: 'src',
    outFolder: 'dist',
    port: 8080
  },
  encodings: {
    'utf8': ['html', 'css', 'js', 'txt', 'md'],
    'binary': ['png', 'jpg', 'jpeg', 'gif', 'ico']
  },
  inputs: {
    html: '**/*.html',
    css: '**/*.css',
    images: '**/*.{png,jpg,jpeg,gif}'
  },
  outputs: ({ html, css, images }) => ({
    // Output processed HTML files
    'index.html': contentsOfFiles(html),
    // Bundle all CSS into one file
    'styles.css': contentsOfFiles(css),
    // Copy images as-is
    ...Object.keys(images).reduce((acc, key) => ({
      ...acc,
      [key.replace('src/', '')]: images[key]
    }), {})
  })
};
