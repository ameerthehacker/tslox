#! env ./node_modules/.bin/ts-node
import { promises as fs } from 'fs';

async function main() {
  if (process.argv.length === 2) {
    console.error(`script file was not provided`);

    return;
  }

  const scriptFilePath = process.argv[2];

  const scriptFileContent = await fs.readFile(scriptFilePath, 'utf-8');

  console.log(scriptFileContent);
}

main().then(() => {});
