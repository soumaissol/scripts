import fs from 'fs';
import { decode } from 'html-entities';
import { Logger } from 'sms-api-commons';

import { formatRegisterNumber } from '../utils/broker';
import { createFolder, readFile } from '../utils/file';
import {
  firstRegisterNumber,
  inputDetailsDir,
  lastRegisterNumber,
  outputDir,
  outputFile,
  outputMainDir,
} from './constants';

const logger = Logger.get();

function writeCsvHeader(orderedFields: string[]): void {
  fs.writeFileSync(outputFile, `${orderedFields.join(',')}\n`);
}

function writeCsvLine(orderedFields: string[], broker: Map<string, string>): void {
  const brokerFields: string[] = [];
  for (const field of orderedFields) {
    brokerFields.push(broker.get(field) || '');
  }
  fs.appendFileSync(outputFile, decode(`${brokerFields.join(',')}\n`));
}

function orderFieldsForCsv(fields: string[]): string[] {
  const orderedFields = ['RegisterNumber', 'FullName'];
  const phoneFields: string[] = [];
  for (const field of fields) {
    if (field === 'RegisterNumber' || field === 'FullName') {
      continue;
    }
    if (field.startsWith('Telefone ')) {
      phoneFields.push(field);
      continue;
    }
    orderedFields.push(field);
  }
  orderedFields.push(...phoneFields);
  return orderedFields;
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

  // full name
  matches = pageData.matchAll(/<h3>(.*)<\/h3>/g);
  match = matches.next();
  fieldsFound.set('FullName', match.value[1].trim());

  // phone
  matches = pageData.matchAll(/<span>([0-9 ()-]+)<\/span>/g);
  match = matches.next();
  const phonesFound: string[] = [];
  while (!match.done) {
    phonesFound.push(match.value[1].trim());
    match = matches.next();
  }
  for (const phone of phonesFound) {
    fieldsFound.set(`Telefone ${phonesFound.indexOf(phone) + 1}`, phone);
  }

  return fieldsFound;
}

async function run(): Promise<void> {
  logger.info(`start at ${new Date().toJSON()}`);

  buildFoldersStructure();

  const fields: string[] = [];
  logger.info(`building header ${new Date().toJSON()}`);

  for (let i = firstRegisterNumber; i < lastRegisterNumber; i++) {
    const pageData = readFile(`${inputDetailsDir}/${formatRegisterNumber(i)}.html`);
    if (pageData === null) {
      continue;
    }
    const fieldsForPage = parsePageData(pageData);
    for (const field of fieldsForPage.keys()) {
      if (fields.indexOf(field) === -1) {
        fields.push(field);
      }
    }
  }

  const orderedFields = orderFieldsForCsv(fields);
  writeCsvHeader(orderedFields);

  logger.info(`wrinting lines ${new Date().toJSON()}`);

  for (let i = firstRegisterNumber; i < lastRegisterNumber; i++) {
    const pageData = readFile(`${inputDetailsDir}/${formatRegisterNumber(i)}.html`);
    if (pageData === null) {
      continue;
    }
    const fieldsForPage = parsePageData(pageData);
    writeCsvLine(orderedFields, fieldsForPage);
  }

  logger.info(`finished at ${new Date().toJSON()}`);
}

run();
