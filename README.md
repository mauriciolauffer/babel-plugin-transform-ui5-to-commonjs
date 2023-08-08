# babel-plugin-transform-ui5-to-commonjs

Babel plugin that transforms UI5 modules to CommonJS.
[Check out the example project](https://github.com/mauriciolauffer/babel-plugin-transform-ui5-to-commonjs/tree/master/examples/transform-ui5-to-commonjs-example#transform-ui5-to-commonjs-example), which uses this plugin to allow [jest](https://facebook.github.io/jest/) to synchronously `require` UI5 modules.

## Usage

```shell
npm install --save-dev babel-plugin-transform-ui5-to-commonjs
```

Add the transform to your .babelrc:

```shell
{
  "plugins": ["transform-ui5-to-commonjs"]
}
```

## Examples

### Define - sap.ui.define

Input:

```javascript
sap.ui.define(['jquery', 'underscore', 'myModule'], function($, _) {
  // ...
  return {
    // ...
  };
});
```

Output:

```javascript
module.exports = function() {
  var $ = require('jquery');
  var _ = require('underscore');
  require('myModule');
  // ...
  return {
    // ...
  };
}();
```

### Require - sap.ui.require

Input:

```javascript
// Nested requires
sap.ui.require(['jquery', 'underscore', 'myModule'], function($, _) {
  // ...
  sap.ui.require(['anotherModule'], function(anotherModule) {
    // ...
  });
});
```

Output:

```javascript
(function() {
  var $ = require('jquery');
  var _ = require('underscore');
  require('myModule');
  // ...
  (function() {
    var anotherModule = require('anotherModule');
    // ...
  })();
})();
```

## Options

Specify options in your .babelrc:

```json
{
  "plugins": [
    ["transform-ui5-to-commonjs", { "restrictToTopLevelDefine": true }]
  ]
}
```

- `restrictToTopLevelDefine`: (default: `true`) When `true`, only transform `sap.ui.define` calls that appear at the top-level of a program. Set to `false` to transform _all_ calls to `sap.ui.define`.

## Escape Hatch

If you need to ignore specific modules that are picked up by the plugin (for example, those that are erroneously detected as UI5 modules), you can add an ignore comment at the top of the file:

```javascript
/* transform-ui5-to-commonjs-ignore */
sap.ui.define(['stuff', 'here'], function(donkeys, aruba) {
  return {
      llamas: donkeys.version,
      cows: aruba.hi
  };
});
```

The above module won't be transformed to CommonJS. The ignore comment must be at the beginning of the file and must be the only text in the comment block.

## Details

### Supported Versions

Only LTS versions of Node.js still in maintenance will be supported going forward. Older versions of the plugin may support older versions of Node.js. See the [Node.js site](https://nodejs.org/en/about/releases/) for LTS details.

While this plugin lists @babel/core@^7.0.0 as a peer dependency, it should still work fine with babel-core@^6.0.0.
Listing this peer dependency aligns with [what is done by the core babel plugins](https://babeljs.io/docs/en/v7-migration#versioning-dependencies-blog-2017-12-27-nearing-the-70-releasehtml-peer-dependencies-integrations).

### UI5 modules = AMD

AMD is interpreted as described by the [AMD specification](https://github.com/amdjs/amdjs-api/blob/master/AMD.md).

- By default, only _top-level_ calls to a `sap.ui.define` function will be transformed. Use the `restrictToTopLevelDefine` option to transform calls that are not at the top-level.
- _All_ calls to `require` where it is given an array of dependencies as its first argument will be transformed.
- Explicitly requiring `require`, `module`, and `exports` in an AMD module will not generate a call to require, but instead defer to the global require, module, and exports assumed to be in the CommonJS environment you are transforming to.
  - The same is true for the [simplified CommonJS wrapper](http://requirejs.org/docs/api.html#cjsmodule).
- The module name (optional first argument to `sap.ui.define`) is ignored, since the module ID in CommonJS is determined by the resolved filename.

## Caveats

### One module per file

Make sure that you have only one AMD module defined per file, otherwise you'll experience strange results once transformed to the CommonJS format.

### Listing module dependencies inline (v1.6 and above)

In v1.6, require dependencies and factories with unknown types (at build time) are now supported.  The dependency list may be a function call or variable name that resolves to an array-like type at runtime.  The factory may be a function call or variable name that resolves to a function at runtime.

```javascript
sap.ui.require(getDeps(), myFactoryFunction);
```

will be transformed to:

```javascript
(function () {
  var maybeFunction = myFactoryFunction;
  var amdDeps = getDeps();
  if (!Array.isArray(amdDeps)) {
    return require(amdDeps);
  }
  if (typeof maybeFunction !== "function") {
    maybeFunction = function () {};
  }
  maybeFunction.apply(void 0, amdDeps.map(function (dep) {
    return {
      require: require,
      module: module,
      exports: module.exports
    }[dep] || require(dep);
  }));
}).apply(this);
```

If either the dependency list is known to be an array, or the factory is known to be a function, at build time then the associated runtime type checking for the argument is omitted from the generated code.

Calls to `sap.ui.define` are transformed in a similar manner, but include code for assigning the value returned by the factory function to module.exports:

```javascript
(function () {
  var maybeFunction = factory;
  var amdDeps = deps;
  if (typeof amdDeps === 'string') {
    amdDeps = ['require', 'exports', 'module'];
  }
  if (typeof maybeFunction !== "function") {
    var amdFactoryResult = maybeFunction;
    maybeFunction = function () {
      return amdFactoryResult;
    };
  }
  var amdDefineResult = maybeFunction.apply(void 0, amdDeps.map(function (dep) {
    return {
      require: require,
      module: module,
      exports: module.exports
    }[dep] || require(dep);
  }));
  typeof amdDefineResult !== "undefined" && (module.exports = amdDefineResult);
}).apply(this);
```

### Listing module dependencies inline (v1.5)

The following will _not_ be transformed, since the plugin only accounts for dependencies that are specified using an inline array literal:

```javascript
// DON'T DO THIS! It won't be transformed correctly.
var dependencies = ['one', 'two'];
sap.ui.define(dependencies, function(one, two) {
  one.doStuff();
  return two.doStuff();
});
```

If you want to be able to define your dependencies as above, please submit an issue. Otherwise, please define your modules as:

```javascript
sap.ui.define(['one', 'two'], function(one, two) {
  one.doStuff();
  return two.doStuff();
});
```

However, specifying the factory as a variable _is_ supported (but only for calls to `sap.ui.define`):

```javascript
// All's good! Transforming this code is supported
var factory = function(one, two) {
  one.doStuff();
  return two.doStuff();
};
sap.ui.define(['one', 'two'], factory);
```

A runtime check has to be done to determine what to export, so the transformed code looks like this:

```javascript
var factory = function(one, two) {
  one.doStuff();
  return two.doStuff();
};
var maybeFactory = factory;
if (typeof maybeFactory === 'function') {
  module.exports = factory(require('one'), require('two'));
} else {
  require('one');
  require('two');
  module.exports = maybeFactory;
};
```

It looks a bit weird, but it's all necessary.
Keep in mind that everything is done with static analysis, so if the factory isn't specified as an inline function literal, it's impossible to tell exactly what value it will take until runtime.

### Injecting `require`, `module`, or `exports` as dependencies

It is strongly advised to simply use return statements to define your UI5 module's exports.
That being said, the plugin takes into account the cases where you may have injected them as dependencies.
Beware of the following gotchas when using this pattern:

- If you're injecting `module`, `exports`, and/or `require` as dependencies, they must be injected as string literals,
otherwise you'll end up with things like `require('module')`.
- Returning any value other than `undefined` from a factory function will override anything you assign to `module` or `exports`.
  This behaviour is in accordance with the AMD specification.
  Unless you're doing something really weird in your modules, you don't have to worry about this case, but the plugin handles it by performing a check as needed on the return value of the factory function.
  For example:

  Input (UI5):

  ```javascript
  sap.ui.define(['module'], function(module) {
    module.exports = { hey: 'boi' };
    return { value: 22 };
  });
  ```

  Output (CommonJS):

  ```javascript
  var amdDefineResult = function() {
    module.exports = { hey: 'boi' };
    return { value: 22 };
  }();
  typeof amdDefineResult !== 'undefined' && (module.exports = amdDefineResult);
  ```

  Note that `{ value: 22 }` is correctly exported in both cases.
  Without the `typeof amdDefineResult !== 'undefined'` check in place, `{ hey: 'boi' }` would have been erroneously exported once transformed to CommonJS, since the plugin would otherwise transform this module to just:

  ```javascript
  (function() {
    module.exports = { hey: 'boi' };
    return { value: 22 };
  })()
  ```

  This pattern is only used if necessary. The variable `amdDefineResult` is generated to be unique in its scope.
