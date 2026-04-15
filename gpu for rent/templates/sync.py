#!/usr/bin/env python3

import os
import json
import requests
import glob

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dmzeaolugvuykaqgcbji.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_KEY environment variable is required.")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def sync_templates():
    template_files = glob.glob("*/template.json")
    if not template_files:
        print("No template.json files found.")
        return

    for file_path in template_files:
        with open(file_path, "r") as f:
            try:
                template = json.load(f)
                
                # Upsert into Supabase
                res = requests.post(
                    f"{SUPABASE_URL}/rest/v1/templates",
                    headers=headers,
                    json=template
                )
                
                if res.status_code >= 400:
                    print(f"Failed to sync {template.get('name')}: {res.text}")
                else:
                    print(f"Successfully synced {template.get('name')}")
                    
            except json.JSONDecodeError:
                print(f"Error parsing JSON in {file_path}")

if __name__ == "__main__":
    sync_templates()
