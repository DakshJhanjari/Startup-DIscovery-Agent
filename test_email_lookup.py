"""
Quick test script for Hunter.io Email Finder
============================================
Run without arguments for sample tests, or pass arguments:

    python test_email_lookup.py --name "Nithin Kamath" --domain "zerodha.com"
    python test_email_lookup.py --linkedin "https://www.linkedin.com/in/satyanadella/"
    python test_email_lookup.py --name "Harshil Mathur" --domain "razorpay.com" --linkedin "https://www.linkedin.com/in/harshilmathur/"
"""

import sys
import argparse
import os
import sys
import argparse

# Try python-dotenv, fallback to standard library .env reader
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

from services.email_finder import HunterEmailFinder, _extract_linkedin_handle, _extract_domain


def test_lookup(name=None, domain=None, linkedin_url=None):
    finder = HunterEmailFinder()

    if not finder.api_key:
        print("[ERROR] HUNTER_API_KEY is not set in .env")
        return

    print("=" * 60)
    print("HUNTER.IO EMAIL FINDER TEST")
    print("=" * 60)
    print(f"Target Name    : {name or 'N/A'}")
    print(f"Target Domain  : {domain or 'N/A'}")
    print(f"LinkedIn URL   : {linkedin_url or 'N/A'}")

    handle = _extract_linkedin_handle(linkedin_url) if linkedin_url else None
    clean_domain = _extract_domain(domain) if domain else None

    if handle:
        print(f"Extracted Handle: {handle}")
    if clean_domain:
        print(f"Extracted Domain: {clean_domain}")

    print("\n[1] Querying Hunter.io API...")
    email = None

    if handle:
        print(f"-> Attempting lookup by LinkedIn handle '{handle}'...")
        email = finder._lookup_by_handle(handle)

    if not email and clean_domain and name:
        print(f"-> Attempting lookup by domain '{clean_domain}' and name '{name}'...")
        email = finder._lookup_by_domain_and_name(clean_domain, name)

    print("\n" + "=" * 60)
    if email:
        print(f"[SUCCESS] Found Email: {email}")
    else:
        print("[INFO] No email found in Hunter's database for this query.")
    print("=" * 60)
    return email


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Hunter.io Email Finder")
    parser.add_argument("--name", type=str, help="Full name of person (e.g. 'Harshil Mathur')")
    parser.add_argument("--domain", type=str, help="Company domain or website (e.g. 'razorpay.com')")
    parser.add_argument("--linkedin", type=str, help="LinkedIn profile URL")

    args = parser.parse_args()

    # If no args given, run sample test
    if not (args.name or args.domain or args.linkedin):
        print("No specific person provided. Running a test for Harshil Mathur @ razorpay.com...\n")
        test_lookup(name="Harshil Mathur", domain="razorpay.com")
    else:
        test_lookup(name=args.name, domain=args.domain, linkedin_url=args.linkedin)
