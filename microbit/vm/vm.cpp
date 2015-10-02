#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

typedef enum {
    NOOP = 0x00,
    RET0,
    RET1,
    LDCONST8,
    LDCONST16,
    LDCONST32,
    LDPTR,
    LDARG,
    LDLOC,
    STARG,
    STLOC,
    POP,
    JMP,
    JMPZ,
    JMPNZ,

    UCALLPROC,
    UCALLFUNC,

    CALL0PROC,
    CALL1PROC,
    CALL2PROC,
    CALL3PROC,
    CALL4PROC,

    CALL0FUNC,
    CALL1FUNC,
    CALL2FUNC,
    CALL3FUNC,
    CALL4FUNC,

} OPCODE;

typedef enum {
    ERR_BAD_OPCODE = 1,
    ERR_STACK_OVERFLOW = 2,
    ERR_STACK_UNDERFLOW = 3,
    ERR_INVALID_FUNCTION_HEADER = 4,
} ERROR;

#define V1FUNC 0x4201

#define A(o, a) (o | (a << 8))
#define FUNC(loc, st)  V1FUNC, loc, st

uint16_t bytecode[] = {
    FUNC(0, 1),
    NOOP,
   // A(LDCONST8, 42),
   // LDCONST32, 42, 1,
    LDPTR, 2,
    RET1,
};

void error(ERROR code)
{
    printf("Error: %d\n", code);
    exit(1);
}

#define pop() (*--sp)
#define push(v) (*sp++ = v)
#define directArg() (op >> 8)
#define nextArg() (bytecode[pc++])
#define nextArg24() ((directArg()<<16) | nextArg())

#define check(cond, code) { if (!(cond)) error(code); }

void **callProc[10];
void **callFunc[10];

uint32_t exec_function(uint32_t pc, uint32_t *args)
{
    uint32_t ver = bytecode[pc++];
    check(ver == V1FUNC, ERR_INVALID_FUNCTION_HEADER);

    uint32_t numLocals = bytecode[pc++];
    uint32_t stackSize = bytecode[pc++];
    uint32_t locals[numLocals];
    uint32_t stack[stackSize];
    uint32_t *sp = stack;

    while (true) {
        uint32_t op = bytecode[pc++];
        uint32_t tmp;

        switch (op & 0xff) {
        case NOOP: break;
        case RET0: return 0;
        case RET1:
            check(sp > stack, ERR_STACK_UNDERFLOW);
            return pop();
        case LDPTR: push((uint32_t)(&bytecode[nextArg24()])); break;
        case LDCONST8: push(directArg()); break;
        case LDCONST16: push(nextArg()); break;
        case LDCONST32:
            tmp = nextArg();
            push((nextArg() << 16) | tmp);
            break;
        case LDARG: push(args[directArg()]); break;
        case LDLOC: push(locals[directArg()]); break;
        case POP: sp -= directArg(); break;
        case STLOC: locals[directArg()] = pop(); break;
        case STARG: args[directArg()] = pop(); break;

        case JMP: pc = nextArg24(); break;
        case JMPZ: if (pop() == 0) pc = nextArg24(); break;
        case JMPNZ: if (pop() != 0) pc = nextArg24(); break;

        case UCALLPROC:
            sp -= directArg();
            exec_function(nextArg(), sp);
            break;
        case UCALLFUNC:
            sp -= directArg();
            push(exec_function(nextArg(), sp));
            break;

        case CALL0PROC:
            ((void (*)())callProc[0][directArg()])();
            break;
        case CALL1PROC:
            sp -= 1;
            ((void (*)(uint32_t))callProc[1][directArg()])(sp[0]);
            break;
        case CALL2PROC:
            sp -= 2;
            ((void (*)(uint32_t, uint32_t))callProc[2][directArg()])(sp[0], sp[1]);
            break;
        case CALL3PROC:
            sp -= 3;
            ((void (*)(uint32_t, uint32_t, uint32_t))callProc[3][directArg()])(sp[0], sp[1], sp[2]);
            break;
        case CALL4PROC:
            sp -= 4;
            ((void (*)(uint32_t, uint32_t, uint32_t, uint32_t))callProc[4][directArg()])(sp[0], sp[1], sp[2], sp[3]);
            break;
        case CALL0FUNC:
            push(((uint32_t (*)())callProc[0][directArg()])());
            break;
        case CALL1FUNC:
            sp -= 1;
            push(((uint32_t (*)(uint32_t))callProc[1][directArg()])(sp[0]));
            break;
        case CALL2FUNC:
            sp -= 2;
            push(((uint32_t (*)(uint32_t, uint32_t))callProc[2][directArg()])(sp[0], sp[1]));
            break;
        case CALL3FUNC:
            sp -= 3;
            push(((uint32_t (*)(uint32_t, uint32_t, uint32_t))callProc[3][directArg()])(sp[0], sp[1], sp[2]));
            break;
        case CALL4FUNC:
            sp -= 4;
            push(((uint32_t (*)(uint32_t, uint32_t, uint32_t, uint32_t))callProc[4][directArg()])(sp[0], sp[1], sp[2], sp[3]));
            break;

        default:
            error(ERR_BAD_OPCODE);
        }

        check(sp >= stack, ERR_STACK_UNDERFLOW);
        check(sp <= stack + stackSize, ERR_STACK_OVERFLOW);
    }
}

int main()
{
    uint32_t v = exec_function(0, NULL);
    printf("%d\n", v);
}

// vim: ts=4 sw=4
