import fs from 'fs';
import { threadId } from 'worker_threads';
import { commandDir } from 'yargs';

import { ArithmeticVmCommand, CallVmCommand, FunctionVmCommand, GotoVmCommand, IfVmCommand, LabelVmCommand, PopVmCommand, PushVmCommand, ReturnVmCommand, VmCommand } from './parser';

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

const SP_START_COUNT = 256;
const INITIAL_METHOD = "Sys.init";

export class CodeWriter {
    private ws;
    private ripNum = 0;
    private fileName: string | undefined;
    private convertedCodeLines: string[];
    private currentFunctionName = "";

    constructor(deseFilePath: string) {
        this.ws = fs.createWriteStream(deseFilePath);
        this.convertedCodeLines = new Array();
    }

    public setFileName(fileName: string) {
        this.fileName = fileName;
    }

    //初期化コードを書き込む
    public writeInitialCode(): void {
        //SP=256
        this.convertedCodeLines.push("@" + SP_START_COUNT);
        this.convertedCodeLines.push("D=A");
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("M=D");

        //call Sys.init
        this.writeCallCode({ type: "CALL", arg1: INITIAL_METHOD, arg2: 0 });
    }

    //SPをデクリメントし，*(元SP-1)の値をDに代入する
    private writePopToD(): void {
        //SPのデクリメント
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("M=M-1");

        //DレジスタにPOP
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("D=M");
    }

    //SPをデクリメントし，*(元SP-2)に差分を代入する．Dにも差分が入る．
    private writeSubCode(): void {
        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
        this.writePopToD();

        //元SP-2の値とDの差を，元SP-2の位置に書き込む
        this.convertedCodeLines.push("A=A-1");
        this.convertedCodeLines.push("MD=M-D");
    }

    private writeAddCode(): void {
        //SPのデクリメント&元SP-1の値をDレジスタに書き出す
        this.writePopToD();

        //元SP-2の値とDの差を，元SP-2の位置に書き込む
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("A=M-1");
        this.convertedCodeLines.push("M=M+D");
    }


    //Dの値をSPの位置に書き込み，SPをインクリメント
    private writePushFromD(): void {
        //SPアドレス取得，書き込み
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("M=D");

        //SPのインクリメント
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("M=M+1");
    }

    //引数に渡されたアドレス/ラベルの値をstackにpushする
    private writePushFromAddress(address: string): void {
        this.convertedCodeLines.push("@" + address);
        this.convertedCodeLines.push("D=A");
        this.writePushFromD();
    }

    //引数に渡されたアドレス/ラベルが指す値をstackにpushする
    private writePushFromAddressPointing(address: string): void {
        this.convertedCodeLines.push("@" + address);
        this.convertedCodeLines.push("D=M");
        this.writePushFromD();
    }

    //引数に渡されたアドレス/ラベルの値をstackにpushする
    private writePushValue(value: number): void {
        this.convertedCodeLines.push("@" + value);
        this.convertedCodeLines.push("D=A");
        this.writePushFromD();
    }

    private generateReturnAddress(): string {
        return ("RIP$" + (this.ripNum++).toString());
    }

    private writePushCode(command: PushVmCommand): void {
        switch (command.arg1) {
            case SEGMENTS.CONSTANT:
                //定数読み込み
                this.convertedCodeLines.push("@" + command.arg2);
                this.convertedCodeLines.push("D=A");
                this.writePushFromD();
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

                this.writePushFromD()
                break;
        }

    }

    private writePopCode(command: PopVmCommand): void {
        switch (command.arg1) {
            case SEGMENTS.CONSTANT:
                this.writePushFromD();
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
                this.writePopToD();

                //R13の指すアドレスに値を格納
                this.convertedCodeLines.push("@R13");
                this.convertedCodeLines.push("A=M");
                this.convertedCodeLines.push("M=D");

                break;
        }
    }

