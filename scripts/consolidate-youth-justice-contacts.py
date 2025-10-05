#!/usr/bin/env python3
"""
Youth Justice Contacts Consolidation Script

Consolidates multiple CSV files containing LinkedIn and other contacts into a unified
youth justice database with standardized fields and intelligent data mapping.

Author: Generated for ACT Placemat Youth Justice initiative
Date: 2025-09-13
"""

import pandas as pd
import csv
import logging
import re
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import uuid


class YouthJusticeContactsConsolidator:
    """Consolidates multiple contact CSV files into a unified youth justice database."""

    def __init__(self, input_dir: str, output_file: str):
        """
        Initialize the consolidator.

        Args:
            input_dir: Directory containing the CSV files
            output_file: Path for the consolidated output CSV
        """
        self.input_dir = input_dir
        self.output_file = output_file
        self.logger = self._setup_logging()

        # Mapping for sector standardization
        self.sector_mapping = {
            'government': ['politician', 'minister', 'mp', 'senator', 'council', 'commission', 'department'],
            'media': ['journalist', 'reporter', 'editor', 'producer', 'abc', 'sbs', 'nine', 'seven', 'ten', 'radio'],
            'ngo': ['foundation', 'charity', 'advocacy', 'rights', 'coalition', 'community'],
            'philanthropy': ['foundation', 'philanthropist', 'donor', 'grant', 'funding'],
            'academic': ['university', 'professor', 'researcher', 'phd', 'dr', 'academic', 'research'],
            'legal': ['judge', 'magistrate', 'lawyer', 'barrister', 'solicitor', 'court', 'legal'],
            'corporate': ['ceo', 'director', 'manager', 'executive', 'business', 'corporate', 'company'],
            'civil_society': ['activist', 'advocate', 'organiser', 'campaigner', 'community leader']
        }

        # Keywords for youth justice relevance scoring
        self.youth_justice_keywords = {
            'high': ['youth justice', 'juvenile', 'detention', 'children court', 'youth crime', 'justice reinvestment'],
            'medium': ['crime prevention', 'rehabilitation', 'diversion', 'restorative justice', 'indigenous justice'],
            'low': ['social work', 'community', 'education', 'welfare', 'support services']
        }

        # Indigenous indicators
        self.indigenous_indicators = [
            'aboriginal', 'torres strait', 'indigenous', 'first nations', 'koori', 'murri', 'noongar',
            'yolngu', 'anangu', 'palawa', 'tiwi', 'yarrabah', 'mob', 'blackfella'
        ]

        # Initialize master contacts list
        self.master_contacts = []

    def _setup_logging(self) -> logging.Logger:
        """Set up logging configuration."""
        logger = logging.getLogger('youth_justice_consolidator')
        logger.setLevel(logging.INFO)

        # Create console handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def standardize_sector(self, title: str, organisation: str, description: str = '') -> str:
        """
        Standardize sector based on title, organisation, and description.

        Args:
            title: Job title or role
            organisation: Organisation name
            description: Additional description text

        Returns:
            Standardized sector name
        """
        text = f"{title} {organisation} {description}".lower()

        for sector, keywords in self.sector_mapping.items():
            if any(keyword in text for keyword in keywords):
                return sector.replace('_', ' ').title()

        return 'Other'

    def calculate_relevance_score(self, title: str, organisation: str, description: str = '') -> int:
        """
        Calculate youth justice relevance score (1-10).

        Args:
            title: Job title or role
            organisation: Organisation name
            description: Additional description text

        Returns:
            Relevance score from 1-10
        """
        text = f"{title} {organisation} {description}".lower()

        # Check for high relevance keywords
        for keyword in self.youth_justice_keywords['high']:
            if keyword in text:
                return 10

        # Check for medium relevance keywords
        for keyword in self.youth_justice_keywords['medium']:
            if keyword in text:
                return 7

        # Check for low relevance keywords
        for keyword in self.youth_justice_keywords['low']:
            if keyword in text:
                return 5

        # Default score based on sector
        sector = self.standardize_sector(title, organisation, description)
        if sector in ['Legal', 'Government']:
            return 6
        elif sector in ['Academic', 'Media']:
            return 4
        else:
            return 3

    def detect_indigenous_affiliation(self, text: str) -> str:
        """
        Detect Indigenous affiliation from text.

        Args:
            text: Text to analyze

        Returns:
            'Yes', 'No', or 'Unknown'
        """
        if not text:
            return 'Unknown'

        text_lower = text.lower()
        if any(indicator in text_lower for indicator in self.indigenous_indicators):
            return 'Yes'

        # Check for explicit "no" indicators
        if 'non-indigenous' in text_lower or 'not indigenous' in text_lower:
            return 'No'

        return 'Unknown'

    def extract_youth_justice_focus(self, title: str, organisation: str, description: str = '') -> str:
        """
        Extract specific youth justice focus areas from text.

        Args:
            title: Job title or role
            organisation: Organisation name
            description: Additional description text

        Returns:
            Comma-separated focus areas
        """
        text = f"{title} {organisation} {description}".lower()
        focus_areas = []

        focus_patterns = {
            'detention reform': ['detention', 'custody', 'incarceration'],
            'justice reinvestment': ['justice reinvestment', 'community investment'],
            'indigenous justice': ['indigenous', 'aboriginal', 'first nations'],
            'trauma informed': ['trauma', 'healing', 'therapy'],
            'prevention': ['prevention', 'early intervention', 'diversion'],
            'rehabilitation': ['rehabilitation', 'reintegration', 'support'],
            'legal advocacy': ['legal', 'court', 'advocacy', 'rights']
        }

        for focus, keywords in focus_patterns.items():
            if any(keyword in text for keyword in keywords):
                focus_areas.append(focus)

        return ', '.join(focus_areas) if focus_areas else 'General'

    def determine_engagement_priority(self, relevance_score: int, sector: str,
                                    indigenous_affiliation: str) -> str:
        """
        Determine engagement priority based on various factors.

        Args:
            relevance_score: Youth justice relevance score
            sector: Standardized sector
            indigenous_affiliation: Indigenous affiliation status

        Returns:
            'High', 'Medium', or 'Low'
        """
        # High priority conditions
        if (relevance_score >= 8 or
            sector in ['Legal', 'Government'] or
            indigenous_affiliation == 'Yes'):
            return 'High'

        # Medium priority conditions
        if relevance_score >= 5 or sector in ['Media', 'Academic', 'NGO']:
            return 'Medium'

        return 'Low'

    def estimate_media_reach(self, organisation: str, title: str) -> str:
        """
        Estimate media reach based on organisation and title.

        Args:
            organisation: Organisation name
            title: Job title

        Returns:
            'National', 'State', 'Local', or 'Unknown'
        """
        org_lower = organisation.lower()
        title_lower = title.lower()

        # National indicators
        national_orgs = ['abc', 'sbs', 'nine', 'seven', 'ten', 'news corp', 'fairfax', 'guardian']
        if any(org in org_lower for org in national_orgs):
            return 'National'

        # State indicators
        state_indicators = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'darwin', 'hobart']
        if any(indicator in org_lower for indicator in state_indicators):
            return 'State'

        # Check for media sector
        if 'media' in self.standardize_sector(title, organisation).lower():
            return 'Local'

        return 'Unknown'

    def process_people_csv(self, filepath: str) -> List[Dict]:
        """Process the main People CSV file."""
        self.logger.info(f"Processing {filepath}")
        contacts = []

        try:
            df = pd.read_csv(filepath, encoding='utf-8-sig')

            for _, row in df.iterrows():
                name = str(row.get('Name', '')).strip()
                if not name or name == 'nan':
                    continue

                organisation = str(row.get('Organisation', '')).strip()
                role = str(row.get('Role', '')).strip()
                email = str(row.get('Email', '')).strip()
                tags = str(row.get('Tag', '')).strip()
                linkedin = str(row.get('LinkedIn', '')).strip()
                mobile = str(row.get('Mobile', '')).strip()
                website = str(row.get('Website', '')).strip()
                status = str(row.get('Status', '')).strip()
                last_contact = str(row.get('Last Contact', '')).strip()
                source_info = str(row.get('Source', '')).strip()

                # Calculate derived fields
                sector = self.standardize_sector(role, organisation, tags)
                relevance_score = self.calculate_relevance_score(role, organisation, tags)
                indigenous_affiliation = self.detect_indigenous_affiliation(f"{name} {tags} {source_info}")
                youth_justice_focus = self.extract_youth_justice_focus(role, organisation, tags)
                engagement_priority = self.determine_engagement_priority(
                    relevance_score, sector, indigenous_affiliation
                )

                contact = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'title': role,
                    'organisation': organisation,
                    'sector': sector,
                    'location': '',  # Not available in this file
                    'state_region': '',
                    'indigenous_affiliation': indigenous_affiliation,
                    'email': email if email != 'nan' else '',
                    'phone': mobile if mobile != 'nan' else '',
                    'website': website if website != 'nan' else '',
                    'linkedin': linkedin if linkedin != 'nan' else '',
                    'twitter': '',
                    'relevance_score': relevance_score,
                    'youth_justice_focus': youth_justice_focus,
                    'expertise_areas': tags,
                    'engagement_priority': engagement_priority,
                    'contact_status': status if status != 'nan' else '',
                    'last_contact': last_contact if last_contact != 'nan' else '',
                    'source_file': 'People 47bdc1c4df994ddc81c4a0214c919d69.csv',
                    'public_contact_info': '',
                    'interview_potential': '',
                    'notable_quotes': '',
                    'tags': tags,
                    'social_impact_sector': sector,
                    'media_reach': self.estimate_media_reach(organisation, role),
                    'philanthropic_capacity': 'Unknown',
                    'government_influence': 'High' if sector == 'Government' else 'Unknown',
                    'lived_experience': 'Unknown',
                    'research_background': 'Yes' if sector == 'Academic' else 'Unknown',
                    'funding_potential': 'Unknown',
                    'collaboration_opportunities': '',
                    'notes': source_info
                }

                contacts.append(contact)

        except Exception as e:
            self.logger.error(f"Error processing {filepath}: {e}")

        self.logger.info(f"Processed {len(contacts)} contacts from {filepath}")
        return contacts

    def process_expanded_media_csv(self, filepath: str) -> List[Dict]:
        """Process the Expanded Media CSV file."""
        self.logger.info(f"Processing {filepath}")
        contacts = []

        try:
            df = pd.read_csv(filepath)

            for _, row in df.iterrows():
                name = str(row.get('Name', '')).strip()
                if not name or name == 'nan':
                    continue

                title = str(row.get('Title/Role', '')).strip()
                organisation = str(row.get('Organization', '')).strip()
                sector_type = str(row.get('Sector/Type', '')).strip()
                location = str(row.get('Location', '')).strip()
                relevance = str(row.get('Relevance to CONX Campaign', '')).strip()
                public_contact = str(row.get('Public Contact Info', '')).strip()

                # Calculate derived fields
                sector = self.standardize_sector(title, organisation, sector_type)
                relevance_score = self.calculate_relevance_score(title, organisation, relevance)
                indigenous_affiliation = self.detect_indigenous_affiliation(f"{name} {relevance}")
                youth_justice_focus = self.extract_youth_justice_focus(title, organisation, relevance)
                engagement_priority = self.determine_engagement_priority(
                    relevance_score, sector, indigenous_affiliation
                )

                contact = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'title': title,
                    'organisation': organisation,
                    'sector': sector,
                    'location': location,
                    'state_region': self._extract_state_from_location(location),
                    'indigenous_affiliation': indigenous_affiliation,
                    'email': '',
                    'phone': '',
                    'website': '',
                    'linkedin': '',
                    'twitter': self._extract_twitter_from_contact(public_contact),
                    'relevance_score': relevance_score,
                    'youth_justice_focus': youth_justice_focus,
                    'expertise_areas': sector_type,
                    'engagement_priority': engagement_priority,
                    'contact_status': '',
                    'last_contact': '',
                    'source_file': 'CONX_Master_Contacts__Expanded_Media_.csv',
                    'public_contact_info': public_contact,
                    'interview_potential': 'High' if sector == 'Media' else 'Medium',
                    'notable_quotes': '',
                    'tags': sector_type,
                    'social_impact_sector': sector,
                    'media_reach': self.estimate_media_reach(organisation, title),
                    'philanthropic_capacity': 'Unknown',
                    'government_influence': 'High' if sector == 'Government' else 'Medium',
                    'lived_experience': 'Yes' if 'lived experience' in relevance.lower() else 'Unknown',
                    'research_background': 'Yes' if sector == 'Academic' else 'Unknown',
                    'funding_potential': 'High' if 'foundation' in organisation.lower() else 'Unknown',
                    'collaboration_opportunities': relevance,
                    'notes': relevance
                }

                contacts.append(contact)

        except Exception as e:
            self.logger.error(f"Error processing {filepath}: {e}")

        self.logger.info(f"Processed {len(contacts)} contacts from {filepath}")
        return contacts

    def process_every_contact_csv(self, filepath: str) -> List[Dict]:
        """Process the Every Contact CSV file."""
        self.logger.info(f"Processing {filepath}")
        contacts = []

        try:
            df = pd.read_csv(filepath)

            for _, row in df.iterrows():
                name = str(row.get('Name', '')).strip()
                if not name or name == 'nan':
                    continue

                title = str(row.get('Title/Role', '')).strip()
                organisation = str(row.get('Organization', '')).strip()
                sector_type = str(row.get('Sector/Type', '')).strip()
                location = str(row.get('Location', '')).strip()
                relevance = str(row.get('Relevance to CONX Campaign', '')).strip()
                public_contact = str(row.get('Public Contact Info', '')).strip()

                # Calculate derived fields
                sector = self.standardize_sector(title, organisation, sector_type)
                relevance_score = self.calculate_relevance_score(title, organisation, relevance)
                indigenous_affiliation = self.detect_indigenous_affiliation(f"{name} {relevance}")
                youth_justice_focus = self.extract_youth_justice_focus(title, organisation, relevance)
                engagement_priority = self.determine_engagement_priority(
                    relevance_score, sector, indigenous_affiliation
                )

                contact = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'title': title,
                    'organisation': organisation,
                    'sector': sector,
                    'location': location,
                    'state_region': self._extract_state_from_location(location),
                    'indigenous_affiliation': indigenous_affiliation,
                    'email': '',
                    'phone': '',
                    'website': '',
                    'linkedin': '',
                    'twitter': '',
                    'relevance_score': relevance_score,
                    'youth_justice_focus': youth_justice_focus,
                    'expertise_areas': sector_type,
                    'engagement_priority': engagement_priority,
                    'contact_status': '',
                    'last_contact': '',
                    'source_file': 'CONX_Master_Contacts__Every_Contact_from_Full_Chat_.csv',
                    'public_contact_info': public_contact,
                    'interview_potential': 'High' if sector in ['Media', 'Government'] else 'Medium',
                    'notable_quotes': '',
                    'tags': sector_type,
                    'social_impact_sector': sector,
                    'media_reach': self.estimate_media_reach(organisation, title),
                    'philanthropic_capacity': 'Unknown',
                    'government_influence': 'High' if sector == 'Government' else 'Medium',
                    'lived_experience': 'Unknown',
                    'research_background': 'Yes' if sector == 'Academic' else 'Unknown',
                    'funding_potential': 'Unknown',
                    'collaboration_opportunities': relevance,
                    'notes': relevance
                }

                contacts.append(contact)

        except Exception as e:
            self.logger.error(f"Error processing {filepath}: {e}")

        self.logger.info(f"Processed {len(contacts)} contacts from {filepath}")
        return contacts

    def process_more_contained_csv(self, filepath: str) -> List[Dict]:
        """Process the More Contained People CSV file."""
        self.logger.info(f"Processing {filepath}")
        contacts = []

        try:
            df = pd.read_csv(filepath, encoding='utf-8-sig')

            for _, row in df.iterrows():
                name = str(row.get('Name', '')).strip()
                if not name or name == 'nan':
                    continue

                title = str(row.get('Title/Role', '')).strip()
                category = str(row.get('Category', '')).strip()
                relevance = str(row.get('Relevance/How They Can Support', '')).strip()

                # Calculate derived fields
                sector = self.standardize_sector(title, '', category)
                relevance_score = self.calculate_relevance_score(title, '', relevance)
                indigenous_affiliation = self.detect_indigenous_affiliation(f"{name} {relevance}")
                youth_justice_focus = self.extract_youth_justice_focus(title, '', relevance)
                engagement_priority = self.determine_engagement_priority(
                    relevance_score, sector, indigenous_affiliation
                )

                contact = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'title': title,
                    'organisation': '',
                    'sector': sector,
                    'location': '',
                    'state_region': self._extract_state_from_text(relevance),
                    'indigenous_affiliation': indigenous_affiliation,
                    'email': '',
                    'phone': '',
                    'website': '',
                    'linkedin': '',
                    'twitter': '',
                    'relevance_score': relevance_score,
                    'youth_justice_focus': youth_justice_focus,
                    'expertise_areas': category,
                    'engagement_priority': engagement_priority,
                    'contact_status': '',
                    'last_contact': '',
                    'source_file': 'More Contained peopel 252ebcf981cf80ddb4ddfcdd6fdb53a6.csv',
                    'public_contact_info': '',
                    'interview_potential': 'High' if category in ['Politician', 'Judge/Magistrate'] else 'Medium',
                    'notable_quotes': '',
                    'tags': category,
                    'social_impact_sector': sector,
                    'media_reach': 'Unknown',
                    'philanthropic_capacity': 'Unknown',
                    'government_influence': 'High' if category == 'Politician' else 'Medium',
                    'lived_experience': 'Yes' if 'lived experience' in relevance.lower() else 'Unknown',
                    'research_background': 'Unknown',
                    'funding_potential': 'Unknown',
                    'collaboration_opportunities': relevance,
                    'notes': relevance
                }

                contacts.append(contact)

        except Exception as e:
            self.logger.error(f"Error processing {filepath}: {e}")

        self.logger.info(f"Processed {len(contacts)} contacts from {filepath}")
        return contacts

    def process_contained_people_csv(self, filepath: str) -> List[Dict]:
        """Process the Contained People CSV file."""
        self.logger.info(f"Processing {filepath}")
        contacts = []

        try:
            df = pd.read_csv(filepath, encoding='utf-8-sig')

            for _, row in df.iterrows():
                name = str(row.get('Name', '')).strip()
                if not name or name == 'nan':
                    continue

                title = str(row.get('Role/Title', '')).strip()
                organisation = str(row.get('Organisation', '')).strip()
                focus_area = str(row.get('Focus Area', '')).strip()
                state_region = str(row.get('State/Region', '')).strip()
                indigenous_affiliation = str(row.get('Indigenous Affiliation', '')).strip()
                interview_potential = str(row.get('Interview Potential', '')).strip()
                contact_info = str(row.get('Contact', '')).strip()
                notable_quote = str(row.get('Notable Quote / Contribution', '')).strip()

                # Calculate derived fields
                sector = self.standardize_sector(title, organisation, focus_area)
                relevance_score = self.calculate_relevance_score(title, organisation, focus_area)
                youth_justice_focus = self.extract_youth_justice_focus(title, organisation, focus_area)
                engagement_priority = self.determine_engagement_priority(
                    relevance_score, sector, indigenous_affiliation
                )

                # Standardize indigenous affiliation
                if indigenous_affiliation.lower() in ['yes', 'no']:
                    indigenous_status = indigenous_affiliation.title()
                elif any(indicator in indigenous_affiliation.lower() for indicator in self.indigenous_indicators):
                    indigenous_status = 'Yes'
                else:
                    indigenous_status = 'Unknown'

                contact = {
                    'id': str(uuid.uuid4()),
                    'name': name,
                    'title': title,
                    'organisation': organisation,
                    'sector': sector,
                    'location': '',
                    'state_region': state_region,
                    'indigenous_affiliation': indigenous_status,
                    'email': '',
                    'phone': '',
                    'website': '',
                    'linkedin': '',
                    'twitter': '',
                    'relevance_score': relevance_score,
                    'youth_justice_focus': youth_justice_focus,
                    'expertise_areas': focus_area,
                    'engagement_priority': engagement_priority,
                    'contact_status': '',
                    'last_contact': '',
                    'source_file': 'Contained people 252ebcf981cf806fadaefba0faee991b.csv',
                    'public_contact_info': contact_info,
                    'interview_potential': interview_potential,
                    'notable_quotes': notable_quote,
                    'tags': focus_area,
                    'social_impact_sector': sector,
                    'media_reach': 'Unknown',
                    'philanthropic_capacity': 'Unknown',
                    'government_influence': 'High' if sector == 'Government' else 'Medium',
                    'lived_experience': 'Yes' if 'lived experience' in focus_area.lower() else 'Unknown',
                    'research_background': 'Yes' if sector == 'Academic' else 'Unknown',
                    'funding_potential': 'Unknown',
                    'collaboration_opportunities': focus_area,
                    'notes': notable_quote
                }

                contacts.append(contact)

        except Exception as e:
            self.logger.error(f"Error processing {filepath}: {e}")

        self.logger.info(f"Processed {len(contacts)} contacts from {filepath}")
        return contacts

    def _extract_state_from_location(self, location: str) -> str:
        """Extract state/region from location string."""
        if not location:
            return ''

        state_mappings = {
            'NSW': ['nsw', 'new south wales', 'sydney'],
            'VIC': ['vic', 'victoria', 'melbourne'],
            'QLD': ['qld', 'queensland', 'brisbane'],
            'WA': ['wa', 'western australia', 'perth'],
            'SA': ['sa', 'south australia', 'adelaide'],
            'TAS': ['tas', 'tasmania', 'hobart'],
            'NT': ['nt', 'northern territory', 'darwin'],
            'ACT': ['act', 'australian capital territory', 'canberra']
        }

        location_lower = location.lower()
        for state, indicators in state_mappings.items():
            if any(indicator in location_lower for indicator in indicators):
                return state

        return ''

    def _extract_state_from_text(self, text: str) -> str:
        """Extract state/region from general text."""
        if not text:
            return ''

        state_patterns = ['qld', 'nsw', 'vic', 'wa', 'sa', 'tas', 'nt', 'act',
                         'queensland', 'new south wales', 'victoria', 'western australia',
                         'south australia', 'tasmania', 'northern territory',
                         'australian capital territory']

        text_lower = text.lower()
        for pattern in state_patterns:
            if pattern in text_lower:
                return pattern.upper()[:3]

        return ''

    def _extract_twitter_from_contact(self, contact_info: str) -> str:
        """Extract Twitter handle from contact information."""
        if not contact_info:
            return ''

        # Look for Twitter/X handles
        twitter_pattern = r'@[\w_]+'
        matches = re.findall(twitter_pattern, contact_info)
        return matches[0] if matches else ''

    def remove_duplicates(self, contacts: List[Dict]) -> List[Dict]:
        """
        Remove duplicate contacts based on name and organisation.

        Args:
            contacts: List of contact dictionaries

        Returns:
            Deduplicated list of contacts
        """
        seen = set()
        unique_contacts = []

        for contact in contacts:
            # Create a key for duplicate detection
            key = (
                contact['name'].lower().strip(),
                contact['organisation'].lower().strip()
            )

            if key not in seen:
                seen.add(key)
                unique_contacts.append(contact)
            else:
                self.logger.info(f"Duplicate found and removed: {contact['name']} at {contact['organisation']}")

        self.logger.info(f"Removed {len(contacts) - len(unique_contacts)} duplicates")
        return unique_contacts

    def consolidate_all_files(self) -> None:
        """Consolidate all CSV files into the master database."""
        all_contacts = []

        # File processing map
        file_processors = {
            'People 47bdc1c4df994ddc81c4a0214c919d69.csv': self.process_people_csv,
            'CONX_Master_Contacts__Expanded_Media_.csv': self.process_expanded_media_csv,
            'CONX_Master_Contacts__Every_Contact_from_Full_Chat_.csv': self.process_every_contact_csv,
            'More Contained peopel 252ebcf981cf80ddb4ddfcdd6fdb53a6.csv': self.process_more_contained_csv,
            'Contained people 252ebcf981cf806fadaefba0faee991b.csv': self.process_contained_people_csv
        }

        # Process each file
        for filename, processor in file_processors.items():
            filepath = os.path.join(self.input_dir, filename)
            if os.path.exists(filepath):
                contacts = processor(filepath)
                all_contacts.extend(contacts)
            else:
                self.logger.warning(f"File not found: {filepath}")

        # Remove duplicates
        unique_contacts = self.remove_duplicates(all_contacts)

        # Sort by relevance score (highest first) and then by name
        unique_contacts.sort(key=lambda x: (-x['relevance_score'], x['name']))

        self.master_contacts = unique_contacts
        self.logger.info(f"Consolidated {len(unique_contacts)} unique contacts")

    def export_to_csv(self) -> None:
        """Export consolidated contacts to CSV file."""
        if not self.master_contacts:
            self.logger.error("No contacts to export")
            return

        # Define field order
        fieldnames = [
            'id', 'name', 'title', 'organisation', 'sector', 'location', 'state_region',
            'indigenous_affiliation', 'email', 'phone', 'website', 'linkedin', 'twitter',
            'relevance_score', 'youth_justice_focus', 'expertise_areas', 'engagement_priority',
            'contact_status', 'last_contact', 'source_file', 'public_contact_info',
            'interview_potential', 'notable_quotes', 'tags', 'social_impact_sector',
            'media_reach', 'philanthropic_capacity', 'government_influence', 'lived_experience',
            'research_background', 'funding_potential', 'collaboration_opportunities', 'notes'
        ]

        try:
            with open(self.output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(self.master_contacts)

            self.logger.info(f"Successfully exported {len(self.master_contacts)} contacts to {self.output_file}")

        except Exception as e:
            self.logger.error(f"Error exporting to CSV: {e}")

    def generate_summary_report(self) -> None:
        """Generate a summary report of the consolidation."""
        if not self.master_contacts:
            return

        # Calculate statistics
        total_contacts = len(self.master_contacts)
        sectors = {}
        relevance_distribution = {}
        indigenous_count = 0
        high_priority_count = 0

        for contact in self.master_contacts:
            # Sector distribution
            sector = contact['sector']
            sectors[sector] = sectors.get(sector, 0) + 1

            # Relevance score distribution
            score = contact['relevance_score']
            relevance_distribution[score] = relevance_distribution.get(score, 0) + 1

            # Indigenous affiliation count
            if contact['indigenous_affiliation'] == 'Yes':
                indigenous_count += 1

            # High priority count
            if contact['engagement_priority'] == 'High':
                high_priority_count += 1

        # Print summary report
        print("\n" + "="*60)
        print("YOUTH JUSTICE CONTACTS CONSOLIDATION SUMMARY")
        print("="*60)
        print(f"Total contacts consolidated: {total_contacts}")
        print(f"Indigenous contacts: {indigenous_count}")
        print(f"High priority contacts: {high_priority_count}")

        print(f"\nSector Distribution:")
        for sector, count in sorted(sectors.items(), key=lambda x: x[1], reverse=True):
            print(f"  {sector}: {count}")

        print(f"\nRelevance Score Distribution:")
        for score in sorted(relevance_distribution.keys(), reverse=True):
            count = relevance_distribution[score]
            print(f"  Score {score}: {count} contacts")

        print(f"\nOutput file: {self.output_file}")
        print("="*60)


def main():
    """Main execution function."""
    # Configuration
    input_directory = "/Users/benknight/Code/ACT Placemat/Docs/LinkedIn/Contianed"
    output_file = "/Users/benknight/Code/ACT Placemat/youth-justice-master-contacts.csv"

    # Initialize consolidator
    consolidator = YouthJusticeContactsConsolidator(input_directory, output_file)

    # Run consolidation process
    print("Starting Youth Justice Contacts consolidation...")
    consolidator.consolidate_all_files()
    consolidator.export_to_csv()
    consolidator.generate_summary_report()
    print("Consolidation complete!")


if __name__ == "__main__":
    main()