#!/usr/bin/env python3
"""
Script to check relations in ACT Placemat Notion databases
"""

import os
import requests
import json
from typing import Dict, List, Any

# Notion API configuration
NOTION_API_TOKEN = os.environ.get('NOTION_API_TOKEN')
NOTION_VERSION = '2022-06-28'
BASE_URL = 'https://api.notion.com/v1'

# Database IDs
DATABASES = {
    'Projects': '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
    'People': '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
    'Organisations': '948f3946-7d1c-42f2-bd7e-1317a755e67b',
    'Opportunities': '234ebcf9-81cf-804e-873f-f352f03c36da',
    'Artefacts': '234ebcf9-81cf-8015-878d-eadb337662e4'
}

def get_database_properties(database_id: str) -> Dict[str, Any]:
    """Retrieve database schema including all properties"""
    headers = {
        'Authorization': f'Bearer {NOTION_API_TOKEN}',
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
    }
    
    url = f'{BASE_URL}/databases/{database_id}'
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Error fetching database {database_id}: {response.status_code}")
        print(f"Response: {response.text}")
        return {}
    
    return response.json()

def analyze_relations(properties: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and analyze relation properties from database schema"""
    relations = []
    
    for prop_name, prop_data in properties.items():
        if prop_data['type'] == 'relation':
            relation_info = {
                'name': prop_name,
                'type': 'relation',
                'database_id': prop_data.get('relation', {}).get('database_id'),
                'synced_property_name': prop_data.get('relation', {}).get('synced_property_name'),
                'synced_property_id': prop_data.get('relation', {}).get('synced_property_id'),
                'is_two_way': bool(prop_data.get('relation', {}).get('synced_property_name'))
            }
            relations.append(relation_info)
    
    return relations

def main():
    if not NOTION_API_TOKEN:
        print("Error: NOTION_API_TOKEN environment variable not set")
        return
    
    print("Checking relations in ACT Placemat databases...\n")
    
    all_relations = {}
    database_names_by_id = {v: k for k, v in DATABASES.items()}
    
    for db_name, db_id in DATABASES.items():
        print(f"\n{'='*60}")
        print(f"Database: {db_name}")
        print(f"ID: {db_id}")
        print('='*60)
        
        # Get database schema
        db_data = get_database_properties(db_id)
        
        if not db_data:
            print(f"Failed to retrieve data for {db_name}")
            continue
        
        properties = db_data.get('properties', {})
        relations = analyze_relations(properties)
        all_relations[db_name] = relations
        
        if relations:
            print(f"\nFound {len(relations)} relation(s):")
            for rel in relations:
                print(f"\n  - Property: {rel['name']}")
                print(f"    Type: {rel['type']}")
                
                # Try to identify which database this relates to
                related_db_id = rel['database_id']
                related_db_name = database_names_by_id.get(related_db_id, 'Unknown')
                
                print(f"    Related Database: {related_db_name} ({related_db_id})")
                
                if rel['is_two_way']:
                    print(f"    Two-way relation: YES")
                    print(f"    Synced property: {rel['synced_property_name']}")
                else:
                    print(f"    Two-way relation: NO (one-way only)")
        else:
            print("\nNo relations found in this database.")
    
    # Summary and analysis
    print(f"\n\n{'='*60}")
    print("SUMMARY AND ANALYSIS")
    print('='*60)
    
    # Check for expected relations based on typical project management structure
    expected_relations = {
        'Projects': ['People', 'Organisations', 'Opportunities', 'Artefacts'],
        'People': ['Projects', 'Organisations'],
        'Organisations': ['Projects', 'People', 'Opportunities'],
        'Opportunities': ['Projects', 'Organisations', 'People'],
        'Artefacts': ['Projects']
    }
    
    print("\nExpected vs Actual Relations:")
    for db_name, expected in expected_relations.items():
        actual_relations = all_relations.get(db_name, [])
        actual_db_names = []
        
        for rel in actual_relations:
            related_db_id = rel['database_id']
            related_db_name = database_names_by_id.get(related_db_id, 'Unknown')
            if related_db_name != 'Unknown':
                actual_db_names.append(related_db_name)
        
        print(f"\n{db_name}:")
        print(f"  Expected relations to: {', '.join(expected)}")
        print(f"  Actual relations to: {', '.join(actual_db_names) if actual_db_names else 'None'}")
        
        missing = set(expected) - set(actual_db_names)
        if missing:
            print(f"  Missing relations: {', '.join(missing)}")

if __name__ == '__main__':
    main()