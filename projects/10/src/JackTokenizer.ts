import fs from 'fs'

// const keywordTokenList = ["class", "method", "function", "constructor", "int", "boolean", "char", "void", "var", "static", "field", "let", "do", "if", "else", "while", "return", "true", "false", "null", "this"] as const;
type ClassToken = { type: "KEYWORD", tokenType: "class", position: ScriptPos, rawValue: String };
type MethodToken = { type: "KEYWORD", tokenType: "method", position: ScriptPos, rawValue: String };
type FunctionToken = { type: "KEYWORD", tokenType: "function", position: ScriptPos, rawValue: String };
type ConstructorToken = { type: "KEYWORD", tokenType: "constructor", position: ScriptPos, rawValue: String };
type IntKeywordToken = { type: "KEYWORD", tokenType: "int", position: ScriptPos, rawValue: String };
type BooleanToken = { type: "KEYWORD", tokenType: "boolean", position: ScriptPos, rawValue: String };
type CharToken = { type: "KEYWORD", tokenType: "char", position: ScriptPos, rawValue: String };
type VoidToken = { type: "KEYWORD", tokenType: "void", position: ScriptPos, rawValue: String };
type VarToken = { type: "KEYWORD", tokenType: "var", position: ScriptPos, rawValue: String };
type StaticToken = { type: "KEYWORD", tokenType: "static", position: ScriptPos, rawValue: String };
type FieldToken = { type: "KEYWORD", tokenType: "field", position: ScriptPos, rawValue: String };
type LetToken = { type: "KEYWORD", tokenType: "let", position: ScriptPos, rawValue: String };
type DoToken = { type: "KEYWORD", tokenType: "do", position: ScriptPos, rawValue: String };
type IfToken = { type: "KEYWORD", tokenType: "if", position: ScriptPos, rawValue: String };
type ElseToken = { type: "KEYWORD", tokenType: "else", position: ScriptPos, rawValue: String };
type WhileToken = { type: "KEYWORD", tokenType: "while", position: ScriptPos, rawValue: String };
type ReturnToken = { type: "KEYWORD", tokenType: "return", position: ScriptPos, rawValue: String };
type TrueToken = { type: "KEYWORD", tokenType: "true", position: ScriptPos, rawValue: String };
type FalseToken = { type: "KEYWORD", tokenType: "false", position: ScriptPos, rawValue: String };
type NullToken = { type: "KEYWORD", tokenType: "null", position: ScriptPos, rawValue: String };
type ThisToken = { type: "KEYWORD", tokenType: "this", position: ScriptPos, rawValue: String };
export type KeywordToken = ClassToken | MethodToken | FunctionToken | ConstructorToken | IntKeywordToken | BooleanToken | CharToken | VoidToken | VarToken | StaticToken | FieldToken | LetToken | DoToken | IfToken | ElseToken | WhileToken | ReturnToken | TrueToken | FalseToken | NullToken | ThisToken;

// const symbolTokenList = ["{", "}", "(", ")", "[", "]", ".", ",", ";", "+", "-", "*", "/", "&", "|", "<", ">", "=", "~"] as const;
type LeftCurlyBracketToken = { type: "SYMBOL", tokenType: "{", position: ScriptPos, rawValue: String };
type RightCurlyBracketToken = { type: "SYMBOL", tokenType: "}", position: ScriptPos, rawValue: String };
type LeftParenthesesToken = { type: "SYMBOL", tokenType: "(", position: ScriptPos, rawValue: String };
type RightParenthesesToken = { type: "SYMBOL", tokenType: ")", position: ScriptPos, rawValue: String };
type LeftSquareBracketToken = { type: "SYMBOL", tokenType: "[", position: ScriptPos, rawValue: String };
type RightSquareBracketToken = { type: "SYMBOL", tokenType: "]", position: ScriptPos, rawValue: String };
type DotToken = { type: "SYMBOL", tokenType: ".", position: ScriptPos, rawValue: String };
type CommaToken = { type: "SYMBOL", tokenType: ",", position: ScriptPos, rawValue: String };
type SemicolonToken = { type: "SYMBOL", tokenType: ";", position: ScriptPos, rawValue: String };
type PlusToken = { type: "SYMBOL", tokenType: "+", position: ScriptPos, rawValue: String };
type MinusToken = { type: "SYMBOL", tokenType: "-", position: ScriptPos, rawValue: String };
type AsterToken = { type: "SYMBOL", tokenType: "*", position: ScriptPos, rawValue: String };
type SlashToken = { type: "SYMBOL", tokenType: "/", position: ScriptPos, rawValue: String };
type AndToken = { type: "SYMBOL", tokenType: "&", position: ScriptPos, rawValue: String };
type OrToken = { type: "SYMBOL", tokenType: "|", position: ScriptPos, rawValue: String };
type GTToken = { type: "SYMBOL", tokenType: "<", position: ScriptPos, rawValue: String };
type LTToken = { type: "SYMBOL", tokenType: ">", position: ScriptPos, rawValue: String };
type EqualToken = { type: "SYMBOL", tokenType: "=", position: ScriptPos, rawValue: String };
type TildeToken = { type: "SYMBOL", tokenType: "~", position: ScriptPos, rawValue: String };
export type SymbolToken = LeftCurlyBracketToken | RightCurlyBracketToken | LeftParenthesesToken | RightParenthesesToken | LeftSquareBracketToken | RightSquareBracketToken | DotToken | CommaToken | SemicolonToken | PlusToken | MinusToken | AsterToken | SlashToken | AndToken | OrToken | GTToken | LTToken | EqualToken | TildeToken;

