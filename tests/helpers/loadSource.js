/**
 * Load a project source file into a fresh vm context and return that context.
 *
 * Because the source files are plain ES5 globals (no module system), we
 * use Node's `vm` module to execute them in an isolated scope where we can
 * control which globals are pre-populated and inspect which new globals the
 * file defines.
 *
 * @param {string}  filename     - Path relative to the project root.
 * @param {object}  extraGlobals - Globals to inject before running the file.
 * @returns {object} The vm context after execution (contains all defined globals).
 */
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '../..');

function loadSource(filename, extraGlobals) {
    const code    = fs.readFileSync(path.join(ROOT, filename), 'utf8');
    const context = Object.assign({ Infinity, NaN, Math, parseInt, parseFloat, Object, Array, JSON }, extraGlobals || {});
    vm.runInNewContext(code, context);
    return context;
}

module.exports = { loadSource, ROOT };
