#!/usr/bin/env python3
"""
Email Contact Processing and Intelligence Script

This script processes a list of email contacts, enriches them with research,
applies strategic analysis, and integrates with the existing contact database.

Features:
- Email parsing and name/organization extraction
- AI-powered web research for contact enrichment
- 5-dimensional scoring framework
- Sector categorization and priority assessment
- Database integration with duplicate detection
- Strategic analysis and reporting

Author: ACT Placemat Intelligence System
Date: 2025-09-13
"""

import os
import re
import csv
import json
import logging
import asyncio
import aiohttp
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import pandas as pd
from urllib.parse import quote_plus
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('contact_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ContactProfile:
    """Comprehensive contact profile with strategic assessment"""
    # Basic Information
    email: str
    name: str = ""
    first_name: str = ""
    last_name: str = ""
    organization: str = ""
    domain: str = ""

    # Professional Details
    title: str = ""
    department: str = ""
    sector: str = ""
    location: str = ""
    phone: str = ""

    # Strategic Assessment (5-dimensional framework)
    influence_score: int = 0  # 1-5: Policy influence and decision-making power
    alignment_score: int = 0  # 1-5: Alignment with youth justice goals
    accessibility_score: int = 0  # 1-5: Likelihood of engagement
    resource_score: int = 0  # 1-5: Access to resources/funding
    network_score: int = 0  # 1-5: Network connections and reach

    # Categorical Assessments
    priority_level: str = "Medium"  # High, Medium, Low
    engagement_strategy: str = ""
    indigenous_affiliation: bool = False
    youth_justice_relevance: str = "Unknown"  # High, Medium, Low, Unknown

    # Research Data
    linkedin_url: str = ""
    social_media: str = ""
    recent_activities: str = ""
    publications: str = ""
    key_interests: str = ""
    research_summary: str = ""
    research_confidence: str = "Low"  # High, Medium, Low

    # Metadata
    date_added: str = ""
    source: str = "Email List Processing"
    notes: str = ""

class ContactIntelligence:
    """AI-powered contact research and analysis system"""

    def __init__(self):
        self.session = None
        self.research_delay = 2  # Seconds between requests

        # Initialize API keys from environment
        self.perplexity_key = os.getenv('PERPLEXITY_API_KEY')
        self.openai_key = os.getenv('OPENAI_API_KEY')

        # Sector mapping patterns
        self.sector_patterns = {
            '.gov.au': 'Government',
            '.edu.au': 'Academic',
            'minderoo.org': 'Foundation',
            'paulramsayfoundation.org.au': 'Foundation',
            'justreinvest.org.au': 'Justice Reform NGO',
            'accountablefutures.org.au': 'Social Impact NGO',
            'missionaustralia.com.au': 'Social Services NGO',
            'maranguka.org.au': 'Indigenous Organization',
            'ngaitahu.iwi.nz': 'Indigenous Organization',
            'centreforpublicimpact.org': 'Policy Think Tank',
            'un.org': 'International Organization'
        }

        # Indigenous organization indicators
        self.indigenous_indicators = [
            'ngaitahu', 'maranguka', 'iwi.nz', 'aboriginal', 'indigenous',
            'torres strait', 'koori', 'murri', 'yolngu', 'anangu'
        ]

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    def parse_email_list(self, email_string: str) -> List[str]:
        """Parse comma-separated email list"""
        emails = []

        # Split by comma and clean
        raw_emails = email_string.split(',')

        for item in raw_emails:
            item = item.strip()

            # Extract email from "Name email@domain.com" format
            email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', item)
            if email_match:
                emails.append(email_match.group(1))

        return list(set(emails))  # Remove duplicates

    def extract_basic_info(self, email: str) -> ContactProfile:
        """Extract basic information from email address"""
        profile = ContactProfile(email=email)
        profile.date_added = datetime.now().strftime('%Y-%m-%d')

        # Extract domain
        profile.domain = email.split('@')[1] if '@' in email else ""

        # Extract potential name from email
        local_part = email.split('@')[0]

        # Handle different email formats
        if '.' in local_part:
            parts = local_part.replace('_', '.').replace('-', '.').split('.')
            if len(parts) >= 2:
                profile.first_name = parts[0].title()
                profile.last_name = parts[1].title()
                profile.name = f"{profile.first_name} {profile.last_name}"
        else:
            profile.name = local_part.title()
            profile.first_name = local_part.title()

        # Determine sector from domain
        for pattern, sector in self.sector_patterns.items():
            if pattern in profile.domain:
                profile.sector = sector
                break
        else:
            profile.sector = "Private/Other"

        # Check for indigenous affiliation
        email_lower = email.lower()
        profile.indigenous_affiliation = any(
            indicator in email_lower for indicator in self.indigenous_indicators
        )

        # Extract organization from domain
        if profile.domain:
            org_parts = profile.domain.split('.')
            if len(org_parts) >= 2:
                profile.organization = org_parts[0].title()

        return profile

    async def research_contact_ai(self, profile: ContactProfile) -> ContactProfile:
        """Use AI to research and enrich contact information"""
        if not self.perplexity_key and not self.openai_key:
            logger.warning("No AI API keys available for research")
            return profile

        try:
            # Construct research query
            query = f"""
            Research professional information for: {profile.name} {profile.email}
            Organization: {profile.organization} ({profile.domain})

            Please provide:
            1. Current role/title and organization details
            2. LinkedIn profile URL if available
            3. Involvement in youth justice, criminal justice reform, social impact, or government policy
            4. Recent professional activities, publications, or statements
            5. Contact information (phone, social media)
            6. Indigenous background if apparent from public information
            7. Assessment of relevance to youth justice advocacy (High/Medium/Low)

            Focus on factual, publicly available information.
            """

            research_data = await self._query_perplexity(query)
            if research_data:
                profile = self._parse_research_response(profile, research_data)
                profile.research_confidence = "High"
            else:
                logger.warning(f"No research data retrieved for {profile.email}")

            # Add delay to respect rate limits
            await asyncio.sleep(self.research_delay)

        except Exception as e:
            logger.error(f"Research failed for {profile.email}: {str(e)}")
            profile.research_confidence = "Low"

        return profile

    async def _query_perplexity(self, query: str) -> Optional[str]:
        """Query Perplexity AI for research"""
        if not self.perplexity_key:
            return None

        url = "https://api.perplexity.ai/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.perplexity_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.1-sonar-large-128k-online",
            "messages": [
                {"role": "system", "content": "You are a professional researcher specializing in public information gathering for strategic networking purposes. Provide factual, publicly available information only."},
                {"role": "user", "content": query}
            ],
            "max_tokens": 1000,
            "temperature": 0.2
        }

        try:
            async with self.session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return data['choices'][0]['message']['content']
                else:
                    logger.error(f"Perplexity API error: {response.status}")
                    return None
        except Exception as e:
            logger.error(f"Perplexity query failed: {str(e)}")
            return None

    def _parse_research_response(self, profile: ContactProfile, research_data: str) -> ContactProfile:
        """Parse AI research response and update profile"""
        research_lower = research_data.lower()

        # Extract LinkedIn URL
        linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', research_data, re.IGNORECASE)
        if linkedin_match:
            profile.linkedin_url = f"https://{linkedin_match.group()}"

        # Update research summary
        profile.research_summary = research_data[:500] + "..." if len(research_data) > 500 else research_data

        # Assess youth justice relevance
        justice_keywords = [
            'youth justice', 'criminal justice', 'juvenile justice', 'justice reform',
            'prison reform', 'rehabilitation', 'recidivism', 'young offender',
            'community justice', 'restorative justice', 'diversion program'
        ]

        relevance_score = sum(1 for keyword in justice_keywords if keyword in research_lower)
        if relevance_score >= 3:
            profile.youth_justice_relevance = "High"
        elif relevance_score >= 1:
            profile.youth_justice_relevance = "Medium"
        else:
            profile.youth_justice_relevance = "Low"

        # Check for indigenous affiliation in research
        indigenous_keywords = ['indigenous', 'aboriginal', 'torres strait', 'first nations', 'maori']
        if any(keyword in research_lower for keyword in indigenous_keywords):
            profile.indigenous_affiliation = True

        return profile

    def calculate_strategic_scores(self, profile: ContactProfile) -> ContactProfile:
        """Calculate 5-dimensional strategic scores"""

        # 1. Influence Score (1-5)
        influence_indicators = {
            'Government': 4,
            'Foundation': 4,
            'Academic': 3,
            'Policy Think Tank': 4,
            'International Organization': 5
        }
        profile.influence_score = influence_indicators.get(profile.sector, 2)

        # Boost for senior roles
        senior_keywords = ['director', 'manager', 'head', 'chief', 'senior', 'lead']
        if any(keyword in profile.title.lower() for keyword in senior_keywords):
            profile.influence_score = min(5, profile.influence_score + 1)

        # 2. Alignment Score (1-5)
        if profile.youth_justice_relevance == "High":
            profile.alignment_score = 5
        elif profile.youth_justice_relevance == "Medium":
            profile.alignment_score = 3
        elif profile.sector in ['Justice Reform NGO', 'Social Impact NGO']:
            profile.alignment_score = 4
        else:
            profile.alignment_score = 2

        # 3. Accessibility Score (1-5)
        accessibility_map = {
            'Academic': 4,
            'NGO': 4,
            'Foundation': 3,
            'Government': 2,
            'International Organization': 2
        }
        base_sector = profile.sector.split()[0] if profile.sector else 'Other'
        profile.accessibility_score = accessibility_map.get(base_sector, 3)

        # 4. Resource Score (1-5)
        resource_indicators = {
            'Foundation': 5,
            'Government': 4,
            'International Organization': 4,
            'Academic': 3
        }
        profile.resource_score = resource_indicators.get(profile.sector, 2)

        # 5. Network Score (1-5)
        # Base on sector and LinkedIn presence
        network_base = {
            'Government': 4,
            'Foundation': 4,
            'Policy Think Tank': 4,
            'Academic': 3
        }
        profile.network_score = network_base.get(profile.sector, 2)

        if profile.linkedin_url:
            profile.network_score = min(5, profile.network_score + 1)

        # Calculate overall priority level
        total_score = (
            profile.influence_score + profile.alignment_score +
            profile.accessibility_score + profile.resource_score +
            profile.network_score
        )

        if total_score >= 20:
            profile.priority_level = "High"
        elif total_score >= 15:
            profile.priority_level = "Medium"
        else:
            profile.priority_level = "Low"

        # Determine engagement strategy
        if profile.sector == "Government":
            profile.engagement_strategy = "Formal policy briefing"
        elif profile.sector in ["Foundation", "NGO"]:
            profile.engagement_strategy = "Collaborative partnership discussion"
        elif profile.sector == "Academic":
            profile.engagement_strategy = "Research collaboration invitation"
        else:
            profile.engagement_strategy = "Informational networking meeting"

        return profile

    async def process_contact_batch(self, emails: List[str]) -> List[ContactProfile]:
        """Process a batch of email contacts"""
        logger.info(f"Processing batch of {len(emails)} contacts")
        profiles = []

        for i, email in enumerate(emails):
            logger.info(f"Processing contact {i+1}/{len(emails)}: {email}")

            # Extract basic information
            profile = self.extract_basic_info(email)

            # Research and enrich
            profile = await self.research_contact_ai(profile)

            # Calculate strategic scores
            profile = self.calculate_strategic_scores(profile)

            profiles.append(profile)

            # Progress logging
            if (i + 1) % 10 == 0:
                logger.info(f"Completed {i + 1}/{len(emails)} contacts")

        return profiles