export type ScriptPos = { line: number, tokenCount: number };// indicate where is the token exists for debug.Line number and token count from left of the line.
export type IdentiferToken = { type: "IDENTIFIER", value: string, position: ScriptPos, rawValue: String };
export type IntToken = { type: "INT_CONST", value: number, position: ScriptPos, rawValue: String };
export type StringToken = { type: "STRING_CONST", value: string, position: ScriptPos, rawValue: String };

export type Token = KeywordToken | StringToken | IntToken | SymbolToken | IdentiferToken;

// →文字列リテラルのリストに特定の文字列が含まれているかの判断は不可能？
// function isKeywordToken(word: string): word is KeywordTokenType {
//     return keywordTokenList.includes(word);
// }

/**
 * convert passed word to keyword token if it exists in keywords.
 * return null if it isn't keyword token.
 * 
 * @param word : to be converted
 * @returns keywordToken if it is keyword, otherwise null. 
 */
function convertToKeywordToken(word: string, tokenPosition: ScriptPos): KeywordToken | null {

    //if the words includes following list, retruns keywordtoken, otherwise returns null.
    //"class", "method", "function", "constructor", "int", "boolean", "char", "void", "var", "static", "field", "let", "do", "if", "else", "while", "return", "true", "false", "null", "this"
    switch (word) {
        case "class":
            return { type: "KEYWORD", tokenType: "class", position: tokenPosition, rawValue: word };
        case "method":
            return { type: "KEYWORD", tokenType: "method", position: tokenPosition, rawValue: word };
        case "function":
            return { type: "KEYWORD", tokenType: "function", position: tokenPosition, rawValue: word };
        case "constructor":
            return { type: "KEYWORD", tokenType: "constructor", position: tokenPosition, rawValue: word };
        case "int":
            return { type: "KEYWORD", tokenType: "int", position: tokenPosition, rawValue: word };
        case "boolean":
            return { type: "KEYWORD", tokenType: "boolean", position: tokenPosition, rawValue: word };
        case "char":
            return { type: "KEYWORD", tokenType: "char", position: tokenPosition, rawValue: word };
        case "void":
            return { type: "KEYWORD", tokenType: "void", position: tokenPosition, rawValue: word };
        case "var":
            return { type: "KEYWORD", tokenType: "var", position: tokenPosition, rawValue: word };
        case "static":
            return { type: "KEYWORD", tokenType: "static", position: tokenPosition, rawValue: word };
        case "field":
            return { type: "KEYWORD", tokenType: "field", position: tokenPosition, rawValue: word };
        case "let":
            return { type: "KEYWORD", tokenType: "let", position: tokenPosition, rawValue: word };
        case "do":
            return { type: "KEYWORD", tokenType: "do", position: tokenPosition, rawValue: word };
        case "if":
            return { type: "KEYWORD", tokenType: "if", position: tokenPosition, rawValue: word };
        case "else":
            return { type: "KEYWORD", tokenType: "else", position: tokenPosition, rawValue: word };
        case "while":
            return { type: "KEYWORD", tokenType: "while", position: tokenPosition, rawValue: word };
        case "return":
            return { type: "KEYWORD", tokenType: "return", position: tokenPosition, rawValue: word };
        case "true":
            return { type: "KEYWORD", tokenType: "true", position: tokenPosition, rawValue: word };
        case "false":
            return { type: "KEYWORD", tokenType: "false", position: tokenPosition, rawValue: word };
        case "null":
            return { type: "KEYWORD", tokenType: "null", position: tokenPosition, rawValue: word };
        case "this":
            return { type: "KEYWORD", tokenType: "this", position: tokenPosition, rawValue: word };
    }
    return null;
}

