"""아파트별 공개 맛집 페이지 만들기 (D-113) — kiwoot.com/a/{아파트 id}/ · 전국 목록 kiwoot.com/a/

알림 서버가 매주 월요일 새벽 Firestore `publicPages` 에 아파트별 숫자만 쓴다(누구나 읽기 · 서버만 쓰기).
이 스크립트는 그 칸을 **키 없이** 읽어 HTML 과 sitemap.xml 의 /a/ 항목을 다시 만든다. 사람·uid·리뷰 글·별로 수는 처음부터 없다.
GitHub Actions(.github/workflows/apartment-pages.yml)가 월요일 아침에 돌린다. 표준 라이브러리만 쓴다.

사용: python3 scripts/apartment_pages.py [--json 로컬파일.json]   (--json 은 시험용: Firestore REST 응답 대신)
"""
from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

PROJECT = "kiwoot"
API = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/publicPages?pageSize=300"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://kiwoot.com"
INVITE = "https://kiwoot.com/i/"
KST = timezone(timedelta(hours=9))
NEAR_KM = 5.0
TAG_KO = {"아이랑": "아이랑", "혼밥": "혼밥", "야식": "야식", "양많음": "양많음", "주차가능": "주차가능", "포장맛집": "포장맛집",
          "단체석": "단체석", "가성비": "가성비", "조용함": "조용함", "유아의자": "유아의자 있어요", "유모차": "유모차 들어가요",
          "가족외식": "가족 외식", "배달빠름": "배달이 빨라요"}
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def decode(v: dict):
    """Firestore REST 값 → 파이썬 값"""
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return float(v["doubleValue"])
    if "booleanValue" in v: return v["booleanValue"]
    if "nullValue" in v: return None
    if "arrayValue" in v: return [decode(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v: return {k: decode(x) for k, x in v["mapValue"].get("fields", {}).items()}
    return None


def fetch() -> list[dict]:
    out, token = [], None
    while True:
        url = API + (f"&pageToken={urllib.parse.quote(token)}" if token else "")
        with urllib.request.urlopen(url, timeout=30) as r:
            data = json.load(r)
        for d in data.get("documents", []):
            doc = {k: decode(v) for k, v in d.get("fields", {}).items()}
            doc["id"] = d["name"].rsplit("/", 1)[-1]
            out.append(doc)
        token = data.get("nextPageToken")
        if not token:
            return out


def valid(doc: dict) -> bool:
    return bool(ID_RE.match(str(doc.get("id", "")))) and isinstance(doc.get("name"), str) and doc["name"] \
        and isinstance(doc.get("places"), list) and len(doc["places"]) >= 3


def regions() -> dict[str, str]:
    try:
        m = json.load(open(os.path.join(ROOT, "idx", "manifest.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {r["c"]: (f'{r["s"]} {r["g"]}' if r.get("g") else r.get("s", "")) for r in m.get("regions", []) if r.get("c")}


def km(a: dict, b: dict) -> float:
    if not all(isinstance(x.get(k), (int, float)) for x in (a, b) for k in ("lat", "lng")):
        return math.inf
    dy = (a["lat"] - b["lat"]) * 111.0
    dx = (a["lng"] - b["lng"]) * 111.0 * math.cos(math.radians(a["lat"]))
    return math.hypot(dx, dy)


def kst_date(ms) -> str:
    try:
        d = datetime.fromtimestamp(int(ms) / 1000, KST)
    except (TypeError, ValueError, OverflowError, OSError):
        d = datetime.now(KST)
    return f"{d.year}년 {d.month}월 {d.day}일", d.strftime("%Y-%m-%d")


def invite(doc: dict) -> str:
    return INVITE + "?a=" + doc["id"] + "&n=" + urllib.parse.quote(doc["name"][:30], safe="")


HEAD_STYLE = """<style>
@font-face{font-family:"Jua";src:url(/fonts/jua-korean.woff2) format("woff2");font-display:swap}
h1,h2,.name,.cta,.rank{font-family:"Jua",sans-serif;font-weight:400}
h1{font-size:26px;line-height:1.3}
.sub{margin:4px 0 0;color:var(--muted);font-size:14px}
.list{list-style:none;padding:0;margin:16px 0}
.place{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;margin:10px 0}
.rank{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--line);color:var(--ink)}
.place:first-child .rank{background:var(--accent);color:#fff}
.name{font-size:19px;line-height:1.3}
.meta{color:var(--muted);font-size:14px}
.count{font-size:15px;margin-top:2px}
.count b{font-family:"Jua",sans-serif;font-weight:400}
.tags{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}
.tags span{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:1px 10px;color:var(--muted)}
.cta{display:block;text-align:center;margin:20px 0 6px;padding:14px 22px;border-radius:14px;background:var(--accent);color:#fff;text-decoration:none;font-size:18px}
.note{font-size:13px;color:var(--muted)}
.near a{display:inline-block;margin:4px 12px 4px 0}
</style>"""


def head(title: str, desc: str, url: str, extra: str = "") -> str:
    t, d, u = html.escape(title), html.escape(desc), html.escape(url)
    return (f'<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<title>{t}</title>\n<meta name="description" content="{d}">\n'
            f'<link rel="canonical" href="{u}"><link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.ico" sizes="48x48">\n'
            f'<meta property="og:type" content="website"><meta property="og:site_name" content="기웃기웃"><meta property="og:locale" content="ko_KR">\n'
            f'<meta property="og:title" content="{t}"><meta property="og:description" content="{d}">\n'
            f'<meta property="og:url" content="{u}"><meta property="og:image" content="https://kiwoot.com/img/og.jpg?v=2">\n'
            f'{HEAD_STYLE}{extra}\n</head>\n')


def page(doc: dict, region: dict[str, str], near: list[dict]) -> str:
    name = doc["name"]
    area = region.get(str(doc.get("regionId", "")), "")
    when, iso = kst_date(doc.get("updatedAt"))
    places = doc["places"][:10]
    url = f"{SITE}/a/{doc['id']}/"
    top3 = "·".join(p["name"] for p in places[:3])
    desc = f"{name} 이웃이 실제로 먹어보고 추천한 동네 가게 TOP {len(places)}. {top3} — 기웃기웃 이웃 기록으로 정해요."
    ld = {"@context": "https://schema.org", "@type": "ItemList", "name": f"{name} 이웃 맛집", "itemListOrder": "https://schema.org/ItemListOrderDescending",
          "numberOfItems": len(places),
          "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": p["name"]} for i, p in enumerate(places)]}
    extra = '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False).replace("<", "\\u003c") + "</script>"
    e = html.escape
    rows = []
    for i, p in enumerate(places):
        meta = e(str(p.get("category") or "기타")) + (f" · 걸어서 {int(p['walk'])}분" if isinstance(p.get("walk"), (int, float)) else "")
        tags = "".join(f"<span>#{e(TAG_KO.get(t, t))}</span>" for t in (p.get("tags") or [])[:2] if isinstance(t, str))
        rows.append(f'<li class="place"><div class="rank">{i + 1}</div><div><div class="name">{e(p["name"])}</div>'
                    f'<div class="meta">{meta}</div><div class="count">먹어봤어요 <b>{int(p.get("tried", 0))}</b> · 추천 <b>{int(p.get("up", 0))}</b></div>'
                    + (f'<div class="tags">{tags}</div>' if tags else "") + "</div></li>")
    near_html = ""
    if near:
        near_html = '<h2>근처 아파트 맛집</h2>\n<p class="near">' + "".join(f'<a href="/a/{n["id"]}/">{e(n["name"])}</a>' for n in near) + "</p>\n"
    sub = " · ".join(x for x in (e(area), f"{when} 기준") if x)
    return (head(f"{name} 이웃 맛집 TOP — 이웃이 많이 간 동네 가게 | 기웃기웃", desc, url, extra) +
            f'<body><main>\n<header><div class="dot">기</div><div><h1>{e(name)} 이웃이 많이 간 맛집</h1><p class="sub">{sub}</p></div></header>\n'
            f'<p>{e(name)}에 사는 이웃이 기웃기웃에 남긴 <b>먹어봤어요</b>로 정한 동네 가게 순위예요. 이웃 3명 이상이 평가한 가게만 보여요.</p>\n'
            f'<ol class="list">\n' + "\n".join(rows) + '\n</ol>\n'
            f'<a class="cta" href="{e(invite(doc))}">{e(name)} 이웃 리뷰 보러 가기</a>\n'
            '<p class="note" style="text-align:center">앱을 받으면 이 아파트가 미리 골라져 있어요</p>\n'
            + near_html +
            '<p class="note">누가 남겼는지·리뷰 글·사진은 공개하지 않아요. 순위는 매주 새로 정해요. 이 페이지를 원하지 않는 아파트는 hello@kiwoot.com 으로 알려 주세요.</p>\n'
            '<nav class="muted"><a href="/">기웃기웃</a> · <a href="/a/">전국 아파트 맛집</a> · <a href="/privacy">개인정보처리방침</a></nav>\n</main></body></html>\n')


def index_page(docs: list[dict], region: dict[str, str]) -> str:
    e = html.escape
    by_area: dict[str, list[dict]] = {}
    for d in docs:
        by_area.setdefault(region.get(str(d.get("regionId", "")), "") or "그 밖", []).append(d)
    body = []
    for area in sorted(by_area, key=lambda a: (a == "그 밖", a)):
        items = "".join(f'<li><a href="/a/{d["id"]}/">{e(d["name"])}</a></li>' for d in sorted(by_area[area], key=lambda d: d["name"]))
        body.append(f'<div class="card"><h2>{e(area)}</h2><ul>{items}</ul></div>')
    desc = f"기웃기웃 이웃이 먹어보고 추천한 동네 가게를 아파트별로 모았어요. 지금 {len(docs)}개 아파트."
    return (head("아파트별 이웃 맛집 | 기웃기웃", desc, f"{SITE}/a/") +
            '<body><main>\n<header><div class="dot">기</div><h1>아파트별 이웃 맛집</h1></header>\n'
            '<p>같은 아파트 이웃이 실제로 먹어보고 추천한 동네 가게 순위예요. 이웃 기록이 쌓인 아파트만 보여요.</p>\n'
            + ("\n".join(body) if body else '<p class="muted">아직 공개된 아파트가 없어요.</p>') +
            '\n<nav class="muted"><a href="/">기웃기웃</a> · <a href="/regions">지역별 안내</a> · <a href="/privacy">개인정보처리방침</a></nav>\n</main></body></html>\n')


def write_sitemap(docs: list[dict]):
    path = os.path.join(ROOT, "sitemap.xml")
    xml = open(path, encoding="utf-8").read()
    xml = re.sub(r"\s*<url><loc>https://kiwoot\.com/a/[^<]*</loc>(?:<lastmod>[^<]*</lastmod>)?</url>", "", xml)
    add = []
    if docs:
        add.append(f"  <url><loc>{SITE}/a/</loc><lastmod>{max(kst_date(d.get('updatedAt'))[1] for d in docs)}</lastmod></url>")
    for d in sorted(docs, key=lambda d: d["id"]):
        add.append(f"  <url><loc>{SITE}/a/{d['id']}/</loc><lastmod>{kst_date(d.get('updatedAt'))[1]}</lastmod></url>")
    xml = xml.replace("</urlset>", ("\n".join(add) + "\n" if add else "") + "</urlset>")
    open(path, "w", encoding="utf-8").write(xml)


def build(docs: list[dict]) -> int:
    docs = [d for d in docs if valid(d)]
    region = regions()
    out = os.path.join(ROOT, "a")
    keep = {d["id"] for d in docs}
    if os.path.isdir(out):
        for name in os.listdir(out):                       # 조건 밖이 되었거나 빼 달라고 한 아파트의 옛 페이지 지우기
            p = os.path.join(out, name)
            if os.path.isdir(p) and name not in keep:
                shutil.rmtree(p)
    os.makedirs(out, exist_ok=True)
    for d in docs:
        near = sorted((x for x in docs if x["id"] != d["id"] and km(d, x) <= NEAR_KM), key=lambda x: km(d, x))[:5]
        os.makedirs(os.path.join(out, d["id"]), exist_ok=True)
        open(os.path.join(out, d["id"], "index.html"), "w", encoding="utf-8").write(page(d, region, near))
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(index_page(docs, region))
    write_sitemap(docs)
    return len(docs)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="시험용: 문서 목록 JSON 파일 (Firestore 대신)")
    a = ap.parse_args()
    docs = json.load(open(a.json, encoding="utf-8")) if a.json else fetch()
    n = build(docs)
    print(f"아파트 페이지 {n}곳")
    return 0


if __name__ == "__main__":
    sys.exit(main())
