
const isNumber = /^\d*$/;

export type ArithmeticCommand = { calcType: "ADD" } | { calcType: "SUB" } | { calcType: "ADD" } | { calcType: "NEG" } | { calcType: "EQ" } | { calcType: "GT" } | { calcType: "LT" } | { calcType: "AND" } | { calcType: "OR" } | { calcType: "NOT" }
export type VmCommand = { type: "ARITHMETIC", calc: ArithmeticCommand } | { type: "PUSH", arg1: string, arg2: number } | { type: "POP", arg1: string, arg2: number } | { type: "LABEL", arg1: string } | { type: "GOTO", arg1: string } | { type: "IF", arg1: string } | { type: "FUNCTION", arg1: string, arg2: number } | { type: "RETURN" } | { type: "CALL", arg1: string, arg2: number } | { type: "NONE" };

export class Parser {
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
            line = line.substring(0, commentPos);
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
                if (commandWords.length != 2) {
                    throw Error("Irregal format of pop. line:" + this.curPos);
                }
                return { type: "LABEL", arg1: commandWords[1] };
            case "goto":
                if (commandWords.length != 2) {
                    throw Error("Irregal format of pop. line:" + this.curPos);
                }
                return { type: "GOTO", arg1: commandWords[1] };
            case "if-goto":
                if (commandWords.length != 2) {
                    throw Error("Irregal format of pop. line:" + this.curPos);
                }
                return { type: "IF", arg1: commandWords[1] };
            case "function":
                return { type: "FUNCTION", arg1: commandWords[1], arg2: Number(commandWords[2]) };
            case "return":
                return { type: "RETURN" };
            case "call":
                return { type: "CALL", arg1: commandWords[1], arg2: Number(commandWords[2]) };
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