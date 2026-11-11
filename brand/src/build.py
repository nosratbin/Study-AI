"""IccheGhuri brand kit — master artwork generator.

Everything is drawn as filled outlines (no live text, no strokes), so the SVGs are safe as masters.
Run:  python brand/src/build.py      (writes into brand/logo)
"""
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, "logo")
os.makedirs(LOGO, exist_ok=True)

INK, PAPER, WHITE = "#1C1917", "#FFF7ED", "#FFFFFF"
PEACH, APRICOT, ORANGE, EMBER = "#FDBA74", "#FB923C", "#F97316", "#EA580C"

f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
pt = lambda p: f"{f(p[0])} {f(p[1])}"


def save(name, body, w, h, title):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" role="img" '
         f'aria-labelledby="t"><title id="t">{title}</title>{body}</svg>\n')
    open(os.path.join(LOGO, name), "w", encoding="utf-8", newline="\n").write(s)


# ------------------------------------------------------------------ outline primitives (all clockwise on screen)
def capsule(p1, p2, w):
    """A straight stroke with round ends, as a filled outline."""
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    n = math.hypot(dx, dy)
    nx, ny, h = dy / n * w / 2, -dx / n * w / 2, w / 2
    a, b, c, d = (p1[0] + nx, p1[1] + ny), (p2[0] + nx, p2[1] + ny), (p2[0] - nx, p2[1] - ny), (p1[0] - nx, p1[1] - ny)
    return f"M{pt(a)} L{pt(b)} A{f(h)} {f(h)} 0 0 1 {pt(c)} L{pt(d)} A{f(h)} {f(h)} 0 0 1 {pt(a)} Z"


def band(c, R, a0, a1, w):
    """A circular-arc stroke (angles in degrees, clockwise on screen from +x, a1 > a0) with round ends."""
    P = lambda rad, ang: (c[0] + rad * math.cos(math.radians(ang)), c[1] + rad * math.sin(math.radians(ang)))
    ro, ri, h, big = R + w / 2, R - w / 2, w / 2, 1 if (a1 - a0) > 180 else 0
    return (f"M{pt(P(ro, a0))} A{f(ro)} {f(ro)} 0 {big} 1 {pt(P(ro, a1))} A{f(h)} {f(h)} 0 0 1 {pt(P(ri, a1))} "
            f"A{f(ri)} {f(ri)} 0 {big} 0 {pt(P(ri, a0))} A{f(h)} {f(h)} 0 0 1 {pt(P(ro, a0))} Z")


def ring(c, R, w):
    ro, ri = R + w / 2, R - w / 2
    x, y = c
    return (f"M{f(x - ro)} {f(y)} A{f(ro)} {f(ro)} 0 1 1 {f(x + ro)} {f(y)} A{f(ro)} {f(ro)} 0 1 1 {f(x - ro)} {f(y)} Z "
            f"M{f(x - ri)} {f(y)} A{f(ri)} {f(ri)} 0 1 0 {f(x + ri)} {f(y)} A{f(ri)} {f(ri)} 0 1 0 {f(x - ri)} {f(y)} Z")


def fillet(V, A, B, r):
    ua, ub = (A[0] - V[0], A[1] - V[1]), (B[0] - V[0], B[1] - V[1])
    la, lb = math.hypot(*ua), math.hypot(*ub)
    ua, ub = (ua[0] / la, ua[1] / la), (ub[0] / lb, ub[1] / lb)
    half = math.acos(max(-1, min(1, ua[0] * ub[0] + ua[1] * ub[1]))) / 2
    d, h = r / math.tan(half), r / math.sin(half)
    bis = (ua[0] + ub[0], ua[1] + ub[1])
    lb2 = math.hypot(*bis)
    return ((V[0] + ua[0] * d, V[1] + ua[1] * d), (V[0] + ub[0] * d, V[1] + ub[1] * d), (V[0] + bis[0] / lb2 * h, V[1] + bis[1] / lb2 * h))


def rounded_polygon(pts, r):
    """Clockwise polygon with every corner filleted."""
    n, out = len(pts), []
    for i, V in enumerate(pts):
        tin, tout, _ = fillet(V, pts[i - 1], pts[(i + 1) % n], r)
        out.append(("M" if i == 0 else "L") + pt(tin) + f" A{f(r)} {f(r)} 0 0 1 {pt(tout)}")
    return " ".join(out) + " Z"