/**
 * convert passed word to symbol token if it exists in keywords.
 * return null if it isn't symbol token.
 * 
 * @param word : to be converted
 * @returns symbolToken if it is keyword, otherwise null. 
 */
function convertToSymbolToken(word: string, tokenPosition: ScriptPos): SymbolToken | null {
    switch (word) {
        case "{":
            return { type: "SYMBOL", tokenType: "{", position: tokenPosition, rawValue: word };
        case "}":
            return { type: "SYMBOL", tokenType: "}", position: tokenPosition, rawValue: word };
        case "(":
            return { type: "SYMBOL", tokenType: "(", position: tokenPosition, rawValue: word };
        case ")":
            return { type: "SYMBOL", tokenType: ")", position: tokenPosition, rawValue: word };
        case "[":
            return { type: "SYMBOL", tokenType: "[", position: tokenPosition, rawValue: word };
        case "]":
            return { type: "SYMBOL", tokenType: "]", position: tokenPosition, rawValue: word };
        case ".":
            return { type: "SYMBOL", tokenType: ".", position: tokenPosition, rawValue: word };
        case ",":
            return { type: "SYMBOL", tokenType: ",", position: tokenPosition, rawValue: word };
        case ";":
            return { type: "SYMBOL", tokenType: ";", position: tokenPosition, rawValue: word };
        case "+":
            return { type: "SYMBOL", tokenType: "+", position: tokenPosition, rawValue: word };
        case "-":
            return { type: "SYMBOL", tokenType: "-", position: tokenPosition, rawValue: word };
        case "*":
            return { type: "SYMBOL", tokenType: "*", position: tokenPosition, rawValue: word };
        case "/":
            return { type: "SYMBOL", tokenType: "/", position: tokenPosition, rawValue: word };
        case "&":
            return { type: "SYMBOL", tokenType: "&", position: tokenPosition, rawValue: word };
        case "|":
            return { type: "SYMBOL", tokenType: "|", position: tokenPosition, rawValue: word };
        case "<":
            return { type: "SYMBOL", tokenType: "<", position: tokenPosition, rawValue: word };
        case ">":
            return { type: "SYMBOL", tokenType: ">", position: tokenPosition, rawValue: word };
        case "=":
            return { type: "SYMBOL", tokenType: "=", position: tokenPosition, rawValue: word };
        case "~":
            return { type: "SYMBOL", tokenType: "~", position: tokenPosition, rawValue: word };
    }
    return null;
}

export class JackTokenizer {
    private loadedLines: string[];
    private currentLineCount = 0; //current number of lines
    private currentLineTokenCount = 0;//current number of columns(word count) in current line
    private readingLine = "";
    private isReadingComment = false;

    public constructor(targetSrcPath: string) {
        //load script
        const script = fs.readFileSync(targetSrcPath);
        this.loadedLines = script.toString().split(/\r\n|\n/);
        this.currentLineCount = 0;
    }

