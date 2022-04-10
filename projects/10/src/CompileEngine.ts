import { Token, KeywordToken, SymbolToken, IdentiferToken } from "./JackTokenizer";

import fs from 'fs';

const decrarementKeywordList = ["class", "classVarDec", "subroutineDec", "parameterList", "subroutineBody", "varDec"] as const;
const statementKeywordList = ["statements", "whileStatement", "ifStatement", "returnStatement", "letStatement", "doStatement", "let"] as const;
const statementsTokenList = ["let", "if", "while", "do", "return"];
const opTokenList = ['+', '-', '*', '/', '/', '&', '|', '<', '>', '='];
const keywordConstantsTokenList = ["true", "false", "null", "this"];
type NotTerminalKeywordLiterals = typeof decrarementKeywordList[number] | typeof statementKeywordList[number] | "expression" | "term" | "expressionList";

export class CompileEngine {
    private compiledXMLlines: string[] = []; //parsed tokens will be set.
    private readingNonTerminals: NotTerminalKeywordLiterals[] = [];
    private parsedTokens: ReadingQueue<Token>;

    constructor(parsedTokens: Token[]) {
        this.parsedTokens = new ReadingQueue(parsedTokens);
    }

    private writeKeyword(keywordToken: KeywordToken) {

        this.compiledXMLlines.push(this.getCrurrentIndent() + "<keyword> " + keywordToken.tokenType + " </keyword>");
    }

    private writeIdentifier(identifierToken: IdentiferToken) {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<identifier> " + identifierToken.value + " </identifier>");
    }

    private writeSymbol(symbolToken: SymbolToken) {
        //write terminal element
        const symbolWord: string = ((token: SymbolToken) => {
            switch (token.tokenType) {
                case "&":
                    return "&amp;";
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                default:
                    return token.tokenType;
            }
        })(symbolToken);
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<symbol> " + symbolWord + " </symbol>");
    }

