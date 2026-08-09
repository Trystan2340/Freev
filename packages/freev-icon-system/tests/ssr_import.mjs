import assert from "node:assert/strict";
const mod=await import("../dist/freev-icon.js");
assert.equal(typeof mod.FreevIcon,"function");
assert.equal(typeof mod.clearFreevIconCaches,"function");
console.log("SSR import PASS");
