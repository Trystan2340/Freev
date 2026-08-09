import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
function runPython(args){
  const configured=process.env.PYTHON;
  const candidates=configured?[[configured,args]]:[["python",args],["python3",args],["py",["-3",...args]]];
  for(const [cmd,a] of candidates){const r=spawnSync(cmd,a,{stdio:"inherit",env:{...process.env,PYTHONUTF8:"1"}});if(!r.error){if(r.status!==0)process.exit(r.status||1);return}}
  console.error("FREEV: Python 3 is required for the mandatory icon pipeline");process.exit(1);
}
// Mandatory gate: every pending icon is imported before a build can succeed.
runPython(["tools/icon_pipeline.py","sync","--enforce"]);
fs.rmSync("dist",{recursive:true,force:true});fs.mkdirSync("dist",{recursive:true});
const copy=(src,dst)=>fs.copyFileSync(src,path.join("dist",dst));
copy("web/freev-icon.js","freev-icon.js");copy("web/generated-apps.js","generated-apps.js");copy("web/styles/freev-themes.css","freev-themes.css");copy("types/freev-icon.d.ts","freev-icon.d.ts");copy("types/freev-react.d.ts","freev-react.d.ts");copy("types/freev-vue.d.ts","freev-vue.d.ts");
let react=fs.readFileSync("web/frameworks/FreevIconReact.jsx","utf8").replaceAll('"../freev-icon.js"','"./freev-icon.js"');fs.writeFileSync(path.join("dist","FreevIconReact.js"),react);
let vue=fs.readFileSync("web/frameworks/FreevIconVue.js","utf8").replaceAll('"../freev-icon.js"','"./freev-icon.js"');fs.writeFileSync(path.join("dist","FreevIconVue.js"),vue);
let vueSfc=fs.readFileSync("web/frameworks/FreevIconVue.vue","utf8").replaceAll('"../freev-icon.js"','"./freev-icon.js"');fs.writeFileSync(path.join("dist","FreevIconVue.vue"),vueSfc);
console.log("FREEV Icon System V2.7 automatic build complete");
