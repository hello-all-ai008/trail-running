#!/usr/bin/env python3
"""Generate a Supabase migration seeding `registrations` from the Baanpong 2026
Google Form export (data/Athlete List Baanpong 2026 - 28-7-69 - final.xlsx).

New event, separate from the existing MKT33/MKT50 seed (Timing System.xlsx,
121 runners). Registrants have no BIB yet -> `registrations` staging table,
not `runners`. Two new `race_categories` rows (BP10/BP5) are created first
since `registrations.category_code` is a FK to `race_categories(code)`.
`mass_start_at` is a placeholder (2026-07-28 06:00 +07) -- update once the
real gun time is known.

Stdlib only, same xlsx-parsing approach as scripts/extract_runners.py.
Run from division-frontend/:  python3 scripts/generate_baanpong_seed.py
"""

import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT.parent / "data" / "Athlete List Baanpong 2026 - 28-7-69 - final.xlsx"
OUT = ROOT.parent / "supabase" / "migrations" / "0005_seed_baanpong2026.sql"

BATCH_SIZE = 200
MASS_START_AT = "2026-07-28 06:00:00+07"

GENDER_MAP = {
    "ชาย (Male)": "Male",
    "หญิง (Female)": "Female",
}


def load_shared_strings(z):
    strings = []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("m:si", NS):
        text = "".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))
        strings.append(text)
    return strings


def col_index(ref):
    """'C12' -> 2 (zero-based column)."""
    col = 0
    for ch in ref:
        if ch.isalpha():
            col = col * 26 + (ord(ch.upper()) - 64)
        else:
            break
    return col - 1


def read_rows(z, path, shared):
    root = ET.fromstring(z.read(path))
    rows = []
    for row in root.findall(".//m:row", NS):
        cells = {}
        for c in row.findall("m:c", NS):
            v = c.find("m:v", NS)
            if v is None:
                continue
            val = shared[int(v.text)] if c.attrib.get("t") == "s" else v.text
            cells[col_index(c.attrib["r"])] = val
        rows.append(cells)
    return rows


def sql_str(value):
    return "'" + value.replace("'", "''") + "'"


def category_code(distance):
    distance = distance.strip()
    if distance.startswith("10"):
        return "BP10"
    if distance.startswith("5"):
        return "BP5"
    raise ValueError(f"Unrecognized distance: {distance!r}")


def main():
    z = zipfile.ZipFile(XLSX)
    shared = load_shared_strings(z)
    rows = read_rows(z, "xl/worksheets/sheet1.xml", shared)

    registrations = []
    for row in rows[1:]:  # skip header
        no = str(row.get(0, "")).strip()
        if not no.isdigit():
            continue
        full_name = str(row.get(2, "")).strip()
        gender_raw = str(row.get(3, "")).strip()
        distance_raw = str(row.get(4, "")).strip()
        age_group = str(row.get(6, "")).strip()

        gender = GENDER_MAP.get(gender_raw)
        if gender is None:
            raise ValueError(f"Unrecognized gender at row {no}: {gender_raw!r}")

        registrations.append(
            {
                "full_name": full_name,
                "gender": gender,
                "age_group": age_group,
                "category_code": category_code(distance_raw),
            }
        )

    lines = [
        "-- Baanpong 2026 registrant import (Google Form export, 1003 rows).",
        "-- New event, separate from MKT33/MKT50. registrations only -- no BIB",
        "-- assigned yet (step 2 of the workflow does that later).",
        "-- mass_start_at is a PLACEHOLDER (file date 28-7-69 = 2026-07-28) --",
        "-- update both race_categories rows once the real gun time is known.",
        "",
        "insert into race_categories (code, name, distance_km, mass_start_at) values",
        f"  ('BP10', '10 KM : Hard Rock', 10, '{MASS_START_AT}'),",
        f"  ('BP5', '5 KM : Soft Rock', 5, '{MASS_START_AT}');",
        "",
    ]

    for i in range(0, len(registrations), BATCH_SIZE):
        batch = registrations[i : i + BATCH_SIZE]
        lines.append(
            "insert into registrations (full_name, gender, age_group, category_code, status, source) values"
        )
        value_rows = [
            "  ({}, {}, {}, {}, 'approved', 'google_form')".format(
                sql_str(r["full_name"]),
                sql_str(r["gender"]),
                sql_str(r["age_group"]),
                sql_str(r["category_code"]),
            )
            for r in batch
        ]
        lines.append(",\n".join(value_rows) + ";")
        lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")

    bp10 = sum(1 for r in registrations if r["category_code"] == "BP10")
    bp5 = sum(1 for r in registrations if r["category_code"] == "BP5")
    print(f"registrations: {len(registrations)}  BP10: {bp10}  BP5: {bp5}")
    print(f"written: {OUT}")


if __name__ == "__main__":
    main()
