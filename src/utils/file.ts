import fs from 'fs';

function createFolder(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath);
  } catch (err: any) {
    if (err.code === 'EEXIST') {
      return;
    }
    throw err;
  }
}

function readFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
}

function readFolderContent(dirPath: string): string[] | null {
  if (!fs.existsSync(dirPath)) {
    return null;
  }
  return fs.readdirSync(dirPath);
}

export { createFolder, readFile, readFolderContent };