    private writeTerminal(token: Token) {
        switch (token.type) {
            case "KEYWORD":
                return this.writeKeyword(token);
            case "IDENTIFIER":
                return this.writeIdentifier(token);
            case "SYMBOL":
                return this.writeSymbol(token);
            case "STRING_CONST":
                this.compiledXMLlines.push(this.getCrurrentIndent() + "<stringConstant> " + token.value.replace(/\"/g, "") + " </stringConstant>");
                return;
            case "INT_CONST":
                this.compiledXMLlines.push(this.getCrurrentIndent() + "<integerConstant> " + token.value + " </integerConstant>");
                return;
        }
    }

    private compileClass() {
        //write "class"
        const classToken = this.parsedTokens.poll();
        if (classToken.type != "KEYWORD" || classToken.tokenType != "class") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile class", classToken));
        }
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<class>");
        this.readingNonTerminals.push("class");
        this.writeTerminal(classToken);

        //write "className"
        const classNameToken = this.parsedTokens.poll();
        if (classNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after class token", classNameToken));
        }
        this.writeIdentifier(classNameToken);

        const leftCurlyBracket = this.parsedTokens.poll();
        if (leftCurlyBracket.type != "SYMBOL" || leftCurlyBracket.tokenType != "{") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after className token", leftCurlyBracket));
        }
        this.writeSymbol(leftCurlyBracket);

        this.compileClassVarDec(); //recursivelyCall．If it deosn't have classVarDec, it returuns immediately.

        //update token. It has been changed if classVarDec had existed.
        this.compileSubroutineDec(); //recursivelyCall. If it deosn't have subroutineDec, it returuns immediately

        const lastToken = this.parsedTokens.poll();
        if (lastToken.type != "SYMBOL" || lastToken.tokenType != "}") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax.Failed to compileClass.", lastToken));
        }
        this.writeSymbol(lastToken);
        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</class>");
    }

    /**
     * only call the first keyword = "static" | "field"
     */
    private compileClassVarDec() {
        //('static' | 'field')
        const fieldDecTypeToken = this.parsedTokens.peek();
        if (fieldDecTypeToken.type != "KEYWORD" || (fieldDecTypeToken.tokenType != "static" && fieldDecTypeToken.tokenType != "field")) {
            return;
        }
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<classVarDec>");
        this.readingNonTerminals.push("classVarDec");

        this.parsedTokens.poll();//throw away
        this.writeTerminal(fieldDecTypeToken)

        //type
        const typeToken = this.parsedTokens.poll();
        if (typeToken.type == "IDENTIFIER") {
            this.writeIdentifier(typeToken);
        } else if (typeToken.type == "KEYWORD" && ["int", "char", "boolean"].includes(typeToken.tokenType)) {
            this.writeKeyword(typeToken);
        } else {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile classVarDec.", typeToken));
        }

        //varName
        const varNameToken = this.parsedTokens.poll();
        if (varNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile classVarDec.", varNameToken));
        }
        this.writeIdentifier(varNameToken);

        while (1) {
            const nextToken = this.parsedTokens.peek();
            if (nextToken.type != "SYMBOL" || nextToken.tokenType != ",") {
                break;
            }

            //,
            const commaToken = this.parsedTokens.poll();
            if (commaToken.type != "SYMBOL" || commaToken.tokenType != ",") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile classVarDec.", commaToken));
            }
            this.writeSymbol(commaToken);

            //varname
            const varNameToken = this.parsedTokens.poll();
            if (varNameToken.type != "IDENTIFIER") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile classVarDec.", varNameToken));
            }
            this.writeIdentifier(varNameToken);
        }

        //;
        const semicolonToken = this.parsedTokens.poll();
        if (semicolonToken.type != "SYMBOL" || semicolonToken.tokenType != ";") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile classVarDec.", semicolonToken));
        }
        this.writeSymbol(semicolonToken);

        //finish classVarDec
        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</classVarDec>");

        //recursive call
        this.compileClassVarDec();
    }

    private compileSubroutineDec() {

        const nextToken = this.parsedTokens.peek();
        if (nextToken.type != "KEYWORD" || !(["constructor", "function", "method"].includes(nextToken.tokenType))) {
            return;
        }
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<subroutineDec>");
        this.readingNonTerminals.push("subroutineDec");

        // 'constructor' | 'function' | 'method'
        const subroutineKindToken = this.parsedTokens.poll();
        if (subroutineKindToken.type != "KEYWORD" || !(["constructor", "function", "method"].includes(subroutineKindToken.tokenType))) {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec.", subroutineKindToken));
        }
        this.writeKeyword(subroutineKindToken);

        //('void' | type)
        const typeToken = this.parsedTokens.poll();
        if (typeToken.type == "IDENTIFIER") {
            this.writeIdentifier(typeToken);
        } else if (typeToken.type == "KEYWORD" && ["void", "int", "char", "boolean"].includes(typeToken.tokenType)) {
            this.writeKeyword(typeToken);
        } else {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec.", typeToken));
        }

        //subroutineName
        const subroutineNameToken = this.parsedTokens.poll();
        if (subroutineNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec.", subroutineNameToken));
        }
        this.writeIdentifier(subroutineNameToken);

        //(
        const leftParentheses = this.parsedTokens.poll();
        if (leftParentheses.type != "SYMBOL" || leftParentheses.tokenType != "(") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after className token", leftParentheses));
        }
        this.writeSymbol(leftParentheses);

        //write parameterList
        //is next type?
        this.compileParameterList();

        //')'
        const rightParentheses = this.parsedTokens.poll();
        if (rightParentheses.type != "SYMBOL" || rightParentheses.tokenType != ")") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after className token", rightParentheses));
        }
        this.writeSymbol(rightParentheses);

        //subroutineBody
        this.compileSubroutineBody();

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</subroutineDec>");

        this.compileSubroutineDec();//recursive call
    }

    private compileParameterList() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<parameterList>");
        this.readingNonTerminals.push("parameterList");

        const firstTypeToken = this.parsedTokens.peek();
        if ((firstTypeToken.type == "IDENTIFIER") || (firstTypeToken.type == "KEYWORD" && ["int", "char", "boolean"].includes(firstTypeToken.tokenType))) {
            //'int'|'char'|'boolean'|className
            this.parsedTokens.poll();//throw away
            this.writeTerminal(firstTypeToken);

            //varname
            const firstVarNameToken = this.parsedTokens.poll();
            if (firstVarNameToken.type != "IDENTIFIER") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec-parameterList.", firstVarNameToken));
            }
            this.writeIdentifier(firstVarNameToken);

            while (1) {
                //',' if exist
                const commaToken = this.parsedTokens.peek();
                if (commaToken.type != "SYMBOL" || commaToken.tokenType != ",") {
                    break;
                }
                this.parsedTokens.poll();//throw away
                this.writeSymbol(commaToken);

                //'int'|'char'|'boolean'|className
                const typeToken = this.parsedTokens.peek();
                if ((typeToken.type != "IDENTIFIER") && !(typeToken.type == "KEYWORD" && ["int", "char", "boolean"].includes(typeToken.tokenType))) {
                    throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec-parameterList.", typeToken));
                }

                this.parsedTokens.poll();//throw away
                this.writeTerminal(typeToken);

                //varname
                const varNameToken = this.parsedTokens.poll();
                if (varNameToken.type != "IDENTIFIER") {
                    throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutineDec-parameterList.", varNameToken));
                }
                this.writeIdentifier(varNameToken);
            }
        }

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</parameterList>");
    }

    private compileSubroutineBody() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<subroutineBody>");
        this.readingNonTerminals.push("subroutineBody");

        //{
        const leftCurlyBracket = this.parsedTokens.poll();
        if (leftCurlyBracket.type != "SYMBOL" || leftCurlyBracket.tokenType != "{") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after className token", leftCurlyBracket));
        }
        this.writeSymbol(leftCurlyBracket);

        this.compileVarDec();

        this.compileStatements();

        //}
        const rightCurlyBracket = this.parsedTokens.poll();
        if (rightCurlyBracket.type != "SYMBOL" || rightCurlyBracket.tokenType != "}") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax after className token", rightCurlyBracket));
        }
        this.writeSymbol(rightCurlyBracket);

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</subroutineBody>");
    }

    private compileVarDec() {
        const varToken = this.parsedTokens.peek();
        //var
        if (varToken.type != "KEYWORD" || varToken.tokenType != "var") {
            return;
        }
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<varDec>");
        this.readingNonTerminals.push("varDec");

        this.parsedTokens.poll()//throw away.
        this.writeTerminal(varToken);

        //type
        const typeToken = this.parsedTokens.poll();
        if (typeToken.type == "IDENTIFIER") {
            this.writeIdentifier(typeToken);
        } else if (typeToken.type == "KEYWORD" && ["int", "char", "boolean"].includes(typeToken.tokenType)) {
            this.writeKeyword(typeToken);
        } else {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile varDec.", typeToken));
        }

        //varName
        const varNameToken = this.parsedTokens.poll();
        if (varNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile varDec.", varNameToken));
        }
        this.writeIdentifier(varNameToken);

        while (1) {
            const nextToken = this.parsedTokens.peek();
            if (nextToken.type != "SYMBOL" || nextToken.tokenType != ",") {
                break;
            }

            //,
            const commaToken = this.parsedTokens.poll();
            if (commaToken.type != "SYMBOL" || commaToken.tokenType != ",") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile varDec.", commaToken));
            }
            this.writeSymbol(commaToken);

            //varname
            const varNameToken = this.parsedTokens.poll();
            if (varNameToken.type != "IDENTIFIER") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile varDec.", varNameToken));
            }
            this.writeIdentifier(varNameToken);
        }

        //;
        const semicolonToken = this.parsedTokens.poll();
        if (semicolonToken.type != "SYMBOL" || semicolonToken.tokenType != ";") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile varDec.", semicolonToken));
        }
        this.writeSymbol(semicolonToken);

        //finish VarDec
        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</varDec>");

        //recursive call
        this.compileVarDec();
    }

    private compileStatements() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<statements>");
        this.readingNonTerminals.push("statements");

        this.compileStatement();

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</statements>");
    }

    private compileStatement() {
        const statementToken = this.parsedTokens.peek();
        if (statementToken.type != "KEYWORD" || !statementsTokenList.includes(statementToken.tokenType)) {
            return;
        }
        switch (statementToken.tokenType) {
            case "let":
                this.compileLetStatement();
                break;
            case "do":
                this.compileDoStatement();
                break;
            case "if":
                this.compileIfStatement();
                break;
            case "while":
                this.compileWhileStatement();
                break;
            case "return":
                this.compileReturnStatement();
                break;
            default:
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile statements.", statementToken));
        }
        this.compileStatement();
    }

    private compileLetStatement() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<letStatement>");
        this.readingNonTerminals.push("letStatement");

        //'let'
        const letToken = this.parsedTokens.poll();
        if (letToken.type != "KEYWORD" || letToken.tokenType != "let") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile let statement.", letToken));
        }
        this.writeTerminal(letToken);

        //varName
        const varNameToken = this.parsedTokens.poll();
        if (varNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile let statement.", varNameToken));
        }
        this.writeTerminal(varNameToken);

        //'[' if exist
        const nextToken = this.parsedTokens.peek();
        if (nextToken.type == "SYMBOL" && nextToken.tokenType == '[') {
            //'['
            this.parsedTokens.poll();//throw away already peeked token.
            const leftSquareBracketToken = nextToken;
            this.writeTerminal(leftSquareBracketToken);

            //expression
            this.compileExpression();

            //']'
            const rightSquareBracketToken = this.parsedTokens.poll();
            if (rightSquareBracketToken.type != "SYMBOL" || rightSquareBracketToken.tokenType != ']') {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile let statement.", rightSquareBracketToken));
            }
            this.writeTerminal(rightSquareBracketToken);
        }

        //'='
        const equalToken = this.parsedTokens.poll();
        if (equalToken.type != "SYMBOL" || equalToken.tokenType != '=') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile let statement.", equalToken));
        }
        this.writeTerminal(equalToken);

        //expression
        this.compileExpression();

        //';'
        const semicolonToken = this.parsedTokens.poll();
        if (semicolonToken.type != "SYMBOL" || semicolonToken.tokenType != ';') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile let statement.", semicolonToken));
        }
        this.writeTerminal(semicolonToken);

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</letStatement>");
    }

    private compileIfStatement() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<ifStatement>");
        this.readingNonTerminals.push("ifStatement");

        //'if'
        const ifToken = this.parsedTokens.poll();
        if (ifToken.type != "KEYWORD" || ifToken.tokenType != "if") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", ifToken));
        }
        this.writeTerminal(ifToken);

        //'('
        const leftParenthesesToken = this.parsedTokens.poll();
        if (leftParenthesesToken.type != "SYMBOL" || leftParenthesesToken.tokenType != '(') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", leftParenthesesToken));
        }
        this.writeTerminal(leftParenthesesToken);

        //expression
        this.compileExpression();

        //')'
        const rightParenthesesToken = this.parsedTokens.poll();
        if (rightParenthesesToken.type != "SYMBOL" || rightParenthesesToken.tokenType != ')') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", rightParenthesesToken));
        }
        this.writeTerminal(rightParenthesesToken);

        //'{'
        const leftCurlyBracketToken = this.parsedTokens.poll();
        if (leftCurlyBracketToken.type != "SYMBOL" || leftCurlyBracketToken.tokenType != '{') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", leftCurlyBracketToken));
        }
        this.writeTerminal(leftCurlyBracketToken);

        //statements
        this.compileStatements();

        //'}'
        const rightCurlyBracketToken = this.parsedTokens.poll();
        if (rightCurlyBracketToken.type != "SYMBOL" || rightCurlyBracketToken.tokenType != '}') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", rightCurlyBracketToken));
        }
        this.writeTerminal(rightCurlyBracketToken);

        //'else' if exist
        const nextToken = this.parsedTokens.peek();
        if (nextToken.type == "KEYWORD" && nextToken.tokenType == "else") {
            //'else'
            this.parsedTokens.poll();//throw away already peeked token.
            this.writeTerminal(nextToken);

            //'{'
            const leftCurlyBracketToken = this.parsedTokens.poll();
            if (leftCurlyBracketToken.type != "SYMBOL" || leftCurlyBracketToken.tokenType != '{') {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", leftCurlyBracketToken));
            }
            this.writeTerminal(leftCurlyBracketToken);

            //statements
            this.compileStatements();

            //'}'
            const rightCurlyBracketToken = this.parsedTokens.poll();
            if (rightCurlyBracketToken.type != "SYMBOL" || rightCurlyBracketToken.tokenType != '}') {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile if statement.", rightCurlyBracketToken));
            }
            this.writeTerminal(rightCurlyBracketToken);
        }

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</ifStatement>");
    }

    private compileWhileStatement() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<whileStatement>");
        this.readingNonTerminals.push("whileStatement");

        //'while'
        const whileToken = this.parsedTokens.poll();
        if (whileToken.type != "KEYWORD" || whileToken.tokenType != "while") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile while statement.", whileToken));
        }
        this.writeTerminal(whileToken);

        //'('
        const leftParenthesesToken = this.parsedTokens.poll();
        if (leftParenthesesToken.type != "SYMBOL" || leftParenthesesToken.tokenType != '(') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile while statement.", leftParenthesesToken));
        }
        this.writeTerminal(leftParenthesesToken);

        //expression
        this.compileExpression();

        //')'
        const rightParenthesesToken = this.parsedTokens.poll();
        if (rightParenthesesToken.type != "SYMBOL" || rightParenthesesToken.tokenType != ')') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile while statement.", rightParenthesesToken));
        }
        this.writeTerminal(rightParenthesesToken);

        //'{'
        const leftCurlyBracketToken = this.parsedTokens.poll();
        if (leftCurlyBracketToken.type != "SYMBOL" || leftCurlyBracketToken.tokenType != '{') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile while statement.", leftCurlyBracketToken));
        }
        this.writeTerminal(leftCurlyBracketToken);

        //statements
        this.compileStatements();

        //'}'
        const rightCurlyBracketToken = this.parsedTokens.poll();
        if (rightCurlyBracketToken.type != "SYMBOL" || rightCurlyBracketToken.tokenType != '}') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile while statement.", rightCurlyBracketToken));
        }
        this.writeTerminal(rightCurlyBracketToken);

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</whileStatement>");
    }

    private compileDoStatement() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<doStatement>");
        this.readingNonTerminals.push("doStatement");

        //'do'
        const doToken = this.parsedTokens.poll();
        if (doToken.type != "KEYWORD" || doToken.tokenType != "do") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile do statement.", doToken));
        }
        this.writeTerminal(doToken);

        this.compileSubroutineCall();

        //';'
        const semicolonToken = this.parsedTokens.poll();
        if (semicolonToken.type != "SYMBOL" || semicolonToken.tokenType != ';') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile do statement.", semicolonToken));
        }
        this.writeTerminal(semicolonToken);

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</doStatement>");
    }

    private compileReturnStatement() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<returnStatement>");
        this.readingNonTerminals.push("returnStatement");

        //'return'
        const returnToken = this.parsedTokens.poll();
        if (returnToken.type != "KEYWORD" || returnToken.tokenType != "return") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile return statement.", returnToken));
        }
        this.writeTerminal(returnToken);

        const nextToken = this.parsedTokens.peek();
        if (nextToken.type != "SYMBOL" || nextToken.tokenType != ';') {//やりたいのはexpressionが続くかの判定．"セミコロンでないこと"で代用
            this.compileExpression();
        }

        //';'
        const semicolonToken = this.parsedTokens.poll();
        if (semicolonToken.type != "SYMBOL" || semicolonToken.tokenType != ';') {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile return statement.", semicolonToken));
        }
        this.writeTerminal(semicolonToken);

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</returnStatement>");
    }

    private compileExpression() {

        this.compiledXMLlines.push(this.getCrurrentIndent() + "<expression>");
        this.readingNonTerminals.push("expression");

        this.compileTerm();

        while (1) {
            const opToken = this.parsedTokens.peek();
            if (opToken.type == "SYMBOL" && opTokenList.includes(opToken.tokenType)) {
                this.parsedTokens.poll();//throw away
                this.writeTerminal(opToken);

                this.compileTerm();
            } else {
                break;
            }
        }

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</expression>");
    }

    private compileTerm() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<term>");
        this.readingNonTerminals.push("term");

        const termToken = this.parsedTokens.peek();
        if (termToken.type == "INT_CONST" || termToken.type == "STRING_CONST") {
            this.parsedTokens.poll();//throw away
            this.writeTerminal(termToken);
        } else if (termToken.type == "KEYWORD" && keywordConstantsTokenList.includes(termToken.tokenType)) {
            this.parsedTokens.poll();//throw away
            this.writeTerminal(termToken);
        } else if (termToken.type == "SYMBOL" && ["-", "~"].includes(termToken.tokenType)) {
            this.parsedTokens.poll();//throw away
            this.writeTerminal(termToken);

            this.compileTerm();
        } else if (termToken.type == "SYMBOL" && termToken.tokenType == "(") {//'(' expression ')'
            //'(
            this.parsedTokens.poll();//throw away
            this.writeTerminal(termToken);

            this.compileExpression();

            //')
            const rightParenthesesToken = this.parsedTokens.poll();
            if (rightParenthesesToken.type != "SYMBOL" || rightParenthesesToken.tokenType != ')') {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile term statement.", rightParenthesesToken));
            }
            this.writeTerminal(rightParenthesesToken);
        } else if (termToken.type == "IDENTIFIER") {
            const nextNextToken = this.parsedTokens.peekNext(); // this token uses only jdgement. it will be wiritten by another method.
            if (nextNextToken.type == "SYMBOL" && (nextNextToken.tokenType == "(" || nextNextToken.tokenType == '.')) { //subroutineCall
                this.compileSubroutineCall();
            } else if (nextNextToken.type == "SYMBOL" && nextNextToken.tokenType == "[") {//varName[]
                //varName
                this.parsedTokens.poll();//throw away
                this.writeTerminal(termToken);

                //'[
                this.parsedTokens.poll();//throw away
                this.writeTerminal(nextNextToken);

                this.compileExpression();

                //']
                const rightCurlyBracketToken = this.parsedTokens.poll();
                if (rightCurlyBracketToken.type != "SYMBOL" || rightCurlyBracketToken.tokenType != ']') {
                    throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile term statement.", rightCurlyBracketToken));
                }
                this.writeTerminal(rightCurlyBracketToken);
            } else {//varName
                this.parsedTokens.poll();//throw away
                this.writeTerminal(termToken);
            }
        } else {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile term statement.", termToken));
        }

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</term>");
    }

    private compileSubroutineCall() {

        //subroutineName
        const somethingNameToken = this.parsedTokens.poll();
        if (somethingNameToken.type != "IDENTIFIER") {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", somethingNameToken));
        }
        this.writeTerminal(somethingNameToken);

        const nextToken = this.parsedTokens.peek();
        if (nextToken.type == "SYMBOL" && nextToken.tokenType == "(") {
            this.parsedTokens.poll();//throw away
            this.writeTerminal(nextToken);

            this.compileExpressionList();

            //')'
            const rightCurlyBracketToken = this.parsedTokens.poll();
            if (rightCurlyBracketToken.type != "SYMBOL" || rightCurlyBracketToken.tokenType != ")") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", rightCurlyBracketToken));
            }
            this.writeTerminal(rightCurlyBracketToken);
        } else if (nextToken.type == "SYMBOL" && nextToken.tokenType == ".") {
            this.parsedTokens.poll();//throw away
            this.writeTerminal(nextToken);

            //subroutineName
            const subroutineNameToken = this.parsedTokens.poll();
            if (subroutineNameToken.type != "IDENTIFIER") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", subroutineNameToken));
            }
            this.writeTerminal(subroutineNameToken);

            //'('
            const leftParenthesesToken = this.parsedTokens.poll();
            if (leftParenthesesToken.type != "SYMBOL" || leftParenthesesToken.tokenType != "(") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", leftParenthesesToken));
            }
            this.writeTerminal(leftParenthesesToken);

            this.compileExpressionList();

            //')'
            const rightParenthesesToken = this.parsedTokens.poll();
            if (rightParenthesesToken.type != "SYMBOL" || rightParenthesesToken.tokenType != ")") {
                throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", rightParenthesesToken));
            }
            this.writeTerminal(rightParenthesesToken);
        } else {
            throw SyntaxError(genereateSyntaxErrorMessage("invalid syntax. failed to compile subroutine statement.", nextToken));
        }
    }

    private compileExpressionList() {
        this.compiledXMLlines.push(this.getCrurrentIndent() + "<expressionList>");
        this.readingNonTerminals.push("expressionList");

        const nextToken = this.parsedTokens.peek();
        if (nextToken.type != "SYMBOL" || nextToken.tokenType != ")") {//次がtermの場合．ただ判定が面倒なので，"次が)でない=要素がある場合"，という条件にしている．
            this.compileExpression();

            while (1) {
                const nextExpressionToken = this.parsedTokens.peek();
                if (nextExpressionToken.type != "SYMBOL" || nextExpressionToken.tokenType != ",") {
                    break;
                }
                //','
                this.parsedTokens.poll();//throw away
                this.writeTerminal(nextExpressionToken);

                //expression
                this.compileExpression();
            }
        }

        this.readingNonTerminals.pop();
        this.compiledXMLlines.push(this.getCrurrentIndent() + "</expressionList>");
    }

    private getCrurrentIndent(): string {
        const currentIndentNum = this.readingNonTerminals.length;

        return "\t".repeat(currentIndentNum);
    }

    public compile(parsedTokens: Token[], targetDstPath: string) {
        this.compileClass();

        const ws = fs.createWriteStream(targetDstPath);
        ws.write(this.compiledXMLlines.join("\r\n"));
    }

}

function genereateSyntaxErrorMessage(baseMessage: string, token: Token) {
    return baseMessage + " word=\"" + token.rawValue + "\" at line " + token.position.line + "," + token.position.tokenCount;
}

class ReadingQueue<T>{

    private items: T[];
    private index = 0;

    constructor(items: T[]) {
        this.items = items;
    }

    poll(): T {
        const val = this.items[this.index++];
        if (val == undefined) {
            throw RangeError("EOF");
        }
        return val;
    }

    peek(): T {
        const val = this.items[this.index];
        if (val == undefined) {
            throw RangeError("EOF");
        }
        return val;
    }

    peekNext(): T {
        const val = this.items[this.index + 1];
        if (val == undefined) {
            throw RangeError("EOF");
        }
        return val;
    }
}