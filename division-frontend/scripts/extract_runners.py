#!/usr/bin/env python3
"""Extract the real runner database from data/Timing System.xlsx into src/data/runners.json.

Merges three sheets by BIB:
  - "Runner List"          -> identity fields (bib, barcode, name, gender, category, ...)
  - "(2)Check In"          -> real check-in timestamps (Excel serial datetime)
  - "(3)Summary Finished"  -> real finish timestamps

Excel serial dates: days since 1899-12-30. Start times are day-fractions
(MKT33 0.2291666 = 05:30, MKT50 0.2083333 = 05:00). Output timestamps are ISO
strings in local event time (no timezone math — times are displayed as-is).

Stdlib only. Run from division-frontend/:  python3 scripts/extract_runners.py
"""

import json
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
EXCEL_EPOCH = datetime(1899, 12, 30)

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT.parent / "data" / "Timing System.xlsx"
OUT = ROOT / "src" / "data" / "runners.json"


def load_shared_strings(z):
    strings = []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("m:si", NS):
        text = "".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t"))
        strings.append(text)
    return strings


def sheet_paths(z):
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    return {
        s.attrib["name"]: "xl/" + relmap[s.attrib[REL_NS]]
        for s in wb.findall(".//m:sheet", NS)
    }


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


def serial_to_iso(serial):
    """Excel serial datetime -> ISO string (local event time)."""
    if serial is None:
        return None
    dt = EXCEL_EPOCH + timedelta(days=float(serial))
    return dt.replace(microsecond=0).isoformat()


def main():
    z = zipfile.ZipFile(XLSX)
    shared = load_shared_strings(z)
    paths = sheet_paths(z)

    # --- Runner List: identity ---
    runners = {}
    for row in read_rows(z, paths["Runner List"], shared):
        bib = str(row.get(1, "")).strip()
        if not bib.isdigit():
            continue  # header/summary rows
        name = str(row.get(5, row.get(4, "")) or "").strip()
        if not name or name == "None":
            continue  # reserved BIB with no registered runner
        runners[bib] = {
            "bib": bib,
            "barcode": str(row.get(2, f"*{bib}*")).strip(),
            "name": name,
            "nameOnBib": str(row.get(6, "")).strip(),
            "gender": str(row.get(7, "")).strip(),
            "ageGroup": str(row.get(8, "")).strip(),
            "nationality": str(row.get(9, "")).strip(),
            "category": str(row.get(10, "")).strip(),
            "startTime": None,  # filled from day-fraction below
            "startFraction": row.get(12),
            "checkin": None,
            "cps": {},
            "finish": None,
        }

    # --- (2)Check In: real check-in serials (col 7), fallback event day source ---
    event_day = None
    for row in read_rows(z, paths["(2)Check In"], shared):
        bib = str(row.get(1, "")).strip()
        serial = row.get(7)
        if not bib.isdigit() or bib not in runners or serial is None:
            continue
        try:
            fserial = float(serial)
        except ValueError:
            continue
        runners[bib]["checkin"] = serial_to_iso(fserial)
        if event_day is None and fserial > 1:
            event_day = int(fserial)

    # --- (3)Summary Finished: real finish serials (col 10) ---
    for row in read_rows(z, paths["(3)Summary Finished"], shared):
        bib = str(row.get(1, "")).strip()
        serial = row.get(10)
        if not bib.isdigit() or bib not in runners or serial is None:
            continue
        try:
            runners[bib]["finish"] = serial_to_iso(float(serial))
        except ValueError:
            continue

    # --- Resolve start times: day-fraction + event day -> ISO ---
    if event_day is None:
        raise SystemExit("Could not determine event day from check-in data")
    for r in runners.values():
        frac = r.pop("startFraction", None)
        if frac is not None:
            try:
                r["startTime"] = serial_to_iso(event_day + float(frac))
            except ValueError:
                r["startTime"] = None

    out = sorted(runners.values(), key=lambda r: r["bib"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    finished = sum(1 for r in out if r["finish"])
    checked = sum(1 for r in out if r["checkin"])
    cats = {}
    for r in out:
        cats[r["category"]] = cats.get(r["category"], 0) + 1
    print(f"runners: {len(out)}  checked-in: {checked}  finished: {finished}")
    print(f"categories: {cats}")
    print(f"event day serial: {event_day} -> {serial_to_iso(event_day)}")
    sample = runners.get("3381")
    if sample:
        print(f"spot-check 3381: {sample['name']} start={sample['startTime']} finish={sample['finish']}")


if __name__ == "__main__":
    main()
