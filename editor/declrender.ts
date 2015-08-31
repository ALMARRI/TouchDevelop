///<reference path='refs.ts'/>

module TDev
{
    export interface DeclBoxOptions {
        signature?: boolean;
        namespace?: boolean;
    }
    
    export class DeclEntry
    {
        public icon = "svg:hammer,white,clip=50";
        public iconArtId: string;
        public color = "blue";
        public description = "";
        public classAdd = "";

        constructor(public name:string) {
        }
        private getName() { return this.name; }
        private getDescription() { return this.description; }
        private nodeType() { return "declEntry"; }
        public mkBox(options?: DeclBoxOptions):HTMLElement
        {
            var r = DeclRender.mkBoxEx(this, this.nodeType(), options);
            r.className += this.classAdd;
            return r;
        }

        public getIconArtId() { return this.iconArtId; }

        public makeIntoAddButton()
        {
            this.icon = "svg:circlePlus,black";
            this.color = "transparent";
            this.classAdd += " navRound";
        }

        static mkSeeMore(lbl:string)
        {
            var d = new DeclEntry(lf("see more options"));
            d.description = lbl
            return d.mkBox()
        }
    }

    export module DeclRender
    {

            //var libsIcon = ScriptIcon("Book");
            //var libsBrush = new SolidColorBrush(Colors.Magenta); // TODO find good color

        var artColor = "#ff0038";
        var dataColor = "#ff7518";
        var actionColor = "#E72A59";
        var recordColor = "#800080";
        var userDefinedColor = "#1B91E0";

        export var declColor:any =
        {
            globalDef: (d:AST.GlobalDef) => {
                var c = DeclRender.propColor(d);
                if (c) return c;
                return d.isResource ? artColor : dataColor;
            },

            recordDef: () => recordColor,

            action: function (a: AST.Action) {
                if (a.isEvent()) return "#007fff";
                if (a.isPage()) return "#00008B";
                if (a.isActionTypeDef()) return recordColor;
                return actionColor;
            },

            libraryRef: (l:AST.LibraryRef) =>
                l.resolved ? l.resolved.htmlColor() : "#48A300",
            /*
                        globalDef: (d:AST.GlobalDef) => d.isResource ? "#A4500F" : "#FD882E",
                        tableDef: () => "#E72A59",
                        action: (a:AST.Action) => a.isEvent() ? "#41900D" : "#70DE29",
                        */
            app: (a:AST.App) => a.htmlColor(),

            localDef: () => "#E72A59",

            kind: (k:Kind) =>
                k.isAction ? "#007fff" : k.isUserDefined() ? recordColor : k.getParameterCount() > 0 ? "#c22" : "#40B619",

            singletonDef: function(s:AST.SingletonDef) {
                if (s.getKind() instanceof ThingSetKind)
                    return userDefinedColor;
                return "#40B619";
                /*
                switch (s.getName()) {
                    case "data": return dataColor;
                    case "art": return artColor;
                    case "code": return actionColor;
                    default: return "#40B619";
                }
                */
            },

            recordField: () => "#0d2",

            property: function(p:IProperty) {
                var c = DeclRender.propColor(p);
                if (c)
                    return c;
                else if (p.forwardsToStmt() instanceof AST.RecordField)
                    return "#0d2";
                else if (p.parentKind.isData)
                    return dataColor;
                else if (p instanceof MultiplexProperty)
                    return declColor.kind((<MultiplexProperty> p).forKind);
                else
                    return declColor.kind(p.getResult().getKind());

                    /*
                if (p.getResult().getKind() == api.core.Nothing)
                    return actionColor;
                else {
                    return artColor;
                    var pp = p.getParameters();
                    var len = pp.length;
                    if (!pp[0].getKind().isData) len--;
                    if (len == 0) return artColor;
                    else if (len == 1) return dataColor;
                    else return "#800080";
                }
                    */
            },
            declEntry: (d:DeclEntry) => d.color,
            codeLocation: () => "#1B91E0",
            codeLocationCurr: () => "#E31B78",
            codeLocationLib: () => "#48A300",
            };