    /**
     * returns next token if exist.
     * token is expressed as /^\w+|^\W/
     * when it reaches EOF, rtuens null.
     *
     * @returns token:if exist, null:when reaches EOF.
     */
    private readNextToken(): Token | null {
        if (this.readingLine == "") {
            const nextLine = this.readNextValidLine()
            if (nextLine === null) {
                return null; //means "finished reading"
            }

            this.readingLine = nextLine;
            this.currentLineTokenCount = 1;
        } else {
            this.currentLineTokenCount++
        }

        //extract characters surrounded with ".
        const dquoteRegex = /^\".*\"/;
        const foundDquoteContent = this.readingLine.match(dquoteRegex);
        if (foundDquoteContent != null) {
            this.readingLine = this.readingLine.substring(foundDquoteContent[0].length).trim(); // remove top whitespace by trim()
            return { type: "STRING_CONST", value: foundDquoteContent[0], position: { line: this.currentLineCount, tokenCount: this.currentLineTokenCount }, rawValue: foundDquoteContent[0] };
        }

        //extract other token that means continuing words or each of otherwise.
        const tokenRegex = /^\w+|^\W/;
        const found = this.readingLine.match(tokenRegex);
        if (found == undefined) {
            console.error("detected invalid format.");
            console.error("invalid string: " + this.readingLine)
            console.error("line: " + this.currentLineCount);
            throw new Error("detected invalid format.");
        }

        //文字列内容に併せて，該当する型に変換して返す．データ型生成の際，もっといい方法ない？どの型で返してるか分かりづらい．．．
        const tokenWord = found[0];
        this.readingLine = this.readingLine.substring(found[0].length).trim();
        const tokenPosition = { line: this.currentLineCount, tokenCount: this.currentLineTokenCount };

        const keywordToken = convertToKeywordToken(tokenWord, tokenPosition);
        if (keywordToken != null) {
            return keywordToken;
        }

        const symbolToken = convertToSymbolToken(tokenWord, tokenPosition);
        if (symbolToken != null) {
            return symbolToken;
        }

        const integerToken = parseInt(tokenWord);
        if (!Number.isNaN(integerToken)) {
            return { type: "INT_CONST", value: integerToken, position: tokenPosition, rawValue: tokenWord };
        }

        return { type: "IDENTIFIER", value: tokenWord, position: tokenPosition, rawValue: tokenWord };
    }

    /**
     * read next valid line if exist.
     * when next raw line has only comment words, returns further next line.
     * when it reaches EOF, returns null.
     * 
     * @returns string :if exsit. null: if EOF.
     */
    private readNextValidLine(): string | null {
        const nextLine = this.loadedLines[this.currentLineCount++];
        if (nextLine === undefined) {
            return null;
        }

        const nextValidLine = this.getOneLineWithoutComment(nextLine).trim();
        if (nextValidLine === "") {
            return this.readNextValidLine();
        }

        return nextValidLine;
    }

    /**
     * remove comment from passed string.
     * removes characters between /* and *\/, and all characters after "/*" or "//".
     * 
     * @param line string to be removed comment words.
     * @returns string without comment.
     */
    private getOneLineWithoutComment(line: string): string {
        const MULTI_COMMENT_START_TOEKN = "/*"
        const MULTI_COMMENT_END_TOEKN = "*/"
        const LINE_COMMENT_TOEKN = "//"

        if (this.isReadingComment) {
            //When it is reading comment, search end token, and call this method recursively with commented characters removed.
            if (line.includes(MULTI_COMMENT_END_TOEKN)) {
                this.isReadingComment = false;
                return this.getOneLineWithoutComment(line.substring(line.indexOf(MULTI_COMMENT_END_TOEKN) + MULTI_COMMENT_END_TOEKN.length));
            }
            return "";
        }

        if (line.includes(LINE_COMMENT_TOEKN)) {
            // If this line contains "//", removes all characters after "//".
            // NOTE. "/*" after "//" is ignored, but "*/" after "//" should be read. The latter has been removed at above process.
            return line.substring(0, line.indexOf(LINE_COMMENT_TOEKN));
        }

        // When it is not reading comment, search start token and end token. If both was found, call this methiod recursively with commented characters removed
        if (line.includes(MULTI_COMMENT_START_TOEKN)) {
            if (line.includes(MULTI_COMMENT_END_TOEKN)) {
                // call myself recursived with characters between "\/\*" and "\*\/" removed.
                return this.getOneLineWithoutComment(line.substring(0, line.indexOf(MULTI_COMMENT_START_TOEKN)) + line.substring(line.indexOf(MULTI_COMMENT_END_TOEKN) + MULTI_COMMENT_END_TOEKN.length));
            } else {
                // If this line conttains "/*", and not contains "*/", remove all characters after /*.
                this.isReadingComment = true;
                return line.substring(0, line.indexOf(MULTI_COMMENT_START_TOEKN));
            }
        }

        return line;
    }

    public tokenize(): Token[] {
        let tokens: Token[] = [];
        while (true) {
            const token = this.readNextToken();
            if (token === null) {
                break;
            }
            tokens.push(token);
        }

        return tokens;
    }
}