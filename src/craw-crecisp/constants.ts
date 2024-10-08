const detailsUrl = 'https://www.crecisp.gov.br/cidadao/corretordetalhes';
const outputDir = `./output/craw-crecisp`;
const outputDetailsDir = `./output/craw-crecisp/details`;
const outputMainDir = './output';
const startAt = 40000;
const batchSize = 30000;
const asyncLimit = 3;
export { asyncLimit, batchSize, detailsUrl, outputDetailsDir, outputDir, outputMainDir, startAt };
