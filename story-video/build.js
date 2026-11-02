const fs = require("fs");
let s = fs.readFileSync(__dirname + "/template.html", "utf8");
s = s.replace(/\{\{icon:([a-z0-9-]+)\}\}/g, (_, n) => fs.readFileSync(`${__dirname}/node_modules/lucide-static/icons/${n}.svg`, "utf8")
  .replace(/<!--[\s\S]*?-->/g, "").replace(/<svg[\s\S]*?>/, tag => tag.replace(/\s(width|height)="\d+"/g, "").replace(/\sclass="[^"]*"/, "").replace("<svg", '<svg class="ic"')).trim());
fs.writeFileSync(__dirname + "/index.html", s);
console.log("built index.html", s.length);
