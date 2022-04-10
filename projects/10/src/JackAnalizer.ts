
import fs from 'fs'
import path from 'path'
import * as yargs from 'yargs'
import { JackTokenizer } from './JackTokenizer'
import { CompileEngine } from './CompileEngine'

const argv = yargs
    .option('file', {
        alias: 'f',
        type: 'string',
        description: 'file or directory path. if the directory specified, all .vm files in the directory will be read',
        demandOption: true
    })
    .help()
    .parseSync()


function generateDestFileName(filePath: string): string {
    const srcPathObject = path.parse(filePath);
    let destPathObject = { ...srcPathObject };

    const firstFileStats = fs.statSync(filePath);
    if (firstFileStats.isDirectory()) {
        destPathObject.dir = filePath;
    }

    destPathObject.base = "";// if "base" property exists, "ext" parameter will be ignored.
    destPathObject.ext = ".asm";
    return path.format(destPathObject)
}

/**
 * Extract file paths and returns them as list.
 * If targetPath is file, returns a list contains only one file.
 * If targetPath is directory, returns a list contains all files that has designated extension suffix.
 * 
 * @param targetPath :file or directory path
 * @param targetExt  :to be extracted files that has this extension. Specify from dot. ex:".vm",".jack"
 * @returns string list of file paths
 * @throws {string} :There are no valid file nor directory path.
 */

function generateTargetFileList(targetPath: string, targetExt: string) {

    const firstFileStats = fs.statSync(targetPath);
    if (firstFileStats.isFile() && path.parse(targetPath).ext === targetExt) {
        return [targetPath];
    } else if (firstFileStats.isDirectory()) {
        const filenames = fs.readdirSync(targetPath);
        const targetFilePaths = filenames.filter(filename => {
            const fullPath = path.join(targetPath, filename);
            const filePath = path.parse(fullPath);
            const fileStats = fs.statSync(fullPath);
            return (filePath.ext === targetExt && fileStats.isFile());
        }).map(filename => path.join(targetPath, filename));
        return targetFilePaths;
    }

    console.log("The specified path is neither valid file path nor directory path. input path: " + targetPath);
    throw new Error("The target path is invalid");
}

/**
 * Create output file path.
 * Returns path with the last directory name of "orgSrcPath" replaced by "dstDirName".
 * And create directories of it if needed.
 * 
 * @param orgSrcPath :source file path requested to be output path.
 * @param dstDirName :name of output directory. Default="out".
 * @param dstExt :Extension of output file. Default=".xml"
 */
function createDestFilePath(orgSrcPath: string, dstDirName: string = "out", dstExt: string = ".xml") {
    const fileStatus = fs.statSync(orgSrcPath);
    if (!fileStatus.isFile()) {
        throw new Error("orgSrcPath is not file path");
    }

    let pathObject = path.parse(orgSrcPath);
    pathObject.dir = path.join(path.dirname(pathObject.dir), dstDirName);
    pathObject.base = pathObject.name + dstExt;

    fs.promises.mkdir(pathObject.dir, { recursive: true })

    //generate path from pathObject. It uses only dir and base parameter.
    return path.format(pathObject);
}


/****************
 * main process *
 ****************/
const filePath = argv.file.trim();//なぜか冒頭・末尾にスペースが入るため除去する
const targetSrcFilePaths = generateTargetFileList(filePath, ".jack");
if (targetSrcFilePaths.length === 0) {
    console.log("There are no target files");
    throw new Error("There are no target files");
}

targetSrcFilePaths.forEach(targetSrcFilePath => {
    const jackTokenizer = new JackTokenizer(targetSrcFilePath);
    const parsedTokens = jackTokenizer.tokenize();

    const outputFilePath = createDestFilePath(targetSrcFilePath);
    const compileEngine = new CompileEngine(parsedTokens);
    compileEngine.compile(parsedTokens, outputFilePath);
});