def rot(p, c, deg):
    a = math.radians(deg)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


# ------------------------------------------------------------------ the kite
TILT, PIVOT = 18, (128, 118)
T, L, R, B, C = (128, 26), (62, 96), (194, 96), (128, 210), (128, 96)   # 132 wide, 184 tall, spars cross at 38 %


def kite(colors=(PEACH, APRICOT, ORANGE, EMBER), string=INK, r=9):
    """Returns (svg, bbox). Four folded panels lit from the top-left; an S-shaped string from the tail tip."""
    tL, tR, cT = fillet(T, L, R, r)
    lT, lB, cL = fillet(L, T, B, r)
    bL, bR, cB = fillet(B, L, R, r)
    top, bot = (128, cT[1] - r), (128, cB[1] + r)
    left = (cL[0] - math.sqrt(r * r - (C[1] - cL[1]) ** 2), C[1])       # where the cross spar meets the side corner
    m = lambda p: (256 - p[0], p[1])
    arc = lambda p, sweep: f"A{r} {r} 0 0 {sweep} {pt(p)}"
    sil = (f"M{pt(top)} {arc(tL, 0)} L{pt(lT)} {arc(lB, 0)} L{pt(bL)} {arc(bR, 0)} L{pt(m(lB))} {arc(m(lT), 0)} L{pt(m(tL))} {arc(top, 0)} Z")
    facets = [
        (f"M{pt(C)} L{pt(top)} {arc(tL, 0)} L{pt(lT)} {arc(left, 0)} Z", colors[0]),
        (f"M{pt(C)} L{pt(top)} {arc(m(tL), 1)} L{pt(m(lT))} {arc(m(left), 1)} Z", colors[1]),
        (f"M{pt(C)} L{pt(left)} {arc(lB, 0)} L{pt(bL)} {arc(bot, 0)} Z", colors[2]),
        (f"M{pt(C)} L{pt(m(left))} {arc(m(lB), 1)} L{pt(m(bL))} {arc(bot, 1)} Z", colors[3]),
    ]
    out, pts = f'<g transform="rotate({TILT} {PIVOT[0]} {PIVOT[1]})">', [T, L, R, B]
    if string:
        # S-curve from two half-circles of the same radius; starts exactly on the tail tip
        # two tangent arcs of one radius (each sweeping 2 x 50 deg) make a gentle S that starts exactly on the tail tip
        sr, sw, half, tip = 17, 6.5, 50, (128, bot[1] - 2)
        cs = lambda a: (math.cos(math.radians(a)), math.sin(math.radians(a)))
        c1 = (tip[0] - sr * cs(180 + half)[0], tip[1] - sr * cs(180 + half)[1])
        c2 = (c1[0] + 2 * sr * cs(180 - half)[0], c1[1] + 2 * sr * cs(180 - half)[1])
        d = band(c1, sr, 180 - half, 180 + half, sw) + " " + band(c2, sr, 360 - half, 360 + half, sw)
        out += f'<path id="string" d="{d}" fill="{string}"/>'
        end = (c2[0] + sr * cs(half)[0], c2[1] + sr * cs(half)[1])
        pts += [(c1[0] - sr - sw / 2, c1[1]), (c2[0] + sr + sw / 2, c2[1]), (end[0], end[1] + sw / 2)]
    if len(set(colors)) == 1:
        out += f'<path id="kite" d="{sil}" fill="{colors[0]}"/>'
    else:
        out += f'<path d="{sil}" fill="{colors[2]}"/>' + "".join(f'<path d="{d}" fill="{c}"/>' for d, c in facets)
    out += "</g>"
    rp = [rot(p, PIVOT, TILT) for p in pts]
    xs, ys = [p[0] for p in rp], [p[1] for p in rp]
    return out, (min(xs), min(ys), max(xs), max(ys))


def fit(art, bbox, box, pad=0.0, align="c"):
    """Scale + translate `art` so its bbox fits the box (x, y, w, h). Returns (svg, scale)."""
    x, y, w, h = box
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    k = min(w * (1 - 2 * pad) / bw, h * (1 - 2 * pad) / bh)
    tx = x + (w - bw * k) / 2 - bbox[0] * k
    ty = y + (h - bh * k) / 2 - bbox[1] * k
    return f'<g transform="translate({f(tx)} {f(ty)}) scale({f(k)})">{art}</g>', k


