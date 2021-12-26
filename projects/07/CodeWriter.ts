import fs from 'fs';
import path from "path";
import { VmCommand } from "./parser"

const SEGMENTS = {
    LOCAL: "local",
    ARGUMENT: "argument",
    THIS: "this",
    THAT: "that",
    POINTER: "pointer",
    TEMP: "temp",
    CONSTANT: "constant",
    STATIC: "static"
} as const;

export class CodeWriter {
    private ws;
    private ripNum = 0;
    private fileName: string | undefined;

    constructor(deseFilePath: string) {
        this.ws = fs.createWriteStream(deseFilePath);
    }

    public setFileName(fileName: string) {
        this.fileName = fileName;
    }

    //SPをデクリメントし，*(元SP-1)の値をDに代入する
    private generatePop(): string {
        let code = "";
        //SPのデクリメント
        code += "@SP\r\n";
        code += "M=M-1\r\n";

        //DレジスタにPOP
        code += "A=M\r\n";
        code += "D=M\r\n";
        return code;
    }

    //SPをデクリメントし，*(元SP-2)に差分を代入する．Dにも差分が入る．
    private generateSub(): string {
        let code = "";
        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
        code += this.generatePop();

        //元SP-2の値とDの差を，元SP-2の位置に書き込む
        code += "A=A-1\r\n"
        code += "MD=M-D\r\n";
        return code;
    }


    //Dの値をSPの位置に書き込み，SPをインクリメント
    private gereratePushD(): string {
        let code = "";
        //SPアドレス取得，書き込み
        code += "@SP\r\n"
        code += "A=M\r\n"
        code += "M=D\r\n";

        //SPのインクリメント
        code += "@SP\r\n"
        code += "M=M+1\r\n";
        return code;
    }