        export function propColor(p:IProperty)
        {
            if (p && p.getResult().getKind() == api.core.Color) {
                var m = /#([a-fA-F0-9]+)/.exec(p.getDescription());
                if (m && m[1].length >= 6) {
                    return "#" + m[1].slice(-6);
                }
            }

            return null;
        }

        export function colorByPersistence(icon: string, pers: AST.RecordPersistence): string {
            return AST.RecordDef.colorByPersistence(icon, pers);
        }

        function appCloudColor(app:AST.App, icon:string)
        {
            if (!app) return icon
            if (!icon) icon = Cloud.artUrl(app.iconArtId, true) || app.iconPath()
            if (app.isCloud) // TODO: wrong color
                icon = icon.replace(/,white/, ",cyan")
            return icon
        }

        var declIcon:any =
        {
            globalDef: (d: AST.GlobalDef) =>
                colorByPersistence(d.getKind().icon() || "svg:Document,white", d.getRecordPersistence()),
            recordDef: (r: AST.RecordDef) =>
                colorByPersistence(AST.RecordDef.GetIcon(r.recordType), r.getRecordPersistence()),
            recordField: (r: AST.RecordField) =>
                declIcon["kind"](r.dataKind),
            action: (a:AST.Action) =>
                // a.isMainAction() ? "svg:actionMain,white" :
                a.isActionTypeDef() ? "svg:Bolt,white" :
                a.isPage() ? "svg:Book,white" :
                a.isEvent() ? "svg:actionEvent,white" :
                a.isPrivate ? "svg:Lock,white" :
                a.isOffline ? "svg:SignalAlt,white" :
                a.parent && a.parent.isCloud ? "svg:Signal,white" :
                "svg:emptyplay,white",
            app: (a:AST.App) => appCloudColor(a, null),
            localDef: (d:AST.LocalDef) =>
                d.getKind().icon() || "svg:Document,white",
            singletonDef: () => "svg:touchDevelop,white",
            property: (p:IProperty) =>
              p.getResult().getKind().icon() || "svg:touchDevelop,white",
            declEntry: (d:DeclEntry) => d.icon,
            kind: (k:Kind) => k.icon() || "svg:Document,white",
            codeLocation: () => "svg:actionLocation,white",
            codeLocationCurr: () => "svg:actionLocation,white",
            codeLocationLib: () => "svg:actionLocation,white",
            libraryRef: (l:AST.LibraryRef) =>
                appCloudColor(l.resolved,
                    l.resolved && l.resolved.icon ? l.resolved.iconPath() : "svg:recycleLib,white"),
        };

        export function mkPropBox(p:IProperty,options?: DeclBoxOptions)
        {
            var f = p.forwardsTo();
            if (f != null)
                return mkBox(f, options);
            else
                return mkBoxEx(p, "property", options);
        }

        export function mkKindBox(p:Kind, options?: DeclBoxOptions)
        {
            return mkBoxEx(p, "kind", options);
        }

        export function mkBox(decl: AST.Decl, options? : DeclBoxOptions) { 
            return mkBoxEx(decl, decl.nodeType(), options);
        }

        export function mkNameSpaceDecl(decl: any) {
            var ns = null;
            if (decl.getNamespace) {
                ns = span("navSig symbol", decl.getNamespace());
            }
            var name = decl.getName();
            return [ns,name];
        }

        function iconFromDecl(decl: AST.Decl, tp: string) {
            var img;
            var iconArtId = decl.getIconArtId ? decl.getIconArtId() : undefined;
            if (iconArtId) img = ArtUtil.artImg(iconArtId, true);
            else {
                var iconPath = declIcon[tp](decl);
                img = !iconPath ? <any> text("") : HTML.mkImg(iconPath);
            }
            var icon = div("navImg", img);
            icon.style.backgroundColor = declColor[tp](decl);
            return icon;
        }

        var mdCmt:MdComments;