# ------------------------------------------------------------------ the wordmark (custom geometric rounded lowercase)
SW, XT, BASE, MID, BOWL, ARCH = 24, 80, 176, 128, 48, 40     # stroke, x-height line, baseline, bowl + arch radii
STRAIGHT, ROUND, OPEN = 15, 8, 2                                # side bearings by edge shape


def wordmark(color=INK, dot=ORANGE):
    """Returns (svg, width). y spans 16..246; x-height band 68..188."""
    d, dots, pen = [], [], 0.0

    def place(width, lb, rb):
        nonlocal pen
        x = pen + lb + SW / 2
        pen = x + width + SW / 2 + rb
        return x

    def i():
        x = place(0, STRAIGHT, STRAIGHT)
        d.append(capsule((x, XT), (x, BASE), SW))
        dots.append(x)

    def c():
        x = place(BOWL + BOWL * math.cos(math.radians(44)), ROUND, OPEN)
        d.append(band((x + BOWL, MID), BOWL, 44, 316, SW))

    def h():
        x = place(2 * ARCH, STRAIGHT, STRAIGHT)
        d.extend([capsule((x, 28), (x, BASE), SW), band((x + ARCH, XT + ARCH), ARCH, 180, 360, SW), capsule((x + 2 * ARCH, XT + ARCH), (x + 2 * ARCH, BASE), SW)])

    def e():
        x = place(2 * BOWL, ROUND, ROUND)
        d.extend([band((x + BOWL, MID), BOWL, 47, 360, SW), capsule((x, MID), (x + 2 * BOWL, MID), SW)])

    def g():
        x = place(2 * BOWL, ROUND, STRAIGHT)
        d.extend([ring((x + BOWL, MID), BOWL, SW), capsule((x + 2 * BOWL, XT), (x + 2 * BOWL, BASE + 10), SW), band((x + BOWL, BASE + 10), BOWL, 0, 128, SW)])

    def u():
        x = place(2 * ARCH, STRAIGHT, STRAIGHT)
        d.extend([capsule((x, XT), (x, BASE - ARCH), SW), band((x + ARCH, BASE - ARCH), ARCH, 0, 180, SW), capsule((x + 2 * ARCH, XT), (x + 2 * ARCH, BASE), SW)])

    def r():
        rr = 42
        x = place(rr + rr * math.cos(math.radians(284)), STRAIGHT, OPEN)
        d.extend([capsule((x, XT), (x, BASE), SW), band((x + rr, XT + rr), rr, 180, 284, SW)])

    for ch in "iccheghuri":
        {"i": i, "c": c, "h": h, "e": e, "g": g, "u": u, "r": r}[ch]()
    out = f'<path id="letters" d="{" ".join(d)}" fill="{color}"/>'
    # the dots of both i's are small kites, tilted like the symbol
    kd = []
    for x in dots:
        cx, cy = x + 2, 37
        pts = [rot(p, (cx, cy), TILT) for p in [(cx, cy - 22), (cx + 19, cy - 6), (cx, cy + 25), (cx - 19, cy - 6)]]
        kd.append(rounded_polygon(pts, 4))
    out += f'<path id="dots" d="{" ".join(kd)}" fill="{dot}"/>'
    return out, pen


