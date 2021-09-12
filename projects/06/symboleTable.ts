export class SymbolTable {
    private symbolTable = new Map<string, number>();
    private maxMemoryAddress = 16;

    constructor() {
        this.symbolTable.set("SP", 0);
        this.symbolTable.set("LCL", 1);
        this.symbolTable.set("ARG", 2);
        this.symbolTable.set("THIS", 3);
        this.symbolTable.set("THAT", 4);
        this.symbolTable.set("R0", 0);
        this.symbolTable.set("R1", 1);
        this.symbolTable.set("R2", 2);
        this.symbolTable.set("R3", 3);
        this.symbolTable.set("R4", 4);
        this.symbolTable.set("R5", 5);
        this.symbolTable.set("R6", 6);
        this.symbolTable.set("R7", 7);
        this.symbolTable.set("R8", 8);
        this.symbolTable.set("R9", 9);
        this.symbolTable.set("R10", 10);
        this.symbolTable.set("R11", 11);
        this.symbolTable.set("R12", 12);
        this.symbolTable.set("R13", 13);
        this.symbolTable.set("R14", 14);
        this.symbolTable.set("R15", 15);
        this.symbolTable.set("SCREEN", 16384);
        this.symbolTable.set("KBD", 24576);
    }

    public addEntry(symbol: string, address: number) {
        if (this.contains(symbol)) {
            throw new Error("Failed to create symbol table! Same label is used in different address.");
        }
        this.symbolTable.set(symbol, address);
    }

    public contains(symbol: string) {
        return this.symbolTable.has(symbol);
    }

    public getAddress(symbol: string) {
        if (!this.contains(symbol)) {
            this.addEntry(symbol, this.maxMemoryAddress++);
        }
        let address = this.symbolTable.get(symbol);
        if (address == undefined) {
            throw new Error("symbol table is wrong");
        }
        return address;
    }
}
