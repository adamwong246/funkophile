import esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['index.ts', 'funkophileHelpers.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist/esm',
  external: [
    'bluebird',
    'fs-extra',
    'redux',
    'reselect',
    'chokidar',
    'glob',
    'http',
    'path',
    'url',
    'fs'
  ],
  sourcemap: true,
  target: 'node18'
})
