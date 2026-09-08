#!/usr/bin/env python3
"""Verify the Meta (Facebook Page + Instagram Business) connection for the MoveWell store.

Reads credentials from .env only. Never prints, logs or writes a token anywhere.
Usage: python3 scripts/meta/meta_connect.py [--env PATH] [--no-status-file]
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DEFAULT_GRAPH_VERSION = "v23.0"

REQUIRED_PERMISSIONS = [
    ("pages_show_list", "قراءة قائمة الصفحات التي تديرها"),
    ("pages_read_engagement", "قراءة محتوى الصفحة وتفاعلها"),
    ("pages_manage_posts", "النشر على الصفحة"),
    ("instagram_basic", "قراءة حساب إنستغرام Business"),
    ("instagram_content_publish", "النشر على إنستغرام"),
    ("instagram_manage_insights", "إحصائيات إنستغرام"),
    ("business_management", "قراءة الـ Business Portfolio وربط الحسابات"),
]

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def read_env(path):
    """Parse a .env file into a dict. Blank values and comments are dropped."""
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, "r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and value:
                values[key] = value
    return values


def mask_secret(secret):
    """Render a secret as a non-reversible fingerprint safe to print."""
    if not secret:
        return "(فارغ)"
    if len(secret) <= 12:
        return "*" * len(secret) + " (طول %d)" % len(secret)
    return "%s…%s (طول %d)" % (secret[:4], secret[-4:], len(secret))


def graph_url(version, path, params=None):
    base = "https://graph.facebook.com/%s/%s" % (version, path.lstrip("/"))
    if params:
        return base + "?" + urllib.parse.urlencode(params)
    return base


def parse_graph_error(body):
    """Turn a Graph API error body into a short Arabic line."""
    try:
        payload = json.loads(body)
    except (ValueError, TypeError):
        return "رد غير مفهوم من Graph API"
    error = payload.get("error") or {}
    parts = [error.get("message", "خطأ غير معروف")]
    if error.get("code") is not None:
        parts.append("code=%s" % error["code"])
    if error.get("error_subcode"):
        parts.append("subcode=%s" % error["error_subcode"])
    if error.get("type"):
        parts.append("type=%s" % error["type"])
    return " · ".join(str(p) for p in parts)


def missing_permissions(granted, required=None):
    required = required or [name for name, _ in REQUIRED_PERMISSIONS]
    granted_set = set(granted or [])
    return [name for name in required if name not in granted_set]


def graph_get(version, path, token, params=None):
    """GET a Graph API node. The token travels in the Authorization header, never in the URL."""
    request = urllib.request.Request(graph_url(version, path, params))
    request.add_header("Authorization", "Bearer %s" % token)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8")), None
    except urllib.error.HTTPError as exc:
        return None, parse_graph_error(exc.read().decode("utf-8", "replace"))
    except urllib.error.URLError as exc:
        return None, "تعذّر الاتصال بـ Graph API: %s" % exc.reason


def collect(version, token):
    """Run every read-only check and return a plain report dict."""
    report = {"errors": [], "granted": [], "pages": [], "me": None}

    me, error = graph_get(version, "me", token, {"fields": "id,name"})
    if error:
        report["errors"].append("/me — %s" % error)
        return report
    report["me"] = me

    permissions, error = graph_get(version, "me/permissions", token)
    if error:
        report["errors"].append("/me/permissions — %s" % error)
    else:
        report["granted"] = [
            row["permission"]
            for row in permissions.get("data", [])
            if row.get("status") == "granted"
        ]

    fields = "id,name,link,tasks,instagram_business_account{id,username,name,followers_count,media_count}"
    accounts, error = graph_get(version, "me/accounts", token, {"fields": fields, "limit": 50})
    if error:
        report["errors"].append("/me/accounts — %s" % error)
    else:
        for page in accounts.get("data", []):
            instagram = page.get("instagram_business_account") or {}
            report["pages"].append({
                "id": page.get("id"),
                "name": page.get("name"),
                "link": page.get("link"),
                "tasks": page.get("tasks", []),
                "ig_id": instagram.get("id"),
                "ig_username": instagram.get("username"),
                "ig_followers": instagram.get("followers_count"),
                "ig_media": instagram.get("media_count"),
            })
    return report


def status_markdown(report, version, expected_page_id, expected_ig_id):
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# حالة اتصال Meta — MoveWell",
        "",
        "> يُولَّد آلياً بـ `python3 scripts/meta/meta_connect.py`. **لا يحتوي أي توكن.**",
        "",
        "- آخر فحص: %s" % stamp,
        "- إصدار Graph API: `%s`" % version,
    ]
    if report.get("me"):
        lines.append("- هوية التوكن: `%s` (id: `%s`)" % (report["me"].get("name", "?"), report["me"].get("id", "?")))

    lines += ["", "## الصفحات وحسابات إنستغرام", ""]
    if report["pages"]:
        lines += ["| الصفحة | Page ID | Instagram Business | IG ID |", "|---|---|---|---|"]
        for page in report["pages"]:
            lines.append("| %s | `%s` | %s | %s |" % (
                page["name"] or "?",
                page["id"] or "?",
                ("@" + page["ig_username"]) if page["ig_username"] else "❌ غير مربوط",
                ("`%s`" % page["ig_id"]) if page["ig_id"] else "—",
            ))
    else:
        lines.append("لا توجد صفحات مرئية لهذا التوكن.")

    missing = missing_permissions(report["granted"])
    lines += ["", "## الصلاحيات", ""]
    lines.append("- ممنوحة: %s" % (", ".join("`%s`" % p for p in report["granted"]) or "لا شيء"))
    lines.append("- ناقصة: %s" % (", ".join("`%s`" % p for p in missing) or "لا شيء ✅"))

    if expected_page_id or expected_ig_id:
        lines += ["", "## مطابقة `.env`", ""]
        page_ids = [p["id"] for p in report["pages"]]
        ig_ids = [p["ig_id"] for p in report["pages"] if p["ig_id"]]
        if expected_page_id:
            lines.append("- `META_PAGE_ID` %s" % ("✅ مطابق" if expected_page_id in page_ids else "❌ غير موجود ضمن صفحات هذا التوكن"))
        if expected_ig_id:
            lines.append("- `META_IG_BUSINESS_ID` %s" % ("✅ مطابق" if expected_ig_id in ig_ids else "❌ غير موجود ضمن حسابات إنستغرام المربوطة"))

    if report["errors"]:
        lines += ["", "## أخطاء", ""] + ["- %s" % e for e in report["errors"]]
    return "\n".join(lines) + "\n"


def main(argv=None):
    parser = argparse.ArgumentParser(description="فحص اتصال Meta (فيسبوك + إنستغرام) لمتجر MoveWell")
    parser.add_argument("--env", default=os.path.join(PROJECT_ROOT, ".env"))
    parser.add_argument("--no-status-file", action="store_true")
    args = parser.parse_args(argv)

    env = read_env(args.env)
    token = env.get("META_ACCESS_TOKEN") or os.environ.get("META_ACCESS_TOKEN")
    version = env.get("META_GRAPH_VERSION") or DEFAULT_GRAPH_VERSION

    if not token:
        print("❌ لا يوجد `META_ACCESS_TOKEN`.")
        print("   انسخ `.env.example` إلى `.env` واتبع `store/meta/CONNECT.md` لتوليد التوكن.")
        return 2

    print("التوكن المقروء من %s: %s" % (os.path.relpath(args.env, PROJECT_ROOT), mask_secret(token)))
    print("Graph API: %s\n" % version)

    report = collect(version, token)
    if report["errors"] and not report["me"]:
        for error in report["errors"]:
            print("❌ %s" % error)
        return 1

    print("✅ التوكن صالح — الهوية: %s (%s)\n" % (report["me"].get("name"), report["me"].get("id")))

    if not report["pages"]:
        print("⚠️  التوكن لا يرى أي صفحة. تأكد من صلاحية Full Control على الصفحة ومن `pages_show_list`.")
    for page in report["pages"]:
        print("📄 الصفحة: %s — Page ID: %s" % (page["name"], page["id"]))
        if page["ig_id"]:
            print("   📷 Instagram Business: @%s — IG ID: %s (%s متابع، %s منشور)" % (
                page["ig_username"], page["ig_id"],
                page["ig_followers"] if page["ig_followers"] is not None else "?",
                page["ig_media"] if page["ig_media"] is not None else "?",
            ))
        else:
            print("   ❌ لا يوجد حساب Instagram Business مربوط بهذه الصفحة.")

    missing = missing_permissions(report["granted"])
    print("\nالصلاحيات الناقصة: %s" % (", ".join(missing) if missing else "لا شيء ✅"))
    for name, why in REQUIRED_PERMISSIONS:
        if name in missing:
            print("   - %s → %s" % (name, why))

    for error in report["errors"]:
        print("⚠️  %s" % error)

    if not args.no_status_file:
        target = os.path.join(PROJECT_ROOT, "store", "meta", "connection-status.md")
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(status_markdown(report, version, env.get("META_PAGE_ID"), env.get("META_IG_BUSINESS_ID")))
        print("\nكُتبت الحالة في store/meta/connection-status.md (بلا أي توكن).")

    return 0 if (report["me"] and not missing and any(p["ig_id"] for p in report["pages"])) else 3


if __name__ == "__main__":
    sys.exit(main())
