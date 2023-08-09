import fs from 'fs';
import { Logger } from 'sms-api-commons';

import { createFolder, readFile, readFolderContent } from '../utils/file';
import { inputDetailsDir, outputDir, outputMainDir } from './constants';

const logger = Logger.get();

function writeCsv(fields: string[], brokers: Map<string, string>[]): void {
  const outputFile = `${outputDir}/crecisp.csv`;
  fs.writeFileSync(outputFile, `${fields.join(',')}\n`);
  for (const broker of brokers) {
    const brokerFields: string[] = [];
    for (const field of fields) {
      brokerFields.push(broker.get(field) || '');
    }
    fs.appendFileSync(outputFile, `${brokerFields.join(',')}\n`);
  }
}

function buildFoldersStructure(): void {
  createFolder(outputMainDir);
  createFolder(outputDir);
}

function parsePageData(pageData: string): Map<string, string> {
  let matches = pageData.matchAll(/<label\s+for="(.*)">(.*)<span>(.*)<\/span>/g);

  let match = matches.next();
  const fieldsFound = new Map<string, string>();
  while (!match.done) {
    fieldsFound.set(match.value[1].trim(), match.value[3].trim());
    match = matches.next();
  }

  matches = pageData.matchAll(/<h3>(.*)<\/h3>/g);
  match = matches.next();
  fieldsFound.set('FullName', match.value[1].trim());

  return fieldsFound;
}

async function run(): Promise<void> {
  logger.info(`start at ${new Date().toJSON()}`);

  buildFoldersStructure();

  const fields: string[] = ['RegisterNumber', 'FullName'];
  const brokers: any[] = [];

  const fileNames = readFolderContent(inputDetailsDir);
  if (fileNames === null) {
    logger.info('no files found');
    return;
  }

  for (const fileName of fileNames) {
    const pageData = readFile(`${inputDetailsDir}/${fileName}`);
    if (pageData === null) {
      continue;
    }
    const fieldsForPage = parsePageData(pageData);
    for (const field of fieldsForPage.keys()) {
      if (fields.indexOf(field) === -1) {
        fields.push(field);
      }
    }
    brokers.push(fieldsForPage);
  }

  writeCsv(fields, brokers);
  logger.info(`finished at ${new Date().toJSON()}`);
}

run();
