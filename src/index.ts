#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as chalk from 'chalk';
import * as figlet from 'figlet';
import { program } from 'commander';
import { Syncer } from './syncer';

dotenv.config();

console.log(
  chalk.green(figlet.textSync('Syncman', { horizontalLayout: 'full' })),
);

program
  .version('0.1.0')
  .description(
    'CLI tool to sync OAS files to Postman and generating Postman collections from them',
  )
  .option(
    '-l, --location <oas file location>',
    'Open API Spec (OAS) file location',
  )
  .option('-a, --apiname <api name>', 'API name')
  .option('-v, --versionname <version name>', 'API version name')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.error(chalk.red('Error: no options were selected, exiting'));
  process.exit(1);
}

const options = program.opts<{
  apiname: string;
  versionname?: string;
  location: string;
}>();
if (!options.apiname || !options.location) {
  console.error(
    chalk.red('Error: "apiname" or "location" options were not set, exiting'),
  );
  process.exit(1);
}

const apiVersionName = options.versionname ?? 'Latest';

const syncer = new Syncer(options.apiname, options.location, apiVersionName);

(async () => {
  try {
    await syncer.setup();
    await syncer.uploadOAS();
    await syncer.updateCollection();

    console.log(
      chalk.green(
        `Synced API "${options.apiname}" with version "${apiVersionName}" successfully`,
      ),
    );
  } catch (e: any) {
    console.error(chalk.red(e.toString()));
  }
})();