class DatabaseManager:
    """Manage contact database operations"""

    def __init__(self, master_csv_path: str = "youth-justice-master-contacts.csv"):
        self.master_csv_path = Path(master_csv_path)
        self.backup_path = Path(f"{master_csv_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}")

    def load_existing_contacts(self) -> pd.DataFrame:
        """Load existing contact database"""
        if not self.master_csv_path.exists():
            logger.info("No existing contact database found, creating new one")
            return pd.DataFrame()

        try:
            df = pd.read_csv(self.master_csv_path)
            logger.info(f"Loaded {len(df)} existing contacts")
            return df
        except Exception as e:
            logger.error(f"Error loading existing contacts: {str(e)}")
            return pd.DataFrame()

    def backup_existing_database(self):
        """Create backup of existing database"""
        if self.master_csv_path.exists():
            try:
                self.master_csv_path.rename(self.backup_path)
                logger.info(f"Created backup: {self.backup_path}")
            except Exception as e:
                logger.error(f"Backup failed: {str(e)}")

    def merge_contacts(self, existing_df: pd.DataFrame, new_profiles: List[ContactProfile]) -> pd.DataFrame:
        """Merge new contacts with existing database"""
        # Convert new profiles to DataFrame
        new_data = [asdict(profile) for profile in new_profiles]
        new_df = pd.DataFrame(new_data)

        if existing_df.empty:
            merged_df = new_df
        else:
            # Merge dataframes, handling different columns
            merged_df = pd.concat([existing_df, new_df], ignore_index=True, sort=False)

        # Remove duplicates based on email
        merged_df = merged_df.drop_duplicates(subset=['email'], keep='last')

        logger.info(f"Merged database contains {len(merged_df)} contacts")
        return merged_df

    def save_master_database(self, df: pd.DataFrame):
        """Save updated master database"""
        try:
            df.to_csv(self.master_csv_path, index=False)
            logger.info(f"Saved master database: {self.master_csv_path}")
        except Exception as e:
            logger.error(f"Failed to save master database: {str(e)}")

    def generate_priority_lists(self, df: pd.DataFrame):
        """Generate priority contact lists"""
        # High priority contacts
        high_priority = df[df['priority_level'] == 'High'].copy()
        high_priority = high_priority.sort_values(['influence_score', 'alignment_score'], ascending=False)
        high_priority.to_csv('youth-justice-high-priority-contacts.csv', index=False)

        # Government contacts
        govt_contacts = df[df['sector'] == 'Government'].copy()
        govt_contacts = govt_contacts.sort_values('influence_score', ascending=False)
        govt_contacts.to_csv('youth-justice-government-contacts.csv', index=False)

        # Indigenous contacts
        indigenous_contacts = df[df['indigenous_affiliation'] == True].copy()
        indigenous_contacts.to_csv('youth-justice-indigenous-contacts.csv', index=False)

        # Foundation contacts
        foundation_contacts = df[df['sector'].str.contains('Foundation', na=False)].copy()
        foundation_contacts.to_csv('youth-justice-foundation-contacts.csv', index=False)

        logger.info("Generated specialized contact lists")

class ReportGenerator:
    """Generate analysis and summary reports"""

    @staticmethod
    def generate_summary_report(profiles: List[ContactProfile], output_path: str = "contact_processing_report.md"):
        """Generate comprehensive processing summary"""

        # Statistics
        total_contacts = len(profiles)
        high_priority = sum(1 for p in profiles if p.priority_level == "High")
        medium_priority = sum(1 for p in profiles if p.priority_level == "Medium")
        low_priority = sum(1 for p in profiles if p.priority_level == "Low")

        # Sector breakdown
        sector_counts = {}
        for profile in profiles:
            sector = profile.sector or "Unknown"
            sector_counts[sector] = sector_counts.get(sector, 0) + 1

        # Indigenous contacts
        indigenous_count = sum(1 for p in profiles if p.indigenous_affiliation)

        # Youth justice relevance
        high_relevance = sum(1 for p in profiles if p.youth_justice_relevance == "High")
        medium_relevance = sum(1 for p in profiles if p.youth_justice_relevance == "Medium")

        # Generate report
        report = f"""# Contact Processing Summary Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Processing Statistics
- **Total Contacts Processed:** {total_contacts}
- **High Priority Contacts:** {high_priority} ({high_priority/total_contacts*100:.1f}%)
- **Medium Priority Contacts:** {medium_priority} ({medium_priority/total_contacts*100:.1f}%)
- **Low Priority Contacts:** {low_priority} ({low_priority/total_contacts*100:.1f}%)

## Sector Distribution
"""
        for sector, count in sorted(sector_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = count/total_contacts*100
            report += f"- **{sector}:** {count} contacts ({percentage:.1f}%)\n"

        report += f"""
## Strategic Analysis
- **Indigenous Affiliated Contacts:** {indigenous_count} ({indigenous_count/total_contacts*100:.1f}%)
- **High Youth Justice Relevance:** {high_relevance} ({high_relevance/total_contacts*100:.1f}%)
- **Medium Youth Justice Relevance:** {medium_relevance} ({medium_relevance/total_contacts*100:.1f}%)

## Top Priority Contacts
"""

        # List top 10 highest scoring contacts
        top_contacts = sorted(profiles, key=lambda x: (
            x.influence_score + x.alignment_score + x.accessibility_score +
            x.resource_score + x.network_score
        ), reverse=True)[:10]

        for i, contact in enumerate(top_contacts, 1):
            total_score = (contact.influence_score + contact.alignment_score +
                          contact.accessibility_score + contact.resource_score +
                          contact.network_score)
            report += f"{i}. **{contact.name}** ({contact.email})\n"
            report += f"   - Organization: {contact.organization}\n"
            report += f"   - Sector: {contact.sector}\n"
            report += f"   - Total Score: {total_score}/25\n"
            report += f"   - Engagement Strategy: {contact.engagement_strategy}\n\n"

        report += f"""
## Engagement Recommendations

### Immediate Actions (High Priority)
1. Focus on {high_priority} high-priority contacts for immediate outreach
2. Prioritize government contacts (.gov.au) for policy influence
3. Engage with foundation contacts for funding opportunities
4. Connect with indigenous organizations for culturally appropriate approaches

### Research Quality
- Contacts with high research confidence: {sum(1 for p in profiles if p.research_confidence == 'High')}
- Additional research recommended for contacts with low confidence ratings

### Next Steps
1. Review and validate contact information
2. Prepare targeted engagement materials
3. Schedule strategic outreach calendar
4. Monitor and track engagement responses

---
*Report generated by ACT Placemat Contact Intelligence System*
"""

        # Save report
        with open(output_path, 'w') as f:
            f.write(report)

        logger.info(f"Generated summary report: {output_path}")

async def main():
    """Main processing function"""
    logger.info("Starting email contact processing system")

    # Email list to process
    email_list = """agesharper@bigpond.com, allisonclarkeeval@gmail.com, Anika Baset anika@centreforpublicimpact.org, apteixeira.cultura@gmail.com, aurora@centreforpublicimpact.org, backbone@maranguka.org.au, belinda.woodhead@seerdata.com.au, bree.alexander@infrastructure.gov.au, bree.internet.governance@gmail.com, brent.ryan@yoorrook.org.au, chloe.benson@healthassembly.org.au, dave@khoreo.co, deborah.itzkowic@ambulance.vic.gov.au, dtownsend@uniting.org, elana.berton@csiro.au, emma@justreinvest.org.au, eruera.tarena@ngaitahu.iwi.nz, eve.chong@epa.nsw.gov.au, eve.millar@placeaustralia.org, finlay.batts@un.org, gemma@commonground.org.au, georgie.currie@kkt.org.au, gibbsebsworthdeykodah@gmail.com, glen.charlesworth@health.nsw.gov.au, gretel.evans@monash.edu, helen.cain@education.vic.gov.au, ian@justreinvest.org.au, icastledine@minderoo.org, impact@fwcp.com.au, info@folkal.com.au, jane@percolab.coop, janetmstiegler@gmail.com, joanna.tayler@dgs.vic.gov.au, joanne.dumalaon-canaria@sa.gov.au, julia.brownlie@emv.vic.gov.au, julia@thesocialalchemist.com.au, juliette.burroughs@education.vic.gov.au, karinamareemorgan@gmail.com, kat.reading@bbc.co.uk, katsamangosb@missionaustralia.com.au, kerry.laughton@ambulance.vic.gov.au, kim@reciproca.co, kirsten.kainz@justlearningsystems.org, kmckegg@me.com, kpargeter@maranguka.org.au, leahannek123@gmail.com, lisa.mcghee@dcj.nsw.gov.au, ltaafua@vichealth.vic.gov.au, lydia.turda@gmail.com, maddi.ginnivan@kkt.org.au, makayla@ourplace.org.au, mfong@vichealth.vic.gov.au, mia@accountablefutures.org.au, michel.alimasi2@gmail.com, michellebates@time-place.com.au, monica.bensberg@health.vic.gov.au, morgan@morganandco.au, mscaife@reichstein.org.au, msturrock@paulramsayfoundation.org.au, nazaninmt@gmail.com, ne.andemewa@gmail.com, neil.west7@nhs.net, nicole.y.mekler@gmail.com, nicole@accountablefutures.org.au, nidhi.misra@iclei.org, novela.corda@asylumseekerscentre.org.au, nrichards@wyatt.org.au, nuzhat.lotia@vla.vic.gov.au, oliviarosenman@gmail.com, paloma@ligadeciudadespr.com, parika.verma@pmc.gov.au, rachelfyfe@dusseldorp.org.au, rebecca.torti@griffithuni.edu.au, roselyne@leernoveren.nl, Roy McNamara-Smith rsmith@minderoo.org, rukasg@missionaustralia.com.au, samrye@gmail.com, sara.hearn@ianpotter.org.au, sbament@thefrontproject.org.au, sheridanh.martin@education.nt.gov.au, shrutika.band2803@gmail.com, Skye Trudgett skye@kowacollaboration.com, sonia.angel@vpsc.vic.gov.au, stephanie.percival@ssc-spc.gc.ca, stephdmoulton@gmail.com, strongsamantha4460@gmail.com, susan.edwards1@education.nt.gov.au, tanya.birkbeck@mainroads.wa.gov.au, tasha@accountablefutures.org.au, tatiana@emberinnovations.nz, Thea Snow thea@centreforpublicimpact.org, yemi.vomero@vla.vic.gov.au, yoshita@centreforpublicimpact.org"""

    # Initialize systems
    intelligence = ContactIntelligence()
    db_manager = DatabaseManager()

    try:
        async with intelligence:
            # Parse email list
            emails = intelligence.parse_email_list(email_list)
            logger.info(f"Parsed {len(emails)} unique emails")

            # Process contacts
            profiles = await intelligence.process_contact_batch(emails)

            # Database operations
            logger.info("Managing database integration")
            existing_df = db_manager.load_existing_contacts()
            db_manager.backup_existing_database()

            merged_df = db_manager.merge_contacts(existing_df, profiles)
            db_manager.save_master_database(merged_df)
            db_manager.generate_priority_lists(merged_df)

            # Generate reports
            logger.info("Generating analysis reports")
            ReportGenerator.generate_summary_report(profiles)

            # Final summary
            logger.info("="*50)
            logger.info("PROCESSING COMPLETE")
            logger.info(f"Total contacts processed: {len(profiles)}")
            logger.info(f"High priority contacts: {sum(1 for p in profiles if p.priority_level == 'High')}")
            logger.info(f"Government contacts: {sum(1 for p in profiles if p.sector == 'Government')}")
            logger.info(f"Indigenous affiliated: {sum(1 for p in profiles if p.indigenous_affiliation)}")
            logger.info("Files generated:")
            logger.info("- youth-justice-master-contacts.csv (updated)")
            logger.info("- youth-justice-high-priority-contacts.csv")
            logger.info("- youth-justice-government-contacts.csv")
            logger.info("- youth-justice-indigenous-contacts.csv")
            logger.info("- youth-justice-foundation-contacts.csv")
            logger.info("- contact_processing_report.md")
            logger.info("="*50)

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Check for required dependencies
    try:
        import aiohttp
        import pandas as pd
    except ImportError as e:
        print(f"Missing required dependency: {e}")
        print("Install with: pip install aiohttp pandas")
        exit(1)

    # Run main processing
    asyncio.run(main())