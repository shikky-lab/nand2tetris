import fs from 'fs'
import path from 'path'
import * as yargs from 'yargs'
import { CodeWriter } from "./codeWriter"
import { Parser } from "./parser"

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

function extractTargetFileList(targetPath: string) {

    const firstFileStats = fs.statSync(targetPath);
    if (firstFileStats.isFile() && path.parse(targetPath).ext === ".vm") {
        return [targetPath];
    } else if (firstFileStats.isDirectory()) {
        const filenames = fs.readdirSync(targetPath);
        const targetFilePaths = filenames.filter(filename => {
            const fullPath = path.join(targetPath, filename);
            const filePath = path.parse(fullPath);
            const fileStats = fs.statSync(fullPath);
            return (filePath.ext === ".vm" && fileStats.isFile());
        }).map(filename => path.join(targetPath, filename));
        return targetFilePaths;
    }

    console.log("The specified path is neither valid file path nor directory path. input path: " + targetPath);
    throw new Error("The target path is invalid");
}

function parseFiles(filePaths: string[], codeWriter: CodeWriter) {

    filePaths.forEach(filePath => {
        const script = fs.readFileSync(filePath);
        const lines = script.toString().split('\r\n');
        const fileName = path.parse(filePath).name;
        const parser = new Parser(lines);
        codeWriter.setFileName(fileName);
        while (1) {
            if (!parser.hasMoreCommands()) {
                console.log("parse finished!");
                break;
            }
            const command = parser.getCommand();
            codeWriter.convertCommand(command)
            parser.advance();
        }
    })
}

/***** main process *****/

const filePath = argv.file.trim();//なぜか冒頭・末尾にスペースが入るため除去する

const destFilePath = generateDestFileName(filePath);
const codeWriter = new CodeWriter(destFilePath);
codeWriter.writeInitialCode();

const targetFilePaths = extractTargetFileList(filePath);
parseFiles(targetFilePaths, codeWriter);

codeWriter.writeWrapUp();
console.log("added wrap-up code");

codeWriter.writeCode();
console.log("finished all process!!!");