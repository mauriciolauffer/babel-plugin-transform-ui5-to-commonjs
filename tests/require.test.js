'use strict';

const { TRANSFORM_AMD_TO_COMMONJS_IGNORE } = require('../src/constants');
const { checkVariableDepAndFactoryResult } = require('./test-helpers');

describe('Plugin for require blocks', () => {
  it('transforms require blocks with one dependency', () => {
    expect(`
      sap.ui.require(['llamas'], function(llama) {
        llama.doSomeStuff();
      });
    `).toBeTransformedTo(`
      (function() {
        var llama = require('llamas');
        llama.doSomeStuff();
      })();
    `);
  });

  it('transforms require blocks with multiple dependencies', () => {
    expect(`
      sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
        llama.doSomeStuff();
        frog.sayRibbit();
      });
    `).toBeTransformedTo(`
      (function() {
        var llama = require('llamas');
        var frog = require('frogs');
        llama.doSomeStuff();
        frog.sayRibbit();
      })();
    `);
  });

  it('transforms require blocks with unused dependencies', () => {
    expect(`
      sap.ui.require(['llamas', 'frogs'], function(llama) {
        llama.doSomeStuff();
      });
    `).toBeTransformedTo(`
      (function() {
        var llama = require('llamas');
        require('frogs');
        llama.doSomeStuff();
      })();
    `);
  });

  it('transforms require blocks that have no factory function', () => {
    expect(`
      sap.ui.require(['here', 'are', 'some', 'deps']);
    `).toBeTransformedTo(`
      require('here');
      require('are');
      require('some');
      require('deps');
    `);
  });

  it('transforms nested require blocks that have no factory function', () => {
    expect(`
      sap.ui.require(['here', 'is', 'i'], function(here) {
        here.doStuff();
        sap.ui.require(['yep', 'that', 'me']);
      });
    `).toBeTransformedTo(`
      (function() {
        var here = require('here');
        require('is');
        require('i');
        here.doStuff();
        require('yep');
        require('that');
        require('me');
      })();
    `);
  });

  it('transforms nested require blocks that have a factory function', () => {
    expect(`
      sap.ui.require(['here', 'is', 'i'], function(here) {
        here.doStuff();
        sap.ui.require(['yep', 'that', 'me'], function(yep) {
          yep.doStuff();
        });
      });
    `).toBeTransformedTo(`
      (function() {
        var here = require('here');
        require('is');
        require('i');
        here.doStuff();
        (function() {
          var yep = require('yep');
          require('that');
          require('me');
          yep.doStuff();
        })();
      })();
    `);
  });

  it('transforms a require block that is within a define block', () => {
    expect(`
      sap.ui.define(['here', 'is', 'i'], function(here) {
        here.doStuff();
        sap.ui.require(['yep', 'that', 'me'], function(yep) {
          yep.doStuff();
        });
      });
    `).toBeTransformedTo(`
      module.exports = (function() {
        var here = require('here');
        require('is');
        require('i');
        here.doStuff();
        (function() {
          var yep = require('yep');
          require('that');
          require('me');
          yep.doStuff();
        })();
      })();
    `);
  });

  it('ignores non-function factories', () => {
    expect(`
      sap.ui.require(['sup', 'dawg', 'hi'], { nonFunction: 'factory' });
    `).toBeTransformedTo(`
      require('sup');
      require('dawg');
      require('hi');
    `);
  });

  it('transforms factories that use the rest operator', () => {
    expect(`
      sap.ui.require(['dep1', 'dep2', 'dep3'], function(dep, ...rest) {
        dep.doStuff()
      })
    `).toBeTransformedTo(`
      (function() {
        var dep = require('dep1');
        var rest = [require('dep2'), require('dep3')];
        dep.doStuff();
      })();
    `);
  });

  it('transforms factories that use the rest operator including AMD keywords', () => {
    expect(`
      sap.ui.require(['dep1', 'dep2', 'module', 'exports', 'require'], function(dep, ...rest) {
        dep.doStuff();
      });
    `).toBeTransformedTo(`
      (function() {
        var dep = require('dep1');
        var rest = [require('dep2'), module, exports, require];
        dep.doStuff();
      })();
    `);
  });

  it('transforms factories that use the rest operator when there are no rest arguments', () => {
    expect(`
      sap.ui.require(['dep1'], function(dep, ...rest) {
        dep.doStuff();
      });
    `).toBeTransformedTo(`
      (function() {
        var dep = require('dep1');
        var rest = [];
        dep.doStuff();
      })();
    `);
  });

  it('ignores modules that have been excluded by block comments', () => {
    const program = `
      /* ${TRANSFORM_AMD_TO_COMMONJS_IGNORE} */
      sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
        llama.doSomeStuff();
        frog.sayRibbit();
      });
    `;
    expect(program).toBeTransformedTo(program);
  });

  it('ignores modules that have been excluded by line comments', () => {
    const program = `
      // ${TRANSFORM_AMD_TO_COMMONJS_IGNORE}
      sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
        llama.doSomeStuff();
        frog.sayRibbit();
      });
    `;
    expect(program).toBeTransformedTo(program);
  });

  it.each([TRANSFORM_AMD_TO_COMMONJS_IGNORE, 'a really nice comment'])(
    'transforms normally with non-top-level block comments',
    (comment) => {
      expect(`
        sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
          /* ${comment} */
          llama.doSomeStuff();
          frog.sayRibbit();
        });
      `).toBeTransformedTo(`
        (function() {
          var llama = require('llamas');
          var frog = require('frogs');
          /* ${comment} */
          llama.doSomeStuff();
          frog.sayRibbit();
        })();
      `);
    }
  );

  it.each([TRANSFORM_AMD_TO_COMMONJS_IGNORE, 'a really nice comment'])(
    'transforms normally with non-top-level line comments',
    (comment) => {
      expect(`
        sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
          // ${comment}
          llama.doSomeStuff();
          frog.sayRibbit();
        });
      `).toBeTransformedTo(`
        (function() {
          var llama = require('llamas');
          var frog = require('frogs');
          // ${comment}
          llama.doSomeStuff();
          frog.sayRibbit();
        })();
      `);
    }
  );

  it.each(['random comment', 'transform-amd-to-commonjs'])(
    'transforms normally with random top-level comments',
    (comment) => {
      expect(`
        /* ${comment} */
        // ${comment}
        sap.ui.require(['llamas', 'frogs'], function(llama, frog) {
          llama.doSomeStuff();
          frog.sayRibbit();
        });
      `).toBeTransformedTo(`
        /* ${comment} */
        // ${comment}
        (function() {
          var llama = require('llamas');
          var frog = require('frogs');
          llama.doSomeStuff();
          frog.sayRibbit();
        })();
      `);
    }
  );

  it('transforms require with non-array dependency list', () => {
    expect(`
    sap.ui.require(deps, function(foo, bar) {
        foo.doSomething();
        bar.doSomethingElse();
      });
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: `function(foo, bar) {
          foo.doSomething();
          bar.doSomethingElse();
        }`,
        dependencies: 'deps',
        checkDeps: true,
        checkFactory: false,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with non-array dependencies and non-function factory', () => {
    expect(`
    sap.ui.require(deps, factory);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'factory',
        dependencies: 'deps',
        checkDeps: true,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and member expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], this.factory);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'this.factory',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and optional member expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], foo?.factory);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'foo?.factory',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and call expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], getFactory());
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'getFactory()',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and optional call expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], getFactory?.());
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'getFactory?.()',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and array expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], factories[i]);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'factories[i]',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and logical expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], factory1 || factory2);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'factory1 || factory2',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and conditional expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], foo ? factory1 : factory2);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'foo ? factory1 : factory2',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and assignment expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], factory = myFactory);
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: 'factory = myFactory',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });

  it('transforms require with array dependencies and parenthesized expression expression factory', () => {
    expect(`
      sap.ui.require(["dep1", "dep2"], (factory = myFactory));
    `).toBeTransformedTo(
      checkVariableDepAndFactoryResult({
        factory: '(factory = myFactory)',
        dependencies: '["dep1", "dep2"]',
        checkDeps: false,
        checkFactory: true,
        isDefineCall: false,
      })
    );
  });
});
