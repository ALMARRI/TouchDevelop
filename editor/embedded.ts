///<reference path='refs.ts'/>

// The main driver for C++ compilation: for each program, loads the libraries it
// depends on, compiles said libraries, compiles the main program, and stitches
// the various part together.

module TDev {
  import J = AST.Json

  export module Embedded {

    import H = Helpers

    interface StringMap<T> {
      [index: string]: T;
    }

    interface EmitterOutput {
      prototypes: string;
      code: string;
      tPrototypes: string;
      tCode: string;
      prelude: string;
    };

    // Assuming all library references have been resolved, compile either the
    // main app or one of said libraries.
    function compile1(globalNameMap: H.GlobalNameMap, libs: J.JApp[], resolveMap: StringMap<string>, a: J.JApp): EmitterOutput
    {
      try {
        var libRef: J.JCall = a.isLibrary ? H.mkLibraryRef(a.name) : null;
        var libName = a.isLibrary ? a.name : null;

        var env = H.emptyEnv(globalNameMap, libName);
        lift(env, a);
        var e = new Emitter(libRef, libs, resolveMap);
        e.visit(env, a);
        return e;
      } catch (e) {
        console.error("Compilation error", e);
        throw e;
      }
    }

    function buildResolveMap(libs: J.JLibrary[]): { [index: string]: string }[] {
      var idToAbsoluteName = {};
      libs.map((l: J.JLibrary) => {
        idToAbsoluteName[l.id] = l.name;
      });
      return libs.map((l: J.JLibrary) => {
        var map: { [i:string]: string } = {};
        l.resolveClauses.map((r: J.JResolveClause) => {
          map[r.name] = idToAbsoluteName[<any> r.defaultLibId];
        });
        return map;
      });
    }

    // Compile an entire program, including its libraries.
    export function compile(a: J.JApp): Promise { // of string
      // We need the library text for all the libraries referenced by this
      // script.
      var libraries = a.decls.filter((d: J.JDecl) => d.nodeType == "library");
      var resolveMap = buildResolveMap(<J.JLibrary[]> libraries);
      var textPromises = libraries.map((j: J.JDecl, i: number) => {
        var pubId = (<J.JLibrary> j).libIdentifier;
        return AST.loadScriptAsync(World.getAnyScriptAsync, pubId).then((resp: AST.LoadScriptResult) => {
          var s = Script;
          // Use the name by which this library is referred to in the script.
          (<any> s)._name = libraries[i].name;
          Script = resp.prevScript;
          return Promise.as(J.dump(s));
        });
      });
      textPromises.push(Promise.as(a));
      resolveMap.push({});
      return Promise.join(textPromises).then((everything: J.JApp[]) => {
        // TouchDevelop allows any name; thus, both "Thing$" and "Thing@" sanitize
        // to "Thing_". We need to disambuigate them. Because there may be
        // references across library to these names, we need to agree on a final
        // name before translation the various libraries.
        var globalNameMap: H.GlobalNameMap = {
          libraries: {},
          program: null,
        };
        everything.forEach((a: J.JApp) => {
          var tdToCpp: StringMap<string> = {};
          var cppToTd: StringMap<boolean> = {};
          a.decls.forEach((d: J.JDecl) => {
            // This is over-conservative, since technically speaking, types and
            // globals are each in their own namespace. Here, we
            // over-approximate and treat things as if everyone were in the same
            // namespace.
            var n = H.freshName(cppToTd, d.name);
            cppToTd[n] = true;
            tdToCpp[d.name] = n;
          });
          // TODO we should be doing the same thing for libraries, in case the
          // user has two libraries that desugar to the same name... not going
          // to happen?
          if (a.isLibrary)
            globalNameMap.libraries[a.name] = tdToCpp;
          else
            globalNameMap.program = tdToCpp;
        });

        var compiled = everything.map((a: J.JApp, i: number) => compile1(globalNameMap, everything, resolveMap[i], a));
        return Promise.as(
          compiled.map(x => x.prelude)
          .concat(["namespace touch_develop {"])
            .concat(compiled.map(x => x.tPrototypes))
            .concat(compiled.map(x => x.tCode))
            .concat(compiled.map(x => x.prototypes))
            .concat(compiled.map(x => x.code))
          .concat(["}"])
          .filter(x => x != "")
          .join("\n") + "\n" +
          (a.isLibrary
            ? "\nvoid app_main() {\n"+
              "  uBit.display.scroll(\"Error: trying to run a library\");\n"+
              "}\n"
            : "\nvoid app_main() {\n"+
              "  touch_develop::app_main();\n"+
              "}\n")
        );
      });
    }
  }
}

// vim: set ts=2 sw=2 sts=2:
