# transform-amd-to-commonjs-example

Example usage of [babel-plugin-transform-ui5-to-commonjs](https://github.com/mauriciolauffer/babel-plugin-transform-ui5-to-commonjs), demonstrating how to get [jest](https://facebook.github.io/jest/) to require UI5 files.

## Relevant Files

- **webpack.config.js**: The source of truth for where to resolve modules, and any module aliases
- **jest.config.js**: Jest needs to know how to resolve modules and aliases, so it reads the webpack config for this information
- **.babelrc**: Enables babel-plugin-transform-ui5-to-commonjs in the test environment only (babel-jest needs to know about the babel config as well, so you can't put the babel config in webpack.config.js.)

TODO: How will jest handle RequireJS shims and other webpack loaders?

```shell
git clone https://github.com/mauriciolauffer/babel-plugin-transform-ui5-to-commonjs
cd babel-plugin-transform-ui5-to-commonjs/examples/transform-ui5-to-commonjs-example
npm install
npm run build
npm test
```
