# Funnel chart mod

## Bundle for production

The build task will create an compressed JavaScript bundle.

```
npm ci
```

```
npm run build
```

The funnel chart will be found under `dist`.

## Bundle for production

The `build-watch` task will create an uncompressed JavaScript bundle to simplify development and debugging. When the mod is ready to be saved into the analysis file the JavaScript bundle should be compressed. By invoking `npm run build`, `esbuild` will create a minified bundle.

```
npm ci
```

```
npm run build-watch
```

```
npm run server
```

## Unit tests

Invoking `npm test` will start a test runner.
