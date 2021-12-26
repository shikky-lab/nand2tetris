import fs from 'fs';

import { VmCommand } from './parser';

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
    private convertedCodeLines: string[];

    constructor(deseFilePath: string) {
        this.ws = fs.createWriteStream(deseFilePath);
        this.convertedCodeLines = new Array();
    }

    public setFileName(fileName: string) {
        this.fileName = fileName;
    }

    //SPをデクリメントし，*(元SP-1)の値をDに代入する
    private generatePop(): string[] {
        let convertedCodes: string[] = new Array();
        //SPのデクリメント
        convertedCodes.push("@SP");
        convertedCodes.push("M=M-1");

        //DレジスタにPOP
        convertedCodes.push("A=M");
        convertedCodes.push("D=M");
        return convertedCodes;
    }

    //SPをデクリメントし，*(元SP-2)に差分を代入する．Dにも差分が入る．
    private generateSub(): string[] {
        let convertedCodes: string[] = new Array();
        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
        convertedCodes.push(...this.generatePop());

        //元SP-2の値とDの差を，元SP-2の位置に書き込む
        convertedCodes.push("A=A-1");
        convertedCodes.push("MD=M-D");
        return convertedCodes;
    }


    //Dの値をSPの位置に書き込み，SPをインクリメント
    private gereratePushD(): string[] {
        let convertedCodes: string[] = new Array();
        //SPアドレス取得，書き込み
        convertedCodes.push("@SP");
        convertedCodes.push("A=M");
        convertedCodes.push("M=D");

        //SPのインクリメント
        convertedCodes.push("@SP");
        convertedCodes.push("M=M+1");
        return convertedCodes;
    }

    public convertCommand(command: VmCommand) {
        if (this.fileName === undefined) {
            console.log("File name hasn't been passed");
            throw new Error("File name hasn't been passed");
        }
        switch (command.type) {
            case 'PUSH':
                switch (command.arg1) {
                    case SEGMENTS.CONSTANT:
                        //定数読み込み
                        this.convertedCodeLines.push("@" + command.arg2);
                        this.convertedCodeLines.push("D=A");

                        this.convertedCodeLines.push(...this.gereratePushD());
                        break;
                    case SEGMENTS.LOCAL:
                    case SEGMENTS.ARGUMENT:
                    case SEGMENTS.THIS:
                    case SEGMENTS.THAT:
                    case SEGMENTS.TEMP:
                    case SEGMENTS.POINTER:
                    case SEGMENTS.STATIC:
                        //定数読み込み.STATICの場合ここは不要だが，まぁ副作用は無いので．．．
                        this.convertedCodeLines.push("@" + command.arg2);
                        this.convertedCodeLines.push("D=A");

                        //対象ベースアドレスの和をAアドレスにセットし，その値をDに格納
                        switch (command.arg1) {
                            case SEGMENTS.LOCAL:
                                this.convertedCodeLines.push("@LCL");
                                this.convertedCodeLines.push("A=M+D");
                                break;
                            case SEGMENTS.ARGUMENT:
                                this.convertedCodeLines.push("@ARG");
                                this.convertedCodeLines.push("A=M+D");
                                break;
                            case SEGMENTS.THIS:
                                this.convertedCodeLines.push("@THIS");
                                this.convertedCodeLines.push("A=M+D");
                                break;
                            case SEGMENTS.THAT:
                                this.convertedCodeLines.push("@THAT");
                                this.convertedCodeLines.push("A=M+D");
                                break;
                            case SEGMENTS.TEMP:
                                this.convertedCodeLines.push("@R5");
                                this.convertedCodeLines.push("A=A+D");
                                break;
                            case SEGMENTS.POINTER:
                                this.convertedCodeLines.push("@R3");
                                this.convertedCodeLines.push("A=A+D");
                                break;
                            case SEGMENTS.STATIC:
                                this.convertedCodeLines.push("@" + this.fileName + "." + command.arg2.toString());
                                break;
                        }
                        this.convertedCodeLines.push("D=M");

                        //Dをstackにpush
                        this.convertedCodeLines.push(...this.gereratePushD());
                        break;
                }
                break;
            case 'POP':
                switch (command.arg1) {
                    case SEGMENTS.CONSTANT:
                        this.convertedCodeLines.push(...this.gereratePushD());
                        break;
                    case SEGMENTS.LOCAL:
                    case SEGMENTS.ARGUMENT:
                    case SEGMENTS.THIS:
                    case SEGMENTS.THAT:
                    case SEGMENTS.TEMP:
                    case SEGMENTS.POINTER:
                    case SEGMENTS.STATIC:
                        //定数読み込み.STATICの場合ここは不要だが，まぁ副作用は無いので．．．
                        this.convertedCodeLines.push("@" + command.arg2);
                        this.convertedCodeLines.push("D=A");

                        //対象ベースアドレスとの和を計算
                        switch (command.arg1) {
                            case SEGMENTS.LOCAL:
                                this.convertedCodeLines.push("@LCL");
                                this.convertedCodeLines.push("D=M+D");
                                break;
                            case SEGMENTS.ARGUMENT:
                                this.convertedCodeLines.push("@ARG");
                                this.convertedCodeLines.push("D=M+D");
                                break;
                            case SEGMENTS.THIS:
                                this.convertedCodeLines.push("@THIS");
                                this.convertedCodeLines.push("D=M+D");
                                break;
                            case SEGMENTS.THAT:
                                this.convertedCodeLines.push("@THAT");
                                this.convertedCodeLines.push("D=M+D");
                                break;
                            case SEGMENTS.TEMP:
                                this.convertedCodeLines.push("@R5");
                                this.convertedCodeLines.push("D=A+D");
                                break;
                            case SEGMENTS.POINTER:
                                this.convertedCodeLines.push("@R3");
                                this.convertedCodeLines.push("D=A+D");
                                break;
                            case SEGMENTS.STATIC:
                                this.convertedCodeLines.push("@" + this.fileName + "." + command.arg2.toString());
                                this.convertedCodeLines.push("D=A");
                                break;
                        }

                        //その位置のアドレス値をR13に格納
                        this.convertedCodeLines.push("@R13");
                        this.convertedCodeLines.push("M=D");

                        //スタックからDにポップ
                        this.convertedCodeLines.push(...this.generatePop());

                        //R13の指すアドレスに値を格納
                        this.convertedCodeLines.push("@R13");
                        this.convertedCodeLines.push("A=M");
                        this.convertedCodeLines.push("M=D");

                        break;
                }
                break;
            case 'ARITHMETIC':
                let ripLabel = "";
                switch (command.calc.calcType) {
                    case 'ADD':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        this.convertedCodeLines.push(...this.generatePop());

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        this.convertedCodeLines.push("@SP");
                        this.convertedCodeLines.push("A=M-1");
                        this.convertedCodeLines.push("M=M+D");
                        break;
                    case 'SUB':
                        this.convertedCodeLines.push(...this.generateSub());
                        break;
                    case 'NEG':
                        //SP-1の値を反転
                        this.convertedCodeLines.push("@SP");
                        this.convertedCodeLines.push("A=M-1");
                        this.convertedCodeLines.push("M=-M");
                        break;
                    case 'EQ':
                    case 'GT':
                    case 'LT':
                        //R13に返却ポイントを格納
                        ripLabel = "RIP$" + (this.ripNum++).toString();
                        this.convertedCodeLines.push("@" + ripLabel);
                        this.convertedCodeLines.push("D=A");
                        this.convertedCodeLines.push("@R13");
                        this.convertedCodeLines.push("M=D");
                        //差分が0かどうかで分岐
                        this.convertedCodeLines.push(...this.generateSub());
                        this.convertedCodeLines.push("@IF_TRUE");
                        switch (command.calc.calcType) {
                            case 'EQ':
                                this.convertedCodeLines.push("D;JEQ");
                                break;
                            case 'GT':
                                this.convertedCodeLines.push("D;JGT");
                                break;
                            case 'LT':
                                this.convertedCodeLines.push("D;JLT");
                                break;
                        }
                        //falseのとき
                        this.convertedCodeLines.push("@SP");
                        this.convertedCodeLines.push("A=M-1");//元のSP-2
                        this.convertedCodeLines.push("M=0");//falseを代入
                        //返却ポイント
                        this.convertedCodeLines.push("(" + ripLabel + ")");
                        break;
                    case 'AND':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        this.convertedCodeLines.push(...this.generatePop());

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        this.convertedCodeLines.push("A=A-1");
                        this.convertedCodeLines.push("M=M&D");
                        break;
                    case 'OR':
                        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                        this.convertedCodeLines.push(...this.generatePop());

                        //元SP-2の値とDの和を，元SP-2の位置に書き込む
                        this.convertedCodeLines.push("@SP");
                        this.convertedCodeLines.push("A=M-1");
                        this.convertedCodeLines.push("M=M|D");
                        break;
                    case 'NOT':
                        //SP-1の値を反転
                        this.convertedCodeLines.push("@SP");
                        this.convertedCodeLines.push("A=M-1");
                        this.convertedCodeLines.push("M=!M");
                        break;
                }
        }
    }

    //末尾に関数群および，endラベルを追加する．
    public writeWrapUp() {
        //ENDラベル記載
        this.convertedCodeLines.push("(END)");
        this.convertedCodeLines.push("@END");
        this.convertedCodeLines.push("0;JMP");

        //EQ関数/GT関数/LT関数．全て同一で，*(SP-1)をtrueにして返す．
        this.convertedCodeLines.push("(IF_TRUE)");
        this.convertedCodeLines.push("@SP");//デクリメント済なので，元のSP-1
        this.convertedCodeLines.push("(A=M-1)");//元のSP-2
        this.convertedCodeLines.push("M=-1");//trueを代入
        this.convertedCodeLines.push("@R13");//以下，帰還
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("0;JMP");
    }

    public writeCode() {
        this.ws.write(this.convertedCodeLines.join("\r\n"));
    }
}