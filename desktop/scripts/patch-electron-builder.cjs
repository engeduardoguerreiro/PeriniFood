const fs = require("node:fs");
const path = require("node:path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "app-builder-lib",
  "out",
  "util",
  "electronGet.js",
);

if (!fs.existsSync(target)) process.exit(0);

const original = "        await fs.rename(tmpDir, dir);";
const replacement = `        for (let attempt = 0; ; attempt += 1) {
            try {
                await fs.rename(tmpDir, dir);
                break;
            }
            catch (error) {
                if ((error.code !== "EPERM" && error.code !== "EBUSY") || attempt >= 180) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }`;

const source = fs.readFileSync(target, "utf8");
if (source.includes(replacement)) process.exit(0);
if (source.includes("attempt >= 20")) {
  fs.writeFileSync(target, source.replace("attempt >= 20", "attempt >= 180"));
  process.exit(0);
}
if (!source.includes(original)) {
  throw new Error("Não foi possível aplicar o ajuste de empacotamento do Windows.");
}

fs.writeFileSync(target, source.replace(original, replacement));
