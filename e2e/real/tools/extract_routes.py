"""Extracts every backend route with its guard (@RequiresPermission / @MembershipOnly / other) from the controllers.

Usage: python3 -I extract_routes.py <backend-root> <out.json>
Resolves String constants used in mappings (class-local and SessionCookies-style Class.CONSTANT).
"""
import json, re, sys, pathlib

root = pathlib.Path(sys.argv[1]) / "src/main/java"
constants = {}
for f in root.rglob("*.java"):
    text = f.read_text()
    cls = f.stem
    for m in re.finditer(r'static final String (\w+)\s*=\s*"([^"]*)"', text):
        constants.setdefault(m.group(1), m.group(2))
        constants[f"{cls}.{m.group(1)}"] = m.group(2)

def resolve(expr):
    expr = expr.strip()
    parts = [p.strip() for p in expr.split("+")]
    out = ""
    for p in parts:
        if p.startswith('"'):
            out += p.strip('"')
        else:
            out += constants.get(p, constants.get(p.split(".")[-1], "{" + p + "}"))
    return out

def mapping_path(args):
    if args is None:
        return ""
    m = re.search(r'(?:value|path)\s*=\s*([^,)]+(?:\+[^,)]+)*)', args)
    if m:
        return resolve(m.group(1))
    m = re.match(r'\s*((?:"[^"]*"|[A-Za-z_.]+)(?:\s*\+\s*(?:"[^"]*"|[A-Za-z_.]+))*)', args)
    if m and not re.match(r'\s*(consumes|produces|params|headers)', args):
        return resolve(m.group(1))
    return ""

routes = []
for f in sorted(root.rglob("*Controller.java")):
    text = f.read_text()
    cm = re.search(r'@RequestMapping\(([^)]*)\)\s*(?:@\w+(?:\([^)]*\))?\s*)*public\s+(?:final\s+)?class', text)
    base = mapping_path(cm.group(1)) if cm else ""
    class_guard = None
    head = text[: text.find(" class ")]
    if "@MembershipOnly" in head:
        class_guard = "MEMBERSHIP_ONLY"
    for m in re.finditer(r'@(Get|Post|Put|Patch|Delete)Mapping(?:\(([^)]*)\))?', text):
        start = m.start()
        # annotations block: from previous method end (';' or '}') to the method signature
        block_start = max(text.rfind("}", 0, start), text.rfind(";", 0, start))
        block_end = text.find("(", text.find("public", m.end()))
        block = text[block_start:block_end]
        perm = re.search(r'@RequiresPermission\(\s*resource\s*=\s*"([^"]+)"\s*,\s*action\s*=\s*"([^"]+)"(?:\s*,\s*target\s*=\s*PermissionTargetMode\.(\w+))?', block)
        guard = None
        if perm:
            guard = {"key": f"{perm.group(1)}:{perm.group(2)}", "target": perm.group(3) or "DEFAULT"}
        elif "@MembershipOnly" in block or class_guard:
            guard = "MEMBERSHIP_ONLY"
        elif "@CookieRoute" in block:
            guard = "COOKIE_ROUTE"
        elif "@PublicRoute" in block or "/public/" in base:
            guard = "PUBLIC"
        else:
            guard = "OTHER"
        path = (base + mapping_path(m.group(2))).replace("//", "/")
        signature_start = text.find("public", m.end())
        signature = text[signature_start: text.find("{", signature_start)]
        body = "json" if "@RequestBody" in signature else ("multipart" if ("MultipartFile" in signature or "@RequestPart" in signature or "MULTIPART" in (m.group(2) or "")) else None)
        query = []
        for q in re.finditer(r'@RequestParam(?:\(([^)]*)\))?\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:final\s+)?[\w.<>?, ]+?\s+(\w+)\s*[,)]', signature):
            args, variable = q.group(1) or "", q.group(2)
            named = re.search(r'(?:name|value)\s*=\s*("[^"]*"|[\w.]+)', args)
            positional = re.match(r'\s*("[^"]*"|[A-Z_][\w.]*)\s*(?:,|$)', args)
            token = named.group(1) if named else (positional.group(1) if positional else None)
            name = resolve(token) if token else variable
            required = "required = false" not in args and "defaultValue" not in args
            query.append({"name": name, "required": required})
        routes.append({"controller": f.stem, "method": m.group(1).upper(), "path": path, "guard": guard, "body": body,
                       "scopes": "Scopes " in signature, "query": query})

json.dump(routes, open(sys.argv[2], "w"), indent=1)
print(len(routes), "routes;", sum(1 for r in routes if isinstance(r["guard"], dict)), "with a permission key;",
      sum(1 for r in routes if r["guard"] == "MEMBERSHIP_ONLY"), "membership-only;",
      [ (r["controller"], r["method"], r["path"]) for r in routes if r["guard"] == "OTHER"][:40])
