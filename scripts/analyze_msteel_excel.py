# -*- coding: utf-8 -*-
"""Analyze 入库单 Excel vs M钢筋库 MGJKM aggregates."""
import openpyxl
from pathlib import Path
from datetime import datetime

EXCEL = Path(r"c:\Users\Administrator\Desktop\入库单（0401-0424）.xlsx")


def parse_date_cell(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    s = str(v).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10].replace("/", "-"), "%Y-%m-%d").date()
        except ValueError:
            continue
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def main():
    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    print("HEADER columns:", len(header))
    # map Chinese headers
    idx = {str(h).strip(): i for i, h in enumerate(header) if h}
    print("Known keys sample:", list(idx.keys())[:20])

    # guess indices by position from sample (0-based): 入库时间 ~4, 库区 ~12, 物料 ~13, 预估干基 ~17, 入库日期 last col
    wh_area_i = None
    material_i = None
    dry_i = None
    receipt_i = None
    warehouse_i = None
    date_i = None
    status_i = None
    for i, h in enumerate(header):
        hs = str(h).strip() if h else ""
        if "库区" in hs and "仓库" not in hs:
            wh_area_i = i
        elif hs == "仓库" or hs.endswith("仓库"):
            if warehouse_i is None:
                warehouse_i = i
        elif "物料" in hs or hs == "料型":
            material_i = i
        elif "预估干基" in hs or "干基" in hs:
            dry_i = i
        elif "收货单" in hs or "收货单号" in hs:
            receipt_i = i
        elif "入库日期" in hs:
            date_i = i
        elif hs == "状态":
            status_i = i

    print(
        "Guessed idx warehouse",
        warehouse_i,
        "wh_area",
        wh_area_i,
        "material",
        material_i,
        "dry",
        dry_i,
        "receipt",
        receipt_i,
        "date",
        date_i,
        "status",
        status_i,
    )

    from datetime import date as ddate

    start = ddate(2026, 4, 1)
    end = ddate(2026, 4, 24)

    target_wh = "M钢筋库"
    target_mats = {"重型毛料M10", "轻薄毛料M0"}

    sum_all = 0.0
    sum_sh_base = 0.0
    by_mat = {}
    excluded_warehouses = {"优质毛料库", "M钢渣粒子", "MP废钢库"}
    n_rows = 0

    for r in rows[1:]:
        if material_i is None or dry_i is None:
            break
        mat = str(r[material_i] or "").strip()
        if mat not in target_mats:
            continue
        # prefer 库区 over 仓库 for area name
        area = ""
        if wh_area_i is not None:
            area = str(r[wh_area_i] or "").strip()
        if not area and warehouse_i is not None:
            area = str(r[warehouse_i] or "").strip()
        if area != target_wh:
            continue

        dt = None
        if date_i is not None:
            dt = parse_date_cell(r[date_i])
        if dt is None and len(r) > 4:
            dt = parse_date_cell(r[4])  # 入库时间
        if dt is None:
            continue
        if dt < start or dt > end:
            continue

        dry = float(r[dry_i] or 0)
        receipt = str(r[receipt_i] or "").strip().upper() if receipt_i is not None else ""
        wh_for_rule = str(r[warehouse_i] or "").strip() if warehouse_i is not None else area

        sum_all += dry
        by_mat[mat] = by_mat.get(mat, 0.0) + dry
        n_rows += 1

        # base self rule: SH + warehouse not in excluded (uses 仓库 field in code)
        if receipt.startswith("SH") and wh_for_rule not in excluded_warehouses:
            sum_sh_base += dry

    print(f"\nExcel rows M钢筋库 + (M10|M0) [{start}..{end}]: {n_rows} lines")
    print(f"Sum estimated_dry_basis (all receipt types in sheet): {sum_all:.6f}")
    print(f"Sum SH & warehouse not in excluded (base-self style): {sum_sh_base:.6f}")
    print("By material:", {k: round(v, 6) for k, v in sorted(by_mat.items())})


if __name__ == "__main__":
    main()
