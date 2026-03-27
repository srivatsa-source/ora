import os
import re
import importlib
from typing import Optional

from config import (
    GOOGLE_SHEET_CSV_URL,
    DEMOGRAPHICS_TOP_N,
)

def generate_demographics_report(csv_url: Optional[str] = None) -> dict:
    """
    Fetch Google Sheet data and return JSON data for interactive charts.
    """
    source_url = (csv_url or GOOGLE_SHEET_CSV_URL).strip()

    if not source_url:
        return {
            "status": "skipped",
            "message": "CSV source is empty.",
            "charts": [],
            "raw_data": []
        }

    try:
        pd = importlib.import_module("pandas")
        import numpy as np
    except Exception:
        return {
            "status": "error",
            "message": "pandas missing. Run: pip install pandas",
            "charts": [],
            "raw_data": []
        }

    try:
        df = pd.read_csv(source_url)
        df = df.replace({np.nan: None})

        if df.empty:
            return {
                "status": "error",
                "message": "CSV is empty.",
                "charts": [],
                "raw_data": []
            }

        charts = []
        colors = ["#ff6b35", "#00bcd4", "#8ac926", "#ffb703", "#9d4edd", "#f15bb5"]
        color_idx = 0
        
        # Convert raw data for frontend details viewer (fill NaN with None)
        raw_data = df.to_dict(orient="records")

        for col in df.columns:
            if len(charts) >= 6:
                break
                
            unique_cnt = df[col].nunique()
            total_cnt = len(df[col].dropna())
            
            if unique_cnt < 2 or total_cnt == 0:
                continue
            
            if unique_cnt > 30 and df[col].dtype == 'object' and unique_cnt > total_cnt * 0.5:
                continue
                
            counts = (
                df[col]
                .astype(str)
                .str.strip()
                .replace("", np.nan)
                .replace("None", np.nan)
                .dropna()
                .value_counts()
                .head(DEMOGRAPHICS_TOP_N)
            )
            
            if not counts.empty and len(counts) > 1:
                title = f"{str(col).upper()}"
                
                chart_data = {
                    "column": col,
                    "title": title,
                    "color": colors[color_idx % len(colors)],
                    "data": [{"label": str(k), "value": int(v)} for k, v in counts.items()]
                }
                charts.append(chart_data)
                color_idx += 1

        if not charts:
            return {
                "status": "error",
                "message": "Could not detect any suitable categorical columns to graph.",
                "charts": [],
                "raw_data": []
            }

        return {
            "status": "ok",
            "message": f"Generated {len(charts)} interactive charts.",
            "charts": charts,
            "raw_data": raw_data
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to generate charts: {str(e)}",
            "charts": [],
            "raw_data": []
        }