    public convertCommand(command: VmCommand): string {
        if (this.fileName === undefined) {
            console.log("File name hasn't been passed");
            throw new Error("File name hasn't been passed");
        }
        let code = "";
        switch (command.type) {
            case 'PUSH':
                switch (command.arg1) {
                    case SEGMENTS.CONSTANT:
                        //定数読み込み
                        code += "@" + command.arg2 + "\r\n";
                        code += "D=A\r\n";

                        code += this.gereratePushD();
                        break;
                    case SEGMENTS.LOCAL:
                    case SEGMENTS.ARGUMENT:
                    case SEGMENTS.THIS:
                    case SEGMENTS.THAT:
                    case SEGMENTS.TEMP:
                    case SEGMENTS.POINTER:
                    case SEGMENTS.STATIC:
                        //定数読み込み.STATICの場合ここは不要だが，まぁ副作用は無いので．．．
                        code += "@" + command.arg2 + "\r\n";
                        code += "D=A\r\n";

                        //対象ベースアドレスの和をAアドレスにセットし，その値をDに格納
                        switch (command.arg1) {
                            case SEGMENTS.LOCAL:
                                code += "@LCL\r\n"
                                code += "A=M+D\r\n";
                                break;
                            case SEGMENTS.ARGUMENT:
                                code += "@ARG\r\n"
                                code += "A=M+D\r\n";
                                break;
                            case SEGMENTS.THIS:
                                code += "@THIS\r\n"
                                code += "A=M+D\r\n";
                                break;
                            case SEGMENTS.THAT:
                                code += "@THAT\r\n"
                                code += "A=M+D\r\n";
                                break;
                            case SEGMENTS.TEMP:
                                code += "@R5\r\n"
                                code += "A=A+D\r\n";
                                break;
                            case SEGMENTS.POINTER:
                                code += "@R3\r\n"
                                code += "A=A+D\r\n";
                                break;
                            case SEGMENTS.STATIC:
                                code += "@" + this.fileName + "." + command.arg2.toString() + "\r\n";
                                break;
                        }
                        code += "D=M\r\n";

                        //Dをstackにpush
                        code += this.gereratePushD();
                        break;
                }
                break;
            case 'POP':
                switch (command.arg1) {
                    case SEGMENTS.CONSTANT:
                        code += this.generatePop();
                        break;
                    case SEGMENTS.LOCAL:
                    case SEGMENTS.ARGUMENT:
                    case SEGMENTS.THIS:
                    case SEGMENTS.THAT:
                    case SEGMENTS.TEMP:
                    case SEGMENTS.POINTER:
                    case SEGMENTS.STATIC:
                        //定数読み込み.STATICの場合ここは不要だが，まぁ副作用は無いので．．．
                        code += "@" + command.arg2 + "\r\n";
                        code += "D=A\r\n";

                        //対象ベースアドレスとの和を計算
                        switch (command.arg1) {
                            case SEGMENTS.LOCAL:
                                code += "@LCL\r\n"
                                code += "D=M+D\r\n"
                                break;
                            case SEGMENTS.ARGUMENT:
                                code += "@ARG\r\n"
                                code += "D=M+D\r\n"
                                break;
                            case SEGMENTS.THIS:
                                code += "@THIS\r\n"
                                code += "D=M+D\r\n"
                                break;
                            case SEGMENTS.THAT:
                                code += "@THAT\r\n"
                                code += "D=M+D\r\n"
                                break;
                            case SEGMENTS.TEMP:
                                code += "@R5\r\n"
                                code += "D=A+D\r\n"
                                break;
                            case SEGMENTS.POINTER:
                                code += "@R3\r\n"
                                code += "D=A+D\r\n"
                                break;
                            case SEGMENTS.STATIC:
                                code += "@" + this.fileName + "." + command.arg2.toString() + "\r\n";
                                code += "D=A\r\n";
                                break;
                        }

                        //その位置のアドレス値をR13に格納
                        code += "@R13\r\n";
                        code += "M=D\r\n"

                        //スタックからDにポップ
                        code += this.generatePop();

                        //R13の指すアドレスに値を格納
                        code += "@R13\r\n";
                        code += "A=M\r\n";
                        code += "M=D\r\n";

                        break;
                }
                break;
            case 'ARITHMETIC':
                let ripLabel = "";
                switch (command.calc.calcType) {
                    case 'ADD':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        code += this.generatePop();

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        code += "@SP\r\n"
                        code += "A=M-1\r\n"
                        code += "M=M+D\r\n";
                        break;
                    case 'SUB':
                        code += this.generateSub();
                        break;
                    case 'NEG':
                        //SP-1の値を反転
                        code += "@SP\r\n"
                        code += "A=M-1\r\n"
                        code += "M=-M\r\n";
                        break;
                    case 'EQ':
                    case 'GT':
                    case 'LT':
                        //R13に返却ポイントを格納
                        ripLabel = "RIP$" + (this.ripNum++).toString();
                        code += "@" + ripLabel + "\r\n";
                        code += "D=A\r\n";
                        code += "@" + "R13\r\n";
                        code += "M=D\r\n";
                        //差分が0かどうかで分岐
                        code += this.generateSub();
                        code += "@" + "IF_TRUE\r\n";
                        switch (command.calc.calcType) {
                            case 'EQ':
                                code += "D;JEQ\r\n";
                                break;
                            case 'GT':
                                code += "D;JGT\r\n";
                                break;
                            case 'LT':
                                code += "D;JLT\r\n";
                                break;
                        }
                        //falseのとき
                        code += "@SP\r\n";
                        code += "A=M-1\r\n";//元のSP-2
                        code += "M=0\r\n";//falseを代入
                        //返却ポイント
                        code += "(" + ripLabel + ")\r\n";
                        break;
                    case 'AND':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        code += this.generatePop();

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        code += "A=A-1\r\n"
                        code += "M=M&D\r\n";
                        break;
                    case 'OR':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        code += this.generatePop();

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        code += "@SP\r\n"
                        code += "A=M-1\r\n"
                        code += "M=M|D\r\n";
                        break;
                    case 'NOT':
                        //SP-1の値を反転
                        code += "@SP\r\n"
                        code += "A=M-1\r\n"
                        code += "M=!M\r\n";
                        break;
                }
        }
        return code;
    }

    //末尾に関数群および，endラベルを追加する．
    public writeWrapUp() {
        let code = "";
        //ENDラベル記載
        code += "(END)\r\n";
        code += "@END\r\n";
        code += "0;JMP\r\n";

        //EQ関数/GT関数/LT関数．全て同一で，*(SP-1)をtrueにして返す．
        code += "(IF_TRUE)\r\n";
        code += "@SP\r\n";//デクリメント済なので，元のSP-1
        code += "A=M-1\r\n"//元のSP-2
        code += "M=-1\r\n"//trueを代入
        code += "@R13\r\n";//以下，帰還
        code += "A=M\r\n";
        code += "0;JMP\r\n";

        this.writeCode(code);
    }

    public writeCode(code: string) {
        this.ws.write(code);
    }
}