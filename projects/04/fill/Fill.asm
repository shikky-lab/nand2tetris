// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// Put your code here.

(LOOP)
    @KBD
    D=M
    @TOBLACK
    D;JNE
    @R4// R4 uses as a color. the screen will be filled by r4 value
    M=-1
    @FILLSTART
    0;JMP
(TOBLACK)
    @R4
    M=0
(FILLSTART)
    @SCREEN
    D=A
    @R6//R6 uses as a incremantal screen address. This value will be incremented for each loop.
    M=D

    @32
    D=A
    @R5//R5 uses as a counter. The count will be decremented for each loop
    M=D
    (FILLLOOP)
    @R5
    D=M
    @FILLLOOPEND
    D;JLE
    
    @R4
    D=M
    @R6
    A=M+1
    M=D
    @R6
    M=M+1
    @R5
    M=M-1
    @FILLLOOP
    0;JMP
(FILLLOOPEND)
    @LOOP
    0;JMP