# ------------------------------------------------------------------ files
def build():
    full, bb = kite()
    plain, pb = kite(string=None, r=11)                                  # small-size cut: no string, softer corners
    two, _ = kite(colors=(APRICOT, EMBER, APRICOT, EMBER), string=None, r=11)   # favicon: one fold, two shades
    white_k, _ = kite(colors=(WHITE,) * 4, string=None, r=11)
    full_rev, _ = kite(string=WHITE)
    wm, WW = wordmark()
    wm_rev, _ = wordmark(color=WHITE)

    sym, _ = fit(full, bb, (0, 0, 256, 256), pad=0.07)
    save("iccheghuri-symbol.svg", sym, 256, 256, "IccheGhuri symbol")
    sym_rev, _ = fit(full_rev, bb, (0, 0, 256, 256), pad=0.07)
    save("iccheghuri-symbol-reversed.svg", sym_rev, 256, 256, "IccheGhuri symbol, reversed")
    small, _ = fit(plain, pb, (0, 0, 256, 256), pad=0.06)
    save("iccheghuri-symbol-small.svg", small, 256, 256, "IccheGhuri symbol, small sizes")
    fav, _ = fit(two, pb, (0, 0, 256, 256), pad=0.03)
    save("iccheghuri-favicon.svg", fav, 256, 256, "IccheGhuri")
    tile = lambda art, bg: f'<rect width="256" height="256" rx="58" fill="{bg}"/>' + fit(art, pb, (0, 0, 256, 256), pad=0.2)[0]
    save("iccheghuri-app-icon.svg", tile(white_k, ORANGE), 256, 256, "IccheGhuri app icon")
    save("iccheghuri-app-icon-light.svg", tile(plain, PAPER), 256, 256, "IccheGhuri app icon, light")

    save("iccheghuri-wordmark.svg", f'<g transform="translate(16 0)">{wm}</g>', WW + 32, 262, "IccheGhuri wordmark")
    save("iccheghuri-wordmark-reversed.svg", f'<g transform="translate(16 0)">{wm_rev}</g>', WW + 32, 262, "IccheGhuri wordmark, reversed")

    # horizontal lockup: x-height of the wordmark (incl. stroke) = 1 unit (U).
    # The name carries recall, so the text leads: the kite (string included) is HS U tall, which makes its body about as
    # tall as the wordmark's ascender-to-descender span. Gap = GAP U. Files are cropped tight (PAD U safety margin);
    # the 1 U clear space is a usage rule in the guide, not baked into the artwork.
    HS, GAP, PAD = 2.5, 0.45, 0.12

    def horizontal(k_art, w_art, name, title):
        s = 0.58
        U = (BASE - XT + SW) * s
        Hs = HS * U
        pad, gap = PAD * U, GAP * U
        H = Hs + 2 * pad
        sy, ks = fit(k_art, bb, (pad, pad, Hs * (bb[2] - bb[0]) / (bb[3] - bb[1]), Hs))
        sw_ = Hs * (bb[2] - bb[0]) / (bb[3] - bb[1])
        # centre the x-height band on the kite body (slightly above the symbol's centre, the string hangs below)
        body_c = pad + (rot(C, PIVOT, TILT)[1] + 14 - bb[1]) * ks
        wx, wy = pad + sw_ + gap, body_c - MID * s
        top = min(pad, wy + 12 * s)                    # i-dot kites / h ascender may rise above the symbol
        bot = max(H - pad, wy + 248 * s)               # g descender may drop below the string
        if top < pad or bot > H - pad:
            sy = f'<g transform="translate(0 {f(pad - top)})">{sy}</g>'
            wy += pad - top
            H = (bot - top) + 2 * pad
        body = sy + f'<g transform="translate({f(wx)} {f(wy)}) scale({s})">{w_art}</g>'
        save(name, body, wx + WW * s + pad, H, title)
        return U

    U = horizontal(full, wm, "iccheghuri-horizontal.svg", "IccheGhuri logo")
    horizontal(full_rev, wm_rev, "iccheghuri-horizontal-reversed.svg", "IccheGhuri logo, reversed")

    def stacked(k_art, w_art, name, title):
        s = 0.5
        Wt = WW * s
        pad = PAD * (BASE - XT + SW) * s
        Hs = 205
        sw_ = Hs * (bb[2] - bb[0]) / (bb[3] - bb[1])
        W = Wt + 2 * pad
        sy, _ = fit(k_art, bb, ((W - sw_) / 2 + 6, pad, sw_, Hs))
        wy = pad + Hs + 6 - 16 * s
        body = sy + f'<g transform="translate({f(pad)} {f(wy)}) scale({s})">{w_art}</g>'
        save(name, body, W, wy + 250 * s + pad, title)

    stacked(full, wm, "iccheghuri-stacked.svg", "IccheGhuri logo, stacked")
    stacked(full_rev, wm_rev, "iccheghuri-stacked-reversed.svg", "IccheGhuri logo, stacked, reversed")
    print("built; wordmark width", round(WW), "unit", round(U, 1))


if __name__ == "__main__":
    build()
