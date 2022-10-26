import fs from "fs/promises";
import process from "process";
import { read } from "to-vfile";
import vfileReporter from "vfile-reporter";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import Parser from "./index.js";

const argv = await yargs(hideBin(process.argv))
  .help()
  .version()
  .command("$0 <inFile> [outFile]", "", (argv) =>
    argv
      .positional("inFile", {
        describe: "A JSON schema file",
        type: "string",
      })
      .positional("outFile", {
        describe: "An output Typescript file",
        type: "string",
      })
      .demandOption("inFile")
  ).argv;

const out = await Parser.processSync(await read(argv.inFile));

vfileReporter(out, { verbose: true });

const isFatal = out.messages.some((message) => message.fatal === true);
if (isFatal) {
  process.exit(1);
}

if (argv.outFile) {
  await fs.writeFile(argv.outFile, out.toString());
} else {
  console.log(out.toString());
}
process.exit(0);
