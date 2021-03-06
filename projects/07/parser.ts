
import yargs from 'yargs/yargs';
import fs from 'fs';
import path from "path";
import { Command } from 'commander';
import { CodeWriter } from "./CodeWriter"

const command = yargs(process.argv.slice(2)).options({
    f: { type: 'string', demandOption: true }
});

const isNumber = /^\d*$/;

export type ArithmeticCommand = { calcType: "ADD" } | { calcType: "SUB" } | { calcType: "ADD" } | { calcType: "NEG" } | { calcType: "EQ" } | { calcType: "GT" } | { calcType: "LT" } | { calcType: "AND" } | { calcType: "OR" } | { calcType: "NOT" }
export type VmCommand = { type: "ARITHMETIC", calc: ArithmeticCommand } | { type: "PUSH", arg1: string, arg2: number } | { type: "POP", arg1: string, arg2: number } | { type: "LABEL" } | { type: "GOTO" } | { type: "IF" } | { type: "FUNCTION" } | { type: "RETURN" } | { type: "CALL" } | { type: "NONE" };

class Parser {
    private curPos = 0;
    private lines: string[] = [];

    constructor(lines: string[]) {
        this.lines = lines;
    }

    public getCommand(): VmCommand {
        let line = this.lines[this.curPos];

        //コメント除去
        let commentPos = line.indexOf("//");
        if (commentPos != -1) {
            line = line.substr(0, commentPos);
        }

        //コマンド部分の文字列を抽出
        let regex = /(\S+)/g
        let commandWords = line.match(regex);

        if (commandWords == null || commandWords.length == 0) {
            return { type: "NONE" };
        }

        //コマンドに応じた型に変換してreturn
        switch (commandWords[0].toLowerCase()) {
            case "add":
                return { type: "ARITHMETIC", calc: { calcType: "ADD" } }
            case "sub":
                return { type: "ARITHMETIC", calc: { calcType: "SUB" } }
            case "neg":
                return { type: "ARITHMETIC", calc: { calcType: "NEG" } }
            case "eq":
                return { type: "ARITHMETIC", calc: { calcType: "EQ" } }
            case "gt":
                return { type: "ARITHMETIC", calc: { calcType: "GT" } }
            case "lt":
                return { type: "ARITHMETIC", calc: { calcType: "LT" } }
            case "and":
                return { type: "ARITHMETIC", calc: { calcType: "AND" } }
            case "or":
                return { type: "ARITHMETIC", calc: { calcType: "OR" } }
            case "not":
                return { type: "ARITHMETIC", calc: { calcType: "NOT" } }
            case "push":
                if (commandWords.length != 3) {
                    throw Error("Irregal format of push. line:" + this.curPos);
                }
                if (!isNumber.test(commandWords[2])) {
                    throw Error("Irregal format of push. Couldn't convert arg2. line:" + this.curPos);
                }
                return { type: "PUSH", arg1: commandWords[1], arg2: Number(commandWords[2]) };
            case "pop":
                if (commandWords.length != 3) {
                    throw Error("Irregal format of pop. line:" + this.curPos);
                }
                if (!isNumber.test(commandWords[2])) {
                    throw Error("Irregal format of pop. Couldn't convert arg2. line:" + this.curPos);
                }
                return { type: "POP", arg1: commandWords[1], arg2: Number(commandWords[2]) };
            case "label":
                return { type: "LABEL" };
            case "goto":
                return { type: "GOTO" };
            case "if-goto":
                return { type: "IF" };
            case "function":
                return { type: "FUNCTION" };
            case "return":
                return { type: "RETURN" };
            case "call":
                return { type: "CALL" };
            default:
                throw Error("Irregal command exists. line:" + this.curPos);
        }
    }

    public hasMoreCommands(): boolean {
        if (this.curPos < this.lines.length) {
            return true;
        }
        return false;
    }

    public advance() {
        this.curPos++;
    }
}

function parseFiles(filePath: string, codeWriter: CodeWriter) {

    let firstFileStats = fs.statSync(filePath);
    let filenames = new Array<string>();
    if (firstFileStats.isDirectory()) {
        try {
            filenames = fs.readdirSync(filePath);
        } catch (err) {
            console.log("The target file does not exist");
            throw new Error("The target file does not exist");
        }
    } else {
        filenames.push("");
    }


    let fileStats: fs.Stats;
    filenames.forEach((fname) => {
        const fullPath = path.join(filePath, fname);
        fileStats = fs.statSync(fullPath);
        if (fileStats.isDirectory()) {
            parseFiles(fullPath, codeWriter);
        } else if (path.parse(fullPath).ext === ".vm") {
            let script = fs.readFileSync(fullPath);
            let lines = script.toString().split('\r\n');
            let fileName = path.parse(fullPath).name;
            const parser = new Parser(lines);
            codeWriter.setFileName(fileName);
            while (1) {
                if (!parser.hasMoreCommands()) {
                    console.log("parse finished!");
                    break;
                }
                let command = parser.getCommand();
                let code = codeWriter.convertCommand(command);
                codeWriter.writeCode(code);
                parser.advance();
            }
        }

    })
}

// let filePath: string;
(async () => {
    const argv = await command.argv;
    let filePath = argv.f
    if (filePath.startsWith(" ")) {//なぜか冒頭にスペースが入る事があるので除去する
        filePath = filePath.replace(" ", "");
    }

    let fileStats: fs.Stats;
    try {
        fileStats = fs.statSync(filePath);
    } catch (err) {
        console.log("The target file does not exist");
        throw new Error("The target file does not exist");
    }

    let srcPathObject = path.parse(filePath);
    let destPathObject = { ...srcPathObject };
    destPathObject.base = "";// if "base" property exists, "ext" parameter will be ignored.
    destPathObject.ext = ".asm";
    let destFilePath = path.format(destPathObject)

    let codeWriter = new CodeWriter(destFilePath);

    parseFiles(filePath, codeWriter);

    codeWriter.writeWrapUp();
    console.log("added wrap-up code");
})();