    private writeArithmeticCode(command: ArithmeticVmCommand): void {
        switch (command.calc.calcType) {
            case 'ADD':
                //元SP-2の値とDの和を，元SP-2の位置に書き込む
                this.writeAddCode();
                break;
            case 'SUB':
                this.writeSubCode();
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
                const ripLabel = this.generateReturnAddress();
                this.convertedCodeLines.push("@" + ripLabel);
                this.convertedCodeLines.push("D=A");
                this.convertedCodeLines.push("@R13");
                this.convertedCodeLines.push("M=D");
                //差分が0かどうかで分岐
                this.writeSubCode();
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
                this.writePopToD();

                //元SP-2の値とDのandを，元SP-2の位置に書き込む
                this.convertedCodeLines.push("A=A-1");
                this.convertedCodeLines.push("M=M&D");
                break;
            case 'OR':
                //SPのデクリメント&元SP-1の値をDレジスタに書き出す
                this.writePopToD();

                //元SP-2の値とDのorを，元SP-2の位置に書き込む
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

    private convertLabelName(originalLabel: string): string {
        if (this.currentFunctionName == "") {
            return originalLabel;
        } else {
            return this.currentFunctionName + "$" + originalLabel;
        }
    }

    private writeLabelCode(command: LabelVmCommand): void {
        this.convertedCodeLines.push("(" + this.convertLabelName(command.arg1) + ")");
        return;
    }

    private writeGotoCode(command: GotoVmCommand): void {
        // this.writePopToD();
        this.convertedCodeLines.push("@" + this.convertLabelName(command.arg1));
        this.convertedCodeLines.push("0;JMP");
        return;
    }

    private writeIfCode(command: IfVmCommand): void {
        this.writePopToD();
        this.convertedCodeLines.push("@" + this.convertLabelName(command.arg1));
        this.convertedCodeLines.push("D;JNE");
        return;
    }

    private writeCallCode(command: CallVmCommand): void {
        const ripLabel = this.generateReturnAddress();
        this.writePushFromAddress(ripLabel);
        this.writePushFromAddressPointing("LCL");
        this.writePushFromAddressPointing("ARG");
        this.writePushFromAddressPointing("THIS");
        this.writePushFromAddressPointing("THAT");

        const argNum = 5;
        //set ARG to new point(SP-n-5)
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + argNum);
        this.convertedCodeLines.push("D=D-A");//SP-5
        this.convertedCodeLines.push("@" + command.arg2);
        this.convertedCodeLines.push("D=D-A");//SP-5-n
        this.convertedCodeLines.push("@ARG");
        this.convertedCodeLines.push("M=D");//ARG=SP-5-n

        //set LCL to new point(SP-n-5)
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@LCL");
        this.convertedCodeLines.push("M=D");//LCL=SP

        //goto function
        this.convertedCodeLines.push("@" + command.arg1);
        this.convertedCodeLines.push("0;JMP");

        //set return point
        this.convertedCodeLines.push("(" + ripLabel + ")");

        return;
    }

    private writeFunctionCode(command: FunctionVmCommand): void {
        this.convertedCodeLines.push("(" + command.arg1 + ")");
        for (let i = 0; i < command.arg2; i++) {
            this.writePushValue(0);
        }

        this.currentFunctionName = command.arg1;
        return;
    }

    private writeReturnCode(command: ReturnVmCommand): void {
        //LCLの値をR13に退避
        this.convertedCodeLines.push("@LCL");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("M=D");

        //returnアドレスを退避させておく(引数0,返り値有りの時，この位置に返り値が入るため，退避しないと後から参照できなくなる)
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + 5);
        this.convertedCodeLines.push("A=D-A");//A=FRAME-5
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@R14");
        this.convertedCodeLines.push("M=D");

        //ARG(のベースアドレス)にPOPした値を詰める
        this.writePopToD();//Dに値をPOPする
        this.convertedCodeLines.push("@ARG");
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("M=D");

        //SPの位置をARG+1に変更
        this.convertedCodeLines.push("@ARG");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@1");
        this.convertedCodeLines.push("D=D+A");//D=ARG+1
        this.convertedCodeLines.push("@SP");
        this.convertedCodeLines.push("M=D");

        //LCLを元に戻す．LCL=*(FRAME-4)
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + 4);
        this.convertedCodeLines.push("A=D-A");//FRAME-4
        this.convertedCodeLines.push("D=M");//D=*(FRAME-4)
        this.convertedCodeLines.push("@LCL");
        this.convertedCodeLines.push("M=D");//LCL=*(FRAME-4)

        //ARGを元に戻す．ARG=*(FRAME-3)
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + 3);
        this.convertedCodeLines.push("A=D-A");//FRAME-3
        this.convertedCodeLines.push("D=M");//D=*(FRAME-3)
        this.convertedCodeLines.push("@ARG");
        this.convertedCodeLines.push("M=D");//LCL=*(FRAME-3)

        //THISを元に戻す．THIS=*(FRAME-2)
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + 2);
        this.convertedCodeLines.push("A=D-A");//FRAME-2
        this.convertedCodeLines.push("D=M");//D=*(FRAME-2)
        this.convertedCodeLines.push("@THIS");
        this.convertedCodeLines.push("M=D");//LCL=*(FRAME-2)

        //THATを元に戻す．THAT=*(FRAME-1)
        this.convertedCodeLines.push("@R13");
        this.convertedCodeLines.push("D=M");
        this.convertedCodeLines.push("@" + 1);
        this.convertedCodeLines.push("A=D-A");//FRAME-1
        this.convertedCodeLines.push("D=M");//D=*(FRAME-1)
        this.convertedCodeLines.push("@THAT");
        this.convertedCodeLines.push("M=D");//LCL=*(FRAME-1)

        //returnアドレス(FRAME-5)に返る
        this.convertedCodeLines.push("@R14");
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("0;JMP");

        return;
    }

    public convertCommand(command: VmCommand) {
        if (this.fileName === undefined) {
            console.log("File name hasn't been passed");
            throw new Error("File name hasn't been passed");
        }
        switch (command.type) {
            case 'PUSH':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1 + " " + command.arg2);
                return this.writePushCode(command);
            case 'POP':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1 + " " + command.arg2);
                return this.writePopCode(command);
            case 'ARITHMETIC':
                this.convertedCodeLines.push("//" + command.calc.calcType);
                return this.writeArithmeticCode(command);
            case 'LABEL':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1);
                return this.writeLabelCode(command);
            case 'GOTO':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1);
                return this.writeGotoCode(command);
            case 'IF':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1);
                return this.writeIfCode(command);
            case 'CALL':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1 + " " + command.arg2);
                return this.writeCallCode(command);
            case 'RETURN':
                this.convertedCodeLines.push("//" + command.type);
                return this.writeReturnCode(command);
            case 'FUNCTION':
                this.convertedCodeLines.push("//" + command.type + " " + command.arg1 + " " + command.arg2);
                return this.writeFunctionCode(command);
            case 'NONE':
                return;
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
        this.convertedCodeLines.push("A=M-1");//元のSP-2
        this.convertedCodeLines.push("M=-1");//trueを代入
        this.convertedCodeLines.push("@R13");//以下，帰還
        this.convertedCodeLines.push("A=M");
        this.convertedCodeLines.push("0;JMP");
    }

    public writeCode() {
        this.ws.write(this.convertedCodeLines.join("\r\n"));
    }
}