import async from 'async';
import axios from 'axios';
import fs from 'fs';
import HttpStatus from 'http-status-codes';
import { Logger } from 'sms-api-commons';

import { formatRegisterNumber } from '../utils/broker';
import { createFolder } from '../utils/file';
import { asyncLimit, batchSize, detailsUrl, outputDetailsDir, outputDir, outputMainDir, startAt } from './constants';

const logger = Logger.get();

const buildRequestHeaders = (): any => {
  return {
    authority: 'www.crecisp.gov.br',
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', // eslint-disable-line max-len
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,zh-SG;q=0.6,zh-TW;q=0.5,zh-MO;q=0.4,zh;q=0.3',
    'cache-control': 'no-cache',
    'content-type': 'application/x-www-form-urlencoded',
    cookie:
      '_gid=GA1.3.998750217.1692127848; _gat=1; _hjFirstSeen=1; _hjIncludedInSessionSample_2847946=0; _hjSession_2847946=eyJpZCI6Ijg4OTM2NjliLWNjMDItNDk1Zi04MTU1LWE1ZDVlYmY0Y2FmZiIsImNyZWF0ZWQiOjE2OTIxMjc4NDg0ODUsImluU2FtcGxlIjpmYWxzZX0=; _hjAbsoluteSessionInProgress=0; ASP.NET_SessionId=lnsunyhhbrdsxwkmtyph5kuq; _ga=GA1.1.2036125534.1692127848; _hjSessionUser_2847946=eyJpZCI6IjYzNWFkYmMyLWU1ZmYtNTQ3Yy1hOWQ1LTNkMDljOTY3MTM4MiIsImNyZWF0ZWQiOjE2OTIxMjc4NDg0NzcsImV4aXN0aW5nIjp0cnVlfQ==; _ga_R8ML0SEZ94=GS1.1.1692127848.1.1.1692127862.46.0.0', // eslint-disable-line max-len
    origin: 'https://www.crecisp.gov.br',
    pragma: 'no-cache',
    referer: 'https://www.crecisp.gov.br/cidadao/listadecorretores',
    'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36', // eslint-disable-line max-len
  };
};

function writeDetailsResult(registerNumber: string, pageData: string): void {
  fs.writeFileSync(`${outputDetailsDir}/${registerNumber}.html`, pageData);
}

function buildFoldersStructure(): void {
  createFolder(outputMainDir);
  createFolder(outputDir);
  createFolder(outputDetailsDir);
}

function alreadyCrawled(registerNumber: string): boolean {
  return fs.existsSync(`${outputDetailsDir}/${registerNumber}.html`);
}

function isSessionOver(pageData: string): boolean {
  if (pageData.match(/<title>Busca\s+por\s+Corretores\s+-\s+CRECISP<\/title>/g) !== null) {
    return true;
  }
  return false;
}

function hasValidData(pageData: string): boolean {
  if (pageData.indexOf('RegisterNumber') !== -1) {
    return true;
  }
  return false;
}

async function requestDetails(registerNumber: string): Promise<string | null> {
  try {
    logger.info(`requestDetails ${registerNumber} at ${new Date().toJSON()}`);

    const result = await axios.post(`${detailsUrl}`, `registerNumber=${registerNumber}`, {
      headers: buildRequestHeaders(),
    });
    if (result.status !== HttpStatus.OK) {
      const message = `error fetching details ${registerNumber}: status ${result.status}`;
      logger.error(message);
      throw new Error(message);
    }
    const pageData = result.data;
    if (isSessionOver(pageData)) {
      throw new Error('session is over');
    }
    return pageData;
  } catch (err: any) {
    if (err.response) {
      const response = (err as any).response;
      const message = response.data.errors || response.data.message || response.data;
      logger.error(`error fetching details ${registerNumber}: status ${err.status} ${message}`);
    } else {
      logger.error(`error fetching details ${registerNumber}: ${err}`);
    }

    return null;
  } finally {
    logger.info(`requestDetails ${registerNumber} ended at ${new Date().toJSON()}`);
  }
}

function buildIds(): number[] {
  const ids: number[] = [];

  let i = startAt;
  while (i < startAt + batchSize) {
    i++;
    ids.push(i);
  }
  return ids;
}

async function run(): Promise<void> {
  logger.info(`start at ${new Date().toJSON()}`);

  buildFoldersStructure();

  async.mapLimit(
    buildIds(),
    asyncLimit,
    async function (id) {
      const registerNumber = formatRegisterNumber(id);
      if (alreadyCrawled(registerNumber)) {
        return;
      }
      const pageData = await requestDetails(registerNumber);
      if (pageData === null) {
        logger.error(`no page data at ${registerNumber}`);
        return;
      }
      if (!hasValidData(pageData)) {
        logger.info(`stoping at ${registerNumber}, no more valid data`);
        return;
      }
      writeDetailsResult(registerNumber, pageData);
    },
    (err) => {
      if (err) throw err;
      // results is now an array of the response bodies
      logger.info(`finished at ${new Date().toJSON()}`);
    },
  );
}

run();
