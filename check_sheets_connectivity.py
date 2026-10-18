"""
Google Sheets Connectivity Diagnostic Tool
===========================================
Checks if Google Sheets integration is configured and can connect.

Usage:
    python check_sheets_connectivity.py
"""

import os
import sys

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v

import re

raw_sheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
sheet_id_match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", raw_sheet_id)
sheet_id = sheet_id_match.group(1) if sheet_id_match else raw_sheet_id
creds_val = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON", "").strip()

print("=" * 60)
print("GOOGLE SHEETS CONNECTIVITY AUDIT")
print("=" * 60)

# Check 1: Spreadsheet ID
if not sheet_id:
    print("[FAIL] GOOGLE_SHEETS_SPREADSHEET_ID: NOT SET (Blank)")
    print("       -> Add your Google Sheet ID to .env")
else:
    if sheet_id_match:
        print(f"[OK]   GOOGLE_SHEETS_SPREADSHEET_ID: Extracted ID '{sheet_id}' from URL")
    else:
        print(f"[OK]   GOOGLE_SHEETS_SPREADSHEET_ID: Found ID '{sheet_id}'")

# Check 2: Credentials
if not creds_val:
    print("[FAIL] GOOGLE_SHEETS_CREDENTIALS_JSON: NOT SET (Blank)")
    print("       -> Set file path (e.g. credentials.json) or raw JSON string in .env")
else:
    if os.path.exists(creds_val):
        print(f"[OK]   Credentials file exists on disk: '{creds_val}'")
    elif creds_val.startswith("{") and creds_val.endswith("}"):
        print("[OK]   Credentials provided as direct JSON string.")
    else:
        print(f"[FAIL] Credentials file NOT found: '{creds_val}'")

# Check 3: Library installation
try:
    import gspread
    from google.oauth2.service_account import Credentials
    print("[OK]   Libraries 'gspread' and 'google-auth': INSTALLED")
    libs_installed = True
except ImportError as err:
    print(f"[WARN] Libraries missing in local environment: {err}")
    print("       (Note: Dependencies are pre-installed inside Docker container)")
    libs_installed = False

# Check 4: Live connection test (if configs & libs are present)
if sheet_id and creds_val and libs_installed:
    import json
    service_email = ""
    if os.path.exists(creds_val):
        try:
            with open(creds_val, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                service_email = c_data.get("client_email", "")
        except Exception:
            pass

    print(f"\nService Account Email: {service_email or 'Unknown'}")
    print("Attempting live connection to Google Sheets...")
    try:
        from services.sheets import GoogleSheetsService
        service = GoogleSheetsService()
        if service._connect():
            print("\n[SUCCESS] Successfully connected to Google Sheets!")
            print(f"          Worksheet title: '{service.sheet.title}'")
            # Check tabs
            spreadsheet = service.client.open_by_key(service.spreadsheet_id)
            titles = [ws.title for ws in spreadsheet.worksheets()]
            print(f"          Available tabs : {titles}")
        else:
            print("\n[FAIL] 403 Forbidden / Permission Denied.")
            print(f"       Action Required: Open your Google Sheet, click 'Share', and add:")
            print(f"       -> {service_email}")
            print(f"       with 'Editor' permission.")
    except Exception as e:
        print(f"\n[ERROR] Connection error: {e}")
        if "403" in str(e) or "Permission" in str(type(e)):
            print(f"       Action Required: Open your Google Sheet, click 'Share', and add:")
            print(f"       -> {service_email}")
            print(f"       with 'Editor' permission.")
else:
    print("\n" + "=" * 60)
    print("SUMMARY: Google Sheets integration is currently INACTIVE.")
    print("=" * 60)
    print("Reason(s):")
    if not sheet_id:
        print("  1. GOOGLE_SHEETS_SPREADSHEET_ID is missing in .env")
    if not creds_val or (not os.path.exists(creds_val) and not creds_val.startswith("{")):
        print(f"  2. Google Service Account credentials file ('{creds_val}') is missing")
    print("=" * 60)
