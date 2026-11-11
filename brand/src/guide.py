"""Builds brand/brand-guide.html — the one-page IccheGhuri brand guide. Run after build.py."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COLOURS = [  # name, hex, role, text colour on the swatch
    ("Ghuri Orange", "#F97316", "Primary. The kite, buttons, highlights.", "#1C1917"),
    ("Ember", "#EA580C", "Shadow panel of the kite. Hover and pressed states.", "#FFFFFF"),
    ("Deep Ember", "#C2410C", "Orange for small text and links on light backgrounds.", "#FFFFFF"),
    ("Apricot", "#FB923C", "Lit panel of the kite. Charts, illustrations.", "#1C1917"),
    ("Peach", "#FDBA74", "Brightest panel. Soft fills and borders.", "#1C1917"),
    ("Paper", "#FFF7ED", "Warm page background. Tinted cards.", "#1C1917"),
    ("Ink", "#1C1917", "Wordmark, headings, body text. Dark surfaces.", "#FFFFFF"),
    ("Akash Blue", "#0369A1", "Accent: the sky behind the kite. Info states, secondary links.", "#FFFFFF"),
]


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def lum(h):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def cmyk(h):  # naive conversion: a starting point for a printer, not a colour-managed value
    r, g, b = (v / 255 for v in rgb(h))
    k = 1 - max(r, g, b)
    if k == 1:
        return "0 / 0 / 0 / 100"
    return " / ".join(str(round(100 * (1 - v - k) / (1 - k))) for v in (r, g, b)) + f" / {round(100 * k)}"


def swatches():
    out = []
    for name, hx, role, fg in COLOURS:
        r, g, b = rgb(hx)
        border = "border:1px solid #F0E4D4;" if hx == "#FFF7ED" else ""
        out.append(f'<div class="sw"><div class="chip" style="background:{hx};color:{fg};{border}"><b>{name}</b><span>{hx}</span></div>'
                   f'<p>{role}</p><small>RGB {r} {g} {b} · CMYK ≈ {cmyk(hx)}</small></div>')
    return "".join(out)


def contrast_rows():
    pairs = [("Ink", "#1C1917", "White", "#FFFFFF"), ("Ink", "#1C1917", "Paper", "#FFF7ED"), ("Ink", "#1C1917", "Ghuri Orange", "#F97316"),
             ("Deep Ember", "#C2410C", "White", "#FFFFFF"), ("Akash Blue", "#0369A1", "White", "#FFFFFF"),
             ("White", "#FFFFFF", "Ember", "#EA580C"), ("White", "#FFFFFF", "Ghuri Orange", "#F97316"), ("Ghuri Orange", "#F97316", "White", "#FFFFFF")]
    rows = []
    for fn, fh, bn, bh in pairs:
        c = contrast(fh, bh)
        verdict = "Body text" if c >= 4.5 else ("Large text and icons only" if c >= 3 else "Decoration only, never text")
        rows.append(f'<tr><td><span class="pair" style="color:{fh};background:{bh}">Aa</span></td><td>{fn} on {bn}</td><td>{c:.1f} : 1</td><td>{verdict}</td></tr>')
    return "".join(rows)


L = "logo/iccheghuri-"
HTML = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>IccheGhuri brand guide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--ink:#1C1917;--paper:#FFF7ED;--orange:#F97316;--ember:#EA580C;--deep:#C2410C;--apricot:#FB923C;--peach:#FDBA74;--line:#F0E4D4;--muted:#6B625B}}
*{{box-sizing:border-box}} body{{margin:0;background:#fff;color:var(--ink);font:16px/1.6 Inter,"Noto Sans Bengali",system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
h1,h2,h3,.display{{font-family:Inter,"Noto Sans Bengali",sans-serif;line-height:1.1;margin:0;letter-spacing:-.025em}}
section{{padding:72px max(24px,calc((100vw - 1160px)/2))}} section+section{{border-top:1px solid var(--line)}}
.eyebrow{{font:600 13px/1 Inter,sans-serif;color:var(--deep);margin-bottom:14px}} h2{{font-size:44px;font-weight:700;margin-bottom:12px}}
.lede{{max-width:62ch;color:var(--muted);margin:0 0 36px}}
.cover{{background:var(--paper);padding-top:96px;padding-bottom:96px;position:relative;overflow:hidden}}
.cover img.logo{{width:min(720px,100%);display:block}} .cover h1{{font-size:64px;font-weight:800;margin:44px 0 10px;max-width:11ch}}
.cover .bn{{font-size:30px;font-weight:600;color:var(--deep)}} .cover p{{max-width:56ch;color:var(--muted)}}
.cover .sky{{position:absolute;right:-60px;top:-40px;width:520px;opacity:.9;transform:rotate(8deg)}}
.grid{{display:grid;gap:20px}} .g3{{grid-template-columns:repeat(3,1fr)}} .g2{{grid-template-columns:repeat(2,1fr)}} .g4{{grid-template-columns:repeat(4,1fr)}}
.card{{border:1px solid var(--line);border-radius:20px;padding:28px;background:#fff;display:flex;flex-direction:column;gap:14px;min-width:0}}
.stage{{border-radius:14px;min-height:190px;display:grid;place-items:center;padding:26px;background:var(--paper)}}
.stage img{{max-width:100%;max-height:150px}} .stage.ink{{background:var(--ink)}} .stage.orange{{background:var(--orange)}} .stage.white{{background:#fff;border:1px solid var(--line)}}
.card b{{font-weight:600}} .card p{{margin:0;color:var(--muted);font-size:14px}} code{{font:500 12.5px ui-monospace,Consolas,monospace;color:var(--deep)}}
.idea{{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center}} .idea ol{{margin:0;padding:0;list-style:none;display:grid;gap:22px}}
.idea li{{display:grid;grid-template-columns:44px 1fr;gap:16px}} .idea li i{{font:700 22px Inter;font-style:normal;width:44px;height:44px;border-radius:12px;background:var(--paper);color:var(--deep);display:grid;place-items:center}}
.idea li b{{display:block}} .idea li span{{color:var(--muted);font-size:15px}}
.clear{{position:relative;display:inline-block;padding:var(--u);background:repeating-linear-gradient(45deg,#FFEDD5 0 6px,#FFF7ED 6px 12px);border:1px dashed var(--apricot);border-radius:8px;--u:42px}}
.clear img{{display:block;height:calc(var(--u)*2.74);background:#fff}} .clear span{{position:absolute;font:600 12px Inter;color:var(--deep)}}
table{{border-collapse:collapse;width:100%;font-size:14.5px}} th,td{{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line)}} th{{font-weight:600;color:var(--muted);font-size:13px}}
.sw .chip{{border-radius:16px;height:128px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end}} .sw .chip b{{font:700 19px Inter}} .sw .chip span{{font:500 13px ui-monospace,Consolas,monospace}}
.sw p{{margin:10px 0 2px;font-size:14px}} .sw small{{color:var(--muted);font-size:12px}}
.pair{{display:inline-grid;place-items:center;width:52px;height:36px;border-radius:8px;font-weight:600;border:1px solid var(--line)}}
.spec{{display:grid;grid-template-columns:230px 1fr;gap:28px;padding:26px 0;border-top:1px solid var(--line);align-items:baseline}}
.spec small{{color:var(--muted);display:block;font-size:13px}} .spec .d1{{font:800 56px/1.05 Inter,"Noto Sans Bengali";letter-spacing:-.03em}} .spec .d2{{font:650 30px/1.2 Inter,"Noto Sans Bengali";letter-spacing:-.02em}}
.spec .b1{{font-size:17px;max-width:60ch}} .spec .bn{{font-family:"Noto Sans Bengali",sans-serif}}
.pattern{{height:260px;border-radius:20px;background:var(--orange) url("{L}symbol-small.svg") 0 0/92px 92px;position:relative;overflow:hidden}}
.pattern::after{{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(249,115,22,.94),rgba(249,115,22,.55))}}
.pattern.light{{background-color:var(--paper)}} .pattern.light::after{{background:linear-gradient(90deg,rgba(255,247,237,.9),rgba(255,247,237,.45))}}
.dont .stage{{min-height:150px;background:#fff;border:1px solid var(--line)}} .dont .stage img{{max-height:64px}} .dont b::before{{content:"✕  ";color:#B91C1C}}
.icons{{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}} .icons figure{{margin:0;text-align:center;font-size:12px;color:var(--muted)}} .icons img{{display:block;margin:0 auto 8px}}
footer{{padding:40px max(24px,calc((100vw - 1160px)/2));color:var(--muted);font-size:13px;border-top:1px solid var(--line)}}
@media (max-width:860px){{.g3,.g4,.g2,.idea,.spec{{grid-template-columns:1fr}} h2{{font-size:34px}} .cover h1{{font-size:44px}} .cover .sky{{display:none}} section{{padding:48px 16px}}}}
</style></head><body>

<section class="cover">
  <img class="sky" src="{L}symbol.svg" alt="">
  <img class="logo" src="{L}horizontal.svg" alt="IccheGhuri logo">
  <h1>Let your wishes take flight.</h1>
  <p>Brand guide, version 1. The logo, colours and type for IccheGhuri, the AI learning platform for students in Bangladesh. The tagline above is a placeholder suggestion, not approved copy.</p>
</section>

<section>
  <div class="eyebrow">01 · The idea</div><h2>A wish, on a string.</h2>
  <p class="lede"><b>Icche</b> (ইচ্ছে) means wish and <b>ghuri</b> (ঘুড়ি) means kite. The logo is a paper kite caught mid-flight: something a student makes, launches and steers.</p>
  <div class="idea">
    <div class="stage" style="min-height:420px"><img src="{L}symbol.svg" alt="" style="max-height:340px"></div>
    <ol>
      <li><i>1</i><div><b>Four folded panels</b><span>The kite is folded paper, lit from the top-left. Four shades of one orange give it depth without gradients.</span></div></li>
      <li><i>2</i><div><b>Tilted 18°, flying</b><span>It leans into the wind. The tilt is fixed: the logo is never straightened or rotated further.</span></div></li>
      <li><i>3</i><div><b>The string</b><span>A gentle S from the tail tip. Someone is holding the other end: the student stays in control.</span></div></li>
      <li><i>4</i><div><b>Kites over the i's</b><span>The wordmark is custom-drawn in rounded lowercase. The dots of both i's are small kites at the same tilt.</span></div></li>
    </ol>
  </div>
</section>

<section>
  <div class="eyebrow">02 · Logo versions</div><h2>One logo, four arrangements.</h2>
  <p class="lede">Use the horizontal logo by default. Pick another version only when the space calls for it.</p>
  <div class="grid g2">
    <div class="card"><div class="stage white"><img src="{L}horizontal.svg" alt=""></div><b>Horizontal (primary)</b><p>Headers, documents, slides. <code>iccheghuri-horizontal.svg</code></p></div>
    <div class="card"><div class="stage white"><img src="{L}stacked.svg" alt="" style="max-height:170px"></div><b>Stacked</b><p>Square spaces, posters, splash screens. <code>iccheghuri-stacked.svg</code></p></div>
    <div class="card"><div class="stage"><img src="{L}symbol.svg" alt=""></div><b>Symbol</b><p>When the name is already present nearby. <code>iccheghuri-symbol.svg</code></p></div>
    <div class="card"><div class="stage"><img src="{L}wordmark.svg" alt="" style="max-height:84px"></div><b>Wordmark</b><p>Very wide, short spaces. <code>iccheghuri-wordmark.svg</code></p></div>
  </div>
  <div class="grid g3" style="margin-top:20px">
    <div class="card"><div class="stage ink"><img src="{L}horizontal-reversed.svg" alt=""></div><b>On dark</b><p>Kite stays orange, lettering and string turn white.</p></div>
    <div class="card"><div class="stage orange"><img src="logo/one-colour/iccheghuri-horizontal-white.svg" alt=""></div><b>White on orange</b><p>One-colour white. Never the orange kite on orange.</p></div>
    <div class="card"><div class="stage white"><img src="logo/one-colour/iccheghuri-horizontal-black.svg" alt=""></div><b>One colour</b><p>Black, for stamps, fax, engraving, single-ink print.</p></div>
  </div>
</section>

<section>
  <div class="eyebrow">03 · Space and size</div><h2>Give it room.</h2>
  <p class="lede">Clear space is one <b>x</b> on every side, where x is the height of the lowercase letters in the wordmark. It scales with the logo.</p>
  <div class="grid g2" style="align-items:start">
    <div><div class="clear"><img src="{L}horizontal.svg" alt=""><span style="left:6px;top:12px">x</span><span style="right:10px;bottom:10px">x</span></div></div>
    <table>
      <tr><th>Version</th><th>Smallest on screen</th><th>Smallest in print</th></tr>
      <tr><td>Horizontal</td><td>120 px wide</td><td>30 mm wide</td></tr>
      <tr><td>Stacked</td><td>88 px wide</td><td>22 mm wide</td></tr>
      <tr><td>Symbol with string</td><td>48 px</td><td>12 mm</td></tr>
      <tr><td>Symbol, small cut (no string)</td><td>20 px</td><td>6 mm</td></tr>
      <tr><td>Favicon (two shades)</td><td>16 px</td><td>not for print</td></tr>
    </table>
  </div>
  <p style="color:var(--muted);font-size:14px;margin-top:22px">Minimum sizes are design recommendations. They have not been proofed on paper yet.</p>
</section>

<section>
  <div class="eyebrow">04 · Colour</div><h2>One orange, in four lights.</h2>
  <p class="lede">The palette comes from the kite's own panels, plus ink, paper and one cool accent taken from the sky behind it.</p>
  <div class="grid g4">{swatches()}</div>
  <h3 style="font-size:24px;margin:44px 0 12px">Contrast</h3>
  <table><tr><th></th><th>Pair</th><th>Contrast ratio</th><th>Use for</th></tr>{contrast_rows()}</table>
  <p style="color:var(--muted);font-size:14px;margin-top:18px">Ghuri Orange is too light for text on white. For orange text or links, use Deep Ember. CMYK values are a plain conversion for a first print proof, and no Pantone match has been chosen.</p>
</section>

<section>
  <div class="eyebrow">05 · Typography</div><h2>The logo is drawn. Everything else is Inter.</h2>
  <p class="lede">The wordmark is custom lettering with kites over the i's. It is never typed: always place the logo file. All other text uses Inter, a free, open-source family built for screens. Bangla text uses Noto Sans Bengali.</p>
  <div class="spec"><div><b>Custom wordmark</b><small>Logo only · outlined artwork</small></div><div><img src="{L}wordmark.svg" alt="" style="height:64px"></div></div>
  <div class="spec"><div><b>Inter 800</b><small>Display and page titles</small></div><div class="d1">Learn anything. Fly further.</div></div>
  <div class="spec"><div><b>Inter 600–700</b><small>Headings, buttons, numbers</small></div><div class="d2">Assessment · Roadmap · AI Tutor · 72%</div></div>
  <div class="spec"><div><b>Inter 400</b><small>Body and interface<br>SIL Open Font License</small></div><div class="b1">Your roadmap adapts as you learn. Finish a lesson, take a short check, and the next step is chosen from what you got right and what still needs practice.</div></div>
  <table style="margin-top:8px"><tr><th>Style</th><th>Family</th><th>Size / line height</th><th>Weight</th><th>Tracking</th></tr>
    <tr><td>Display</td><td>Inter</td><td>60 / 64</td><td>800</td><td>−3%</td></tr><tr><td>Page title</td><td>Inter</td><td>36 / 42</td><td>700</td><td>−2.5%</td></tr>
    <tr><td>Section heading</td><td>Inter</td><td>24 / 30</td><td>600</td><td>−1.5%</td></tr><tr><td>Body</td><td>Inter</td><td>16 / 26</td><td>400</td><td>0</td></tr>
    <tr><td>Small, captions</td><td>Inter</td><td>13 / 20</td><td>500</td><td>0</td></tr></table>
</section>

<section>
  <div class="eyebrow">06 · Icons and pattern</div><h2>Small sizes, big surfaces.</h2>
  <p class="lede">Below 48 px the string is dropped. At 16 px the kite uses two shades, split along its spine. For large surfaces, the small kite repeats as a pattern.</p>
  <div class="icons" style="margin-bottom:36px">
    <figure><img src="{L}app-icon.svg" width="128" alt="">App icon</figure><figure><img src="{L}app-icon-light.svg" width="128" alt="">App icon, light</figure>
    <figure><img src="{L}symbol-small.svg" width="64" alt="">64 px</figure><figure><img src="{L}symbol-small.svg" width="32" alt="">32 px</figure>
    <figure><img src="{L}favicon.svg" width="32" alt="">favicon 32</figure><figure><img src="{L}favicon.svg" width="16" alt="">favicon 16</figure>
  </div>
  <div class="grid g2"><div class="pattern"></div><div class="pattern light"></div></div>
</section>

<section class="dont">
  <div class="eyebrow">07 · Keep it intact</div><h2>Six things that break it.</h2>
  <p class="lede">Always place the supplied files. Never rebuild the logo or type the name in a font.</p>
  <div class="grid g3">
    <div class="card"><div class="stage"><img src="{L}horizontal.svg" style="transform:scaleX(1.5)" alt=""></div><b>Stretch or squash it</b></div>
    <div class="card"><div class="stage"><img src="{L}horizontal.svg" style="transform:rotate(-12deg)" alt=""></div><b>Rotate it</b></div>
    <div class="card"><div class="stage"><img src="{L}horizontal.svg" style="filter:hue-rotate(200deg)" alt=""></div><b>Recolour the kite</b></div>
    <div class="card"><div class="stage"><img src="{L}horizontal.svg" style="filter:drop-shadow(5px 6px 3px rgba(0,0,0,.5))" alt=""></div><b>Add shadows or outlines</b></div>
    <div class="card"><div class="stage" style="background:#F97316"><img src="{L}horizontal.svg" alt=""></div><b>Put the orange kite on orange</b></div>
    <div class="card"><div class="stage"><span style="font:700 34px Arial;display:flex;align-items:center;gap:10px"><img src="{L}symbol.svg" style="height:56px" alt="">IccheGhuri</span></div><b>Type the name in another font</b></div>
  </div>
</section>

<footer>IccheGhuri brand guide v1 · masters in <code>brand/logo</code>, web icons in <code>brand/icons</code>, generator in <code>brand/src</code>. Trademark availability has not been checked.</footer>
</body></html>
"""
open(os.path.join(ROOT, "brand-guide.html"), "w", encoding="utf-8", newline="\n").write(HTML)
print("wrote brand-guide.html")
