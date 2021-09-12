
import yargs from 'yargs/yargs';
import fs from 'fs';
import path from "path";
import { SymbolTable } from './symboleTable';

const command = yargs(process.argv.slice(2)).options({
    f: { type: 'string', demandOption: true }
});

//Constアサーション．TypeScriptではenumよりこっちを推奨
//https://zenn.dev/asano/articles/ff66859ab5af18
const COMMANDS = {
    A_COMMAND: "A_COMMAND",
    C_COMMAND: "C_COMMAND",
    L_COMMAND: "L_COMMAND",
    NONE: "NONE"
} as const;
// as constで再代入を塞げる=constアサーション
//https://qiita.com/daishi/items/a413f8e2141cb7c7eec5

class Parser {
    private curPos = 0;
    private lines: string[] = [];
    private ws;
    private symbolTable = new SymbolTable();

    constructor(srcFilePath: string) {
        if (srcFilePath.startsWith(" ")) {//なぜか冒頭にスペースが入る事があるので除去する
            srcFilePath = srcFilePath.replace(" ", "");
        }
        try {
            fs.statSync(srcFilePath);
        } catch (err) {
            console.log("The target file does not exist");
            throw new Error("The target file does not exist");
        }

        let script = fs.readFileSync(srcFilePath);
        let originalLines = script.toString().split('\r\n');
        let extractCommandExp = /[\(\)\!\-\+\$\.\&\|=;@\w]+/; //extract commands. Removes "//.*","\t"," ",etc
        let extractBrackettedValueExp = /\(([^)]+)\)/; //extract string between "(" and ")"
        for (let line of originalLines) {
            console.log(line);

            let commandMmatches = extractCommandExp.exec(line);
            if (commandMmatches == null) {
                continue;
            }
            if (commandMmatches.length != 1) {
                throw Error("Illegal command format");
            }
            let command = commandMmatches[0];

            let commandType = this.getCommandType(command);
            switch (commandType) {
                case COMMANDS.A_COMMAND://@Xxx
                case COMMANDS.C_COMMAND://dest=comp;jump
                    this.lines.push(command);
                    break;
                case COMMANDS.L_COMMAND:
                    let matches = extractBrackettedValueExp.exec(command);
                    if (matches != null && matches.length == 2) {
                        let label = matches[1];
                        let isNumber = /^\d*$/;
                        if (!isNumber.test(label)) {
                            this.symbolTable.addEntry(label, this.lines.length);
                        }
                    } else {
                        throw Error("Illegal label format")
                    }
                default:
                    break;
            }
        }

        let srcPathObject = path.parse(srcFilePath);
        let destPathObject = { ...srcPathObject };
        destPathObject.base = "";// if "base" property exists, "ext" parameter will be ignored.
        destPathObject.ext = ".hack";

