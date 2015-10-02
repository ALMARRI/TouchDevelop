///<reference path='refs.ts'/>

module TDev.AST.Bytecode
{
    export var codeByName:StringMap<number>;

    public class Opcode
    {
        arg0:any;
        arg1:number;
        index:number;

        constructor(public name:string, public darg:number)
        {
        }

        size()
        {
            if (this.name == "LABEL")
                return 0;

            if (this.arg1 != null)
                return 3;
            else if (this.arg0 != null)
                return 2;
            return 1;
        }

        emitTo(buf:number[])
        {
            if (this.name == "LABEL")
                return;

            Util.assert(codeByName.hasOwnProperty(this.name))
            Util.assert(0 <= this.darg <= 255)

            buf.push(codeByName[this.name] | ((this.darg & 0xff) << 8))

            if (this.arg0 == null) return
            if (this.arg0 instanceof Opcode)
                buf.push((<Opcode>this.arg0).index)
            else if (this.arg0 instanceof Procedure)
                buf.push((<Procedure>this.arg0).index)
            else if (typeof this.arg0 == "number")
                buf.push(this.arg0)
            else Util.oops()

            if (this.arg1 == null) return
            if (typeof this.arg1 == "number")
                buf.push(this.arg1)
            else Util.oops()
        }

        static staticStackOffset:StringMap<number> = {
            NOOP: 0,
            RET0: 0,
            RET1: -1,
            LDPTR: 1,
            LDCONST8: 1,
            LDCONST16: 1,
            LDCONST32: 1,
            LDARG: 1,
            LDLOC: 1,
            STLOC: -1,
            STARG: -1,
            JMP: 0,
            JMPZ: 0,
            JMPNZ: 0,
            CALL0PROC: 0,
            CALL1PROC: -1,
            CALL2PROC: -2,
            CALL3PROC: -3,
            CALL4PROC: -4, 
            CALL0FUNC: 1,
            CALL1FUNC: 0,
            CALL2FUNC: -1,
            CALL3FUNC: -2,
            CALL4FUNC: -3,

            LABEL: 0,
        }

        stackOffset()
        {
            if (Opcode.staticStackOffset.hasOwnProperty(this.name))
                return Opcode.staticStackOffset[this.name]

            if (this.name == "UCALLPROC" || this.name == "POP")
                return -this.darg;
            if (this.name == "UCALLFUNC")
                return -this.darg + 1;

            Util.oops();
        }
    }

    public class Local
    {
        constructor(public index:number)
        {
        }
    }

    public class Procedure
    {
        numArgs = 0;
        hasReturn = false;
        currStack = 0;
        maxStack = 0;

        body:Opcode[] = [];
        locals:Local[] = [];
        index:number;

        size(idx:number)
        {
            this.index = idx;
            idx += 3;
            this.body.forEach(o => {
                o.index = idx;
                idx += o.size();
            })
            return idx - this.index;
        }

        mkLocal()
        {
            var l = new Local(this.locals.length)
            this.locals.push(l)
            return l
        }

        emitTo(buf:number[])
        {
            buf.push(0x4201);
            buf.push(this.locals.length);
            buf.push(this.maxStack);
            this.body.forEach(o => o.emitTo(buf))
        }

        emit(name:string, darg = 0):Opcode
        {
            var op = new Opcode(this, name, darg)
            this.currStack += op.stackOffset();
            if (this.currStack > this.maxStack)
                this.maxStack = this.currStack;
            this.body.push(op)
        }
    }

    public class Binary
    {
        procs:Procedure[] = [];

        serialize()
        {
            var idx = 0;
            this.procs.forEach(p => {
                idx += p.size(idx);
            })
            var buf = [];
            this.procs.forEach(p => {
                Util.assert(buf.length == p.index);
                p.emitTo(buf);
            })

            return buf;
        }
    }
}
