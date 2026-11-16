"""apartment_pages.py 시험 (D-113): 숫자만 공개 · 조건 밖 페이지 지우기 · sitemap 의 /a/ 항목만 바꾸기"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import apartment_pages as ap  # noqa: E402

PLACES = [{"name": f"가게{i}", "category": "한식", "walk": 3 + i, "tried": 9 - i, "up": 7 - i, "tags": ["양많음", "가족외식"] if i == 0 else []} for i in range(4)]


class T(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        ap.ROOT = self.tmp
        os.makedirs(os.path.join(self.tmp, "idx"))
        json.dump({"regions": [{"c": "2826000", "s": "인천", "g": "서해구"}]}, open(os.path.join(self.tmp, "idx", "manifest.json"), "w"))
        open(os.path.join(self.tmp, "sitemap.xml"), "w").write(
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            '  <url><loc>https://kiwoot.com/</loc></url>\n  <url><loc>https://kiwoot.com/a/old/</loc><lastmod>2026-01-01</lastmod></url>\n</urlset>\n')
        os.makedirs(os.path.join(self.tmp, "a", "old"))
        self.doc = {"id": "c1", "v": 1, "name": "햇살마을", "regionId": "2826000", "lat": 37.5, "lng": 126.7, "updatedAt": 1_763_240_400_000, "places": PLACES}

    def test_firestore_values(self):
        v = {"mapValue": {"fields": {"n": {"stringValue": "a"}, "k": {"integerValue": "3"}, "x": {"arrayValue": {"values": [{"doubleValue": 1.5}]}}}}}
        self.assertEqual(ap.decode(v), {"n": "a", "k": 3, "x": [1.5]})

    def test_page_shows_numbers_only(self):
        n = ap.build([self.doc])
        self.assertEqual(n, 1)
        html = open(os.path.join(self.tmp, "a", "c1", "index.html"), encoding="utf-8").read()
        self.assertIn("햇살마을 이웃이 많이 간 맛집", html)
        self.assertIn("인천 서해구", html)
        self.assertIn("먹어봤어요 <b>9</b> · 추천 <b>7</b>", html)
        self.assertIn("#가족 외식", html)
        self.assertIn("https://kiwoot.com/i/?a=c1&amp;n=", html)
        self.assertIn('"@type": "ItemList"', html)
        for banned in ("별로", "uid", "닉네임"):
            self.assertNotIn(banned, html.split("<main>")[1].split("누가 남겼는지")[0], banned)

    def test_stale_pages_removed_and_sitemap_updated(self):
        ap.build([self.doc])
        self.assertFalse(os.path.isdir(os.path.join(self.tmp, "a", "old")))
        xml = open(os.path.join(self.tmp, "sitemap.xml"), encoding="utf-8").read()
        self.assertNotIn("/a/old/", xml)
        self.assertIn("<loc>https://kiwoot.com/a/c1/</loc>", xml)
        self.assertIn("<loc>https://kiwoot.com/</loc>", xml)
        ap.build([])                                               # 모두 조건 밖 → 페이지·항목 없음
        xml = open(os.path.join(self.tmp, "sitemap.xml"), encoding="utf-8").read()
        self.assertNotIn("/a/", xml)
        self.assertFalse(os.path.isdir(os.path.join(self.tmp, "a", "c1")))

    def test_bad_docs_skipped(self):
        bad = [dict(self.doc, id="../x"), dict(self.doc, id="c2", places=PLACES[:2]), dict(self.doc, id="c3", name="")]
        self.assertEqual(ap.build(bad), 0)

    def test_escapes_html(self):
        d = dict(self.doc, name='<b>아파트</b>', places=[dict(p, name='<script>') for p in PLACES])
        ap.build([d])
        html = open(os.path.join(self.tmp, "a", "c1", "index.html"), encoding="utf-8").read()
        self.assertNotIn("<script>", html.replace('<script type="application/ld+json">', ""))


if __name__ == "__main__":
    unittest.main()