        let destFilePath = path.format(destPathObject)
        this.ws = fs.createWriteStream(destFilePath);
    }

    private hasMoreCommands(): boolean {
        if (this.curPos >= this.lines.length) {
            return false;
        }
        let line = this.lines[this.curPos];
        line = line.replace(" ", "");

        if (line == "" || line.startsWith("//")) {
            this.advance();
            return this.hasMoreCommands();
        }

        return true;
    }

    private advance() {
        this.curPos++;
    }

    private getCommandType(line: string) {
        if (line.startsWith("@")) {
            return COMMANDS.A_COMMAND;
        }

        if (line.startsWith("(")) {
            return COMMANDS.L_COMMAND;
        }

        if (line.includes("=") || line.includes(";")) {
            return COMMANDS.C_COMMAND;
        }
        return COMMANDS.NONE;
    }

    private getSymbol(line: string) {
        let label = line.substring(1);//remove @ character
        let isNumber = /^\d*$/;
        if (isNumber.test(label)) {
            return Number(label);
        } else {
            return this.symbolTable.getAddress(label);
        }
    }

    //extract dest from input string and return binary converted value
    private getDest(line: string) {
        let index = line.indexOf("=");
        if (index == -1) {
            return 0b000;
        }
        if (index == 0) {
            throw new Error("Failed to read dest. Theare are no dest though \"=\" exists.");
        }

        let dest = line.substring(0, index);
        switch (dest) {
            case "M": return 0b001;
            case "D": return 0b010;
            case "MD": return 0b011;
            case "A": return 0b100;
            case "AM": return 0b101;
            case "AD": return 0b110;
            case "AMD": return 0b111;
            default:
                throw new Error("Failed to convert dest. Invalid input.");
        }
    }

    private getComp(line: string) {
        let eqIndex = line.indexOf("=");
        let smcIndex = line.indexOf(";");
        let compBeginIndex = eqIndex == -1 ? 0 : eqIndex + 1;
        let compEndIndex = smcIndex == -1 ? line.length : smcIndex;

        let comp = line.substring(compBeginIndex, compEndIndex);
        switch (comp) {
            case "0": return 0b0101010;
            case "1": return 0b0111111;
            case "-1": return 0b0111010;
            case "D": return 0b0001100;
            case "A": return 0b0110000;
            case "!D": return 0b0001101;
            case "!A": return 0b0110001;
            case "-D": return 0b0001111;
            case "-A": return 0b0110011;
            case "D+1": return 0b0011111;
            case "A+1": return 0b0110111;
            case "D-1": return 0b0001110;
            case "A-1": return 0b0110010;
            case "D+A": return 0b0000010;
            case "D-A": return 0b0010011;
            case "A-D": return 0b0000111;
            case "D&A": return 0b0000000;
            case "D|A": return 0b0010101;
            case "M": return 0b1110000;
            case "!M": return 0b1110001;
            case "-M": return 0b1110011;
            case "M+1": return 0b1110111;
            case "M-1": return 0b1110010;
            case "D+M": return 0b1000010;
            case "D-M": return 0b1010011;
            case "M-D": return 0b1000111;
            case "D&M": return 0b1000000;
            case "D|M": return 0b1010101;
            default:
                throw new Error("Failed to convert comp. Invalid input.");
        }
    }

    private getJump(line: string) {
        let smcIndex = line.indexOf(";");
        if (smcIndex == -1) {
            return 0b000;
        }
        let jump = line.substring(smcIndex + 1);
        switch (jump) {
            case "JGT": return 0b001;
            case "JEQ": return 0b010;
            case "JGE": return 0b011;
            case "JLT": return 0b100;
            case "JNE": return 0b101;
            case "JLE": return 0b110;
            case "JMP": return 0b111;
            default:
                throw new Error("Failed to convert jump. Invalid input.");
        }
    }

    private parseOneLine(line: string) {
        let commandType = this.getCommandType(line);
        switch (commandType) {
            case COMMANDS.A_COMMAND://@Xxx
                let address = this.getSymbol(line);
                this.ws?.write(address.toString(2).padStart(16, "0"));
                this.ws?.write("\r\n");
                break;
            case COMMANDS.C_COMMAND://dest=comp;jump
                //P70より抜粋．    
                //destもしくはjumpのどちらかは空であるかもしれない．
                //もしdestが空であれば，「=」は省略される
                //もしjumpが空であれば，「:」は省略される
                let dest = this.getDest(line);
                let comp = this.getComp(line);
                let jump = this.getJump(line);

                let command = (0b111 << 13) | (comp << 6) | (dest << 3) | jump;
                this.ws?.write(command.toString(2));
                this.ws?.write("\r\n");
                break;
            case COMMANDS.L_COMMAND:
                break;
        }

    }

    public parse() {
        while (1) {
            if (!this.hasMoreCommands()) {
                console.log("parse finished!");
                return;
            }
            this.parseOneLine(this.lines[this.curPos]);
            this.advance();
        }
    }
}

// let filePath: string;
(async () => {
    const argv = await command.argv;
    let filePath = argv.f
    const parser = new Parser(filePath);
    parser.parse();
})();


