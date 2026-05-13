import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const contractsDir = path.join(root, "contracts");
const artifactsDir = path.join(root, "artifacts", "contracts");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".sol")) out.push(full);
  }
  return out;
}

fs.rmSync(path.join(root, "artifacts"), { recursive: true, force: true });
fs.rmSync(path.join(root, "cache"), { recursive: true, force: true });
fs.mkdirSync(artifactsDir, { recursive: true });

const sources = {};
for (const file of walk(contractsDir)) {
  const relative = path.relative(root, file).replace(/\\/g, "/");
  sources[relative] = { content: fs.readFileSync(file, "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
      }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors || [];
for (const err of errors) {
  const log = err.severity === "error" ? console.error : console.warn;
  log(err.formattedMessage.trim());
}
if (errors.some((err) => err.severity === "error")) {
  process.exit(1);
}

let count = 0;
for (const [sourceName, contracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, data] of Object.entries(contracts)) {
    const sourceDir = path.dirname(sourceName).replace(/^contracts\/?/, "");
    const outDir = path.join(artifactsDir, sourceDir);
    fs.mkdirSync(outDir, { recursive: true });
    const artifact = {
      _format: "hh-sol-artifact-1",
      contractName,
      sourceName,
      abi: data.abi,
      bytecode: `0x${data.evm.bytecode.object}`,
      deployedBytecode: `0x${data.evm.deployedBytecode.object}`,
      linkReferences: data.evm.bytecode.linkReferences || {},
      deployedLinkReferences: data.evm.deployedBytecode.linkReferences || {}
    };
    fs.writeFileSync(path.join(outDir, `${contractName}.json`), JSON.stringify(artifact, null, 2));
    count += 1;
  }
}

console.log(`Compiled ${count} contract artifact(s) with local solc-js ${solc.version()}.`);