        export function mkBoxEx(decl:any, tp:string, options?: DeclBoxOptions):HTMLElement
        {
            if (!mdCmt) mdCmt = new MdComments();

            var icon = iconFromDecl(decl, tp);
            var innerElt = div("navItemInner");
            var elt= HTML.mkButtonElt("navItem", innerElt);
            var sig = null;
            var ns = null;
            var desc = decl.getBoxInfo ? Util.htmlEscape(decl.getBoxInfo()) : mdCmt.formatInline(decl.getDescription());
            var name = decl.getName();
            if (options && options.signature) {
                var sigText = decl.getSignature && decl.getSignature();
                if (sigText) {
                    var limit = 18;
                    if (decl instanceof Kind) limit = 40;
                    if ((name + sigText).length > limit && sigText != "()") {
                        if (desc)
                            desc = Util.htmlEscape(sigText) + " :: " + desc;
                        else
                            desc = Util.htmlEscape(sigText);
                    } else {
                        sig = span("navSig", decl.getSignature());
                    }
                }
            }
            if (options && options.namespace) {
                if (decl.getNamespaces) {
                    var namespaces: string[] = <string[]>decl.getNamespaces();
                    if (namespaces && namespaces[0]) ns = span("navSig", namespaces[0] + " → ");
                }
                var namespace: string;
                if (!ns && decl.getNamespace && (namespace = decl.getNamespace())) {
                    // special handling of data
                    if (namespace[0] == AST.dataSymbol) namespace = "var " + namespace;
                    ns = span("navSig symbol", namespace);                    
                }
            } else {
                var namespaces: string[];
                if (decl.getNamespaces && (namespaces = decl.getNamespaces()) && namespaces[0])
                    desc = lf("in <strong>{0}</strong>. ", namespaces[0]) + desc;
            }
            var descDiv = div("navDescription md-inline")

            if (decl instanceof AST.Action && !decl.isAtomic && TheEditor.widgetEnabled("awaitClock"))
                desc = "<span class='actionAwait'>" + SVG.getIconSVGCore("clock2,#666,clip=60") + "</span>" + desc;

            Browser.setInnerHTML(descDiv, desc)
            var suff = null
            if (decl instanceof Kind && (<Kind>decl).isImmutable() && AST.proMode)
                suff = div("navDiamond", SVG.getIconSVG("diamond,#00f,clip=60"))
                
            var nameDiv = div("navName", ns, name, sig);
            innerElt.setChildren([icon, div("navContent", [nameDiv, descDiv]), suff]);

            if (decl.debuggingData && decl.debuggingData.critical && decl.debuggingData.max) {
                var scorePartial = decl.debuggingData.critical / decl.debuggingData.max.critical;
                var score = Math.floor(scorePartial * 27); // there are 28 colors, first of them is white
                var color: string = AST.ExprHolder.heatmapColors[score];
                innerElt.style.backgroundColor = color;
            }
            (<any> elt).theDesc = descDiv;
            (<any> elt).theName = nameDiv;
            (<any> elt).theNode = decl;
            return elt;
        }

        export function mkKindList(ctx:KindContext, curr:Kind, selected:(k:Kind)=>void)
        {         
            var profile = TheEditor.intelliProfile;   
            var kinds = Script.getKinds().filter((k:Kind) =>
                k.isData && k.hasContext(ctx) && Script.canUseCapability(k.generalCapabilities) && k != api.core.Unknown &&
                k.getParameterCount() <= 1 &&
                (!profile || profile.hasKind(k))
                );
            function cmp(a:Kind, b:Kind) {
                var d = b.listPriority() - a.listPriority();
                if (d) return d;
                else return a.toString().localeCompare(b.toString());
            }
            kinds.sort(cmp);
            return kinds.map(function (k:Kind) {
                var kk = DeclRender.mkKindBox(k);
                if (k == curr)
                    kk.setFlag("selected", true);
                Util.clickHandler(kk, function() { selected(k) });
                return kk;
            });
        }
    }
}
