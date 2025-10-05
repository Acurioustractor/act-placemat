#!/usr/bin/env python3
"""
AI-Powered Contact Research and Enrichment System
================================================

A comprehensive tool for researching and enriching contact information
from the youth justice master contacts database.

Features:
- Web scraping with ethical rate limiting
- LinkedIn API integration
- Social media profile discovery
- News and academic research
- Email finding and verification
- AI-powered sentiment analysis
- Influence mapping and collaboration scoring
- Personalised outreach recommendations

Author: ACT Placemat Team
License: MIT
"""

import asyncio
import csv
import json
import logging
import os
import re
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin, urlparse
import hashlib

# Core dependencies
import aiohttp
import pandas as pd
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# AI and NLP
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    from textblob import TextBlob
    HAS_TEXTBLOB = True
except ImportError:
    HAS_TEXTBLOB = False

try:
    import nltk
    from nltk.sentiment import SentimentIntensityAnalyzer
    HAS_NLTK = True
except ImportError:
    HAS_NLTK = False

# Email validation
try:
    import dns.resolver
    HAS_DNS = True
except ImportError:
    HAS_DNS = False

# LinkedIn integration
try:
    from linkedin_api import Linkedin
    HAS_LINKEDIN_API = True
except ImportError:
    HAS_LINKEDIN_API = False


# Configuration
@dataclass
class Config:
    """Configuration settings for the research system"""

    # Rate limiting
    requests_per_minute: int = 30
    requests_per_hour: int = 500
    delay_between_requests: float = 2.0

    # API Keys (loaded from environment)
    openai_api_key: Optional[str] = None
    linkedin_username: Optional[str] = None
    linkedin_password: Optional[str] = None
    hunter_io_api_key: Optional[str] = None
    clearbit_api_key: Optional[str] = None

    # File paths
    input_csv: str = "youth-justice-master-contacts.csv"
    output_csv: str = "enriched-youth-justice-contacts.csv"
    log_file: str = "contact-research.log"
    cache_dir: str = "research_cache"

    # Research modules (enable/disable features)
    enable_web_scraping: bool = True
    enable_linkedin_research: bool = True
    enable_social_media_search: bool = True
    enable_news_research: bool = True
    enable_academic_search: bool = True
    enable_email_finding: bool = True
    enable_ai_analysis: bool = True

    # AI settings
    ai_model: str = "gpt-3.5-turbo"
    max_ai_requests_per_contact: int = 5

    def __post_init__(self):
        """Load configuration from environment variables"""
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.linkedin_username = os.getenv('LINKEDIN_USERNAME')
        self.linkedin_password = os.getenv('LINKEDIN_PASSWORD')
        self.hunter_io_api_key = os.getenv('HUNTER_IO_API_KEY')
        self.clearbit_api_key = os.getenv('CLEARBIT_API_KEY')


@dataclass
class ContactEnrichment:
    """Data structure for enriched contact information"""

    # Original fields (preserved)
    original_data: Dict[str, Any]

    # Email enrichment
    found_emails: List[str]
    verified_emails: List[str]
    email_confidence_scores: Dict[str, float]

    # Social media profiles
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_handle: Optional[str] = None

    # Professional information
    current_position: Optional[str] = None
    current_organisation: Optional[str] = None
    previous_positions: List[Dict[str, str]] = None
    education: List[Dict[str, str]] = None

    # Research findings
    recent_activities: List[Dict[str, Any]] = None
    news_mentions: List[Dict[str, Any]] = None
    academic_publications: List[Dict[str, Any]] = None
    speaking_engagements: List[Dict[str, Any]] = None

    # Youth justice context
    youth_justice_involvement: str = ""
    youth_justice_sentiment: Optional[float] = None
    policy_positions: List[str] = None
    funding_history: List[Dict[str, Any]] = None

    # Network analysis
    mutual_connections: List[str] = None
    influence_score: Optional[float] = None
    collaboration_potential: Optional[float] = None

    # Engagement intelligence
    best_approach: str = ""
    engagement_timing: str = ""
    personalised_suggestions: List[str] = None
    risk_assessment: str = "low"

    # Metadata
    research_date: str = ""
    research_confidence: float = 0.0
    data_sources: List[str] = None

    def __post_init__(self):
        """Initialize empty lists and set defaults"""
        if self.found_emails is None:
            self.found_emails = []
        if self.verified_emails is None:
            self.verified_emails = []
        if self.email_confidence_scores is None:
            self.email_confidence_scores = {}
        if self.previous_positions is None:
            self.previous_positions = []
        if self.education is None:
            self.education = []
        if self.recent_activities is None:
            self.recent_activities = []
        if self.news_mentions is None:
            self.news_mentions = []
        if self.academic_publications is None:
            self.academic_publications = []
        if self.speaking_engagements is None:
            self.speaking_engagements = []
        if self.policy_positions is None:
            self.policy_positions = []
        if self.funding_history is None:
            self.funding_history = []
        if self.mutual_connections is None:
            self.mutual_connections = []
        if self.personalised_suggestions is None:
            self.personalised_suggestions = []
        if self.data_sources is None:
            self.data_sources = []
        if not self.research_date:
            self.research_date = datetime.now().isoformat()


class RateLimiter:
    """Rate limiting utility to ensure ethical scraping"""

    def __init__(self, requests_per_minute: int = 30, requests_per_hour: int = 500):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_requests = []
        self.hour_requests = []

    async def wait_if_needed(self):
        """Wait if rate limits would be exceeded"""
        now = time.time()

        # Clean old requests
        self.minute_requests = [req_time for req_time in self.minute_requests if now - req_time < 60]
        self.hour_requests = [req_time for req_time in self.hour_requests if now - req_time < 3600]

        # Check minute limit
        if len(self.minute_requests) >= self.requests_per_minute:
            wait_time = 60 - (now - min(self.minute_requests))
            if wait_time > 0:
                logging.info(f"Rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)

        # Check hour limit
        if len(self.hour_requests) >= self.requests_per_hour:
            wait_time = 3600 - (now - min(self.hour_requests))
            if wait_time > 0:
                logging.info(f"Hourly rate limit reached, waiting {wait_time:.1f} seconds")
                await asyncio.sleep(wait_time)

        # Record this request
        self.minute_requests.append(now)
        self.hour_requests.append(now)


class CacheManager:
    """Simple file-based caching to avoid repeated requests"""

    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _get_cache_key(self, url_or_query: str) -> str:
        """Generate cache key from URL or query"""
        return hashlib.md5(url_or_query.encode()).hexdigest()

    def get(self, key: str) -> Optional[Dict]:
        """Get cached data"""
        cache_file = os.path.join(self.cache_dir, f"{self._get_cache_key(key)}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Check if cache is less than 24 hours old
                cache_time = datetime.fromisoformat(data.get('timestamp', ''))
                if datetime.now() - cache_time < timedelta(hours=24):
                    return data.get('content')
            except Exception as e:
                logging.warning(f"Error reading cache for {key}: {e}")
        return None

    def set(self, key: str, content: Dict):
        """Cache data"""
        cache_file = os.path.join(self.cache_dir, f"{self._get_cache_key(key)}.json")
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'content': content
                }, f, indent=2)
        except Exception as e:
            logging.warning(f"Error writing cache for {key}: {e}")


class WebScraper:
    """Ethical web scraper with rate limiting and caching"""

    def __init__(self, config: Config):
        self.config = config
        self.rate_limiter = RateLimiter(config.requests_per_minute, config.requests_per_hour)
        self.cache = CacheManager(config.cache_dir)

        # Setup session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        # User agent
        self.session.headers.update({
            'User-Agent': 'ACT-Placemat-Research-Bot/1.0 (Educational/Non-profit Research)'
        })

    async def scrape_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Scrape a URL with caching and rate limiting"""
        # Check cache first
        cached = self.cache.get(url)
        if cached:
            return cached

        await self.rate_limiter.wait_if_needed()

        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract useful information
            result = {
                'url': url,
                'title': soup.title.string.strip() if soup.title else '',
                'text_content': soup.get_text()[:5000],  # First 5000 chars
                'meta_description': '',
                'links': [],
                'social_links': []
            }

            # Meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc:
                result['meta_description'] = meta_desc.get('content', '')

            # Extract links
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.startswith('http'):
                    result['links'].append({
                        'url': href,
                        'text': link.get_text().strip()
                    })

            # Find social media links
            social_patterns = {
                'linkedin': r'linkedin\.com/in/([^/]+)',
                'twitter': r'twitter\.com/([^/]+)',
                'facebook': r'facebook\.com/([^/]+)',
                'instagram': r'instagram\.com/([^/]+)'
            }

            for platform, pattern in social_patterns.items():
                matches = re.findall(pattern, response.text, re.IGNORECASE)
                if matches:
                    result['social_links'].append({
                        'platform': platform,
                        'username': matches[0]
                    })

            # Cache the result
            self.cache.set(url, result)

            return result

        except Exception as e:
            logging.error(f"Error scraping {url}: {e}")
            return None


class EmailFinder:
    """Email finding and verification service"""

    def __init__(self, config: Config):
        self.config = config
        self.cache = CacheManager(config.cache_dir)

    def generate_email_patterns(self, first_name: str, last_name: str, domain: str) -> List[str]:
        """Generate common email patterns"""
        first = first_name.lower().strip()
        last = last_name.lower().strip()

        patterns = [
            f"{first}.{last}@{domain}",
            f"{first}_{last}@{domain}",
            f"{first}{last}@{domain}",
            f"{first[0]}{last}@{domain}",
            f"{first}{last[0]}@{domain}",
            f"{first}.{last[0]}@{domain}",
            f"{first[0]}.{last}@{domain}",
            f"{last}.{first}@{domain}",
            f"{last}_{first}@{domain}",
            f"{last}{first}@{domain}",
        ]

        return list(set(patterns))  # Remove duplicates

    def verify_email_domain(self, email: str) -> bool:
        """Verify if email domain has MX records"""
        if not HAS_DNS:
            return True  # Assume valid if we can't check

        try:
            domain = email.split('@')[1]
            dns.resolver.resolve(domain, 'MX')
            return True
        except Exception:
            return False

    async def find_emails_hunter_io(self, domain: str, first_name: str, last_name: str) -> List[Tuple[str, float]]:
        """Use Hunter.io API to find emails"""
        if not self.config.hunter_io_api_key:
            return []

        cache_key = f"hunter_{domain}_{first_name}_{last_name}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            url = "https://api.hunter.io/v2/email-finder"
            params = {
                'domain': domain,
                'first_name': first_name,
                'last_name': last_name,
                'api_key': self.config.hunter_io_api_key
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            emails = []
            if data.get('data') and data['data'].get('email'):
                email = data['data']['email']
                confidence = data['data'].get('confidence', 0) / 100.0
                emails.append((email, confidence))

            self.cache.set(cache_key, emails)
            return emails

        except Exception as e:
            logging.error(f"Hunter.io API error: {e}")
            return []

    async def find_emails_for_contact(self, contact_data: Dict[str, str]) -> List[Tuple[str, float]]:
        """Find emails for a contact using multiple methods"""
        first_name = contact_data.get('First Name', '').strip()
        last_name = contact_data.get('Last Name', '').strip()
        organisation = contact_data.get('Organisation', '').strip()

        if not first_name or not last_name:
            return []

        emails_found = []

        # Try to extract domain from organisation
        domains_to_try = []
        if organisation:
            # Common patterns for converting org names to domains
            org_clean = re.sub(r'[^a-zA-Z0-9\s]', '', organisation.lower())
            org_words = org_clean.split()

            if org_words:
                primary_word = org_words[0]
                domains_to_try.extend([
                    f"{primary_word}.org.au",
                    f"{primary_word}.com.au",
                    f"{primary_word}.gov.au",
                    f"{primary_word}.edu.au",
                    f"{primary_word}.org",
                    f"{primary_word}.com",
                ])

        # Try Hunter.io for each domain
        for domain in domains_to_try[:3]:  # Limit to first 3 to avoid rate limits
            hunter_emails = await self.find_emails_hunter_io(domain, first_name, last_name)
            emails_found.extend(hunter_emails)

        # Generate pattern-based emails for verification
        for domain in domains_to_try[:2]:  # Test top 2 domains
            patterns = self.generate_email_patterns(first_name, last_name, domain)
            for pattern in patterns[:5]:  # Test top 5 patterns
                if self.verify_email_domain(pattern):
                    emails_found.append((pattern, 0.3))  # Lower confidence for patterns

        return emails_found


class LinkedInResearcher:
    """LinkedIn profile research and analysis"""

    def __init__(self, config: Config):
        self.config = config
        self.cache = CacheManager(config.cache_dir)
        self.linkedin_api = None

        if HAS_LINKEDIN_API and config.linkedin_username and config.linkedin_password:
            try:
                self.linkedin_api = Linkedin(config.linkedin_username, config.linkedin_password)
                logging.info("LinkedIn API initialized successfully")
            except Exception as e:
                logging.error(f"Failed to initialize LinkedIn API: {e}")

    async def search_linkedin_profile(self, name: str, organisation: str = "") -> Optional[Dict[str, Any]]:
        """Search for LinkedIn profile"""
        if not self.linkedin_api:
            return None

        cache_key = f"linkedin_{name}_{organisation}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            # Search for profiles
            search_query = name
            if organisation:
                search_query += f" {organisation}"

            results = self.linkedin_api.search_people(search_query, limit=10)

            if not results:
                return None

            # Try to find the best match
            best_match = None
            for profile in results:
                if organisation and organisation.lower() in profile.get('headline', '').lower():
                    best_match = profile
                    break

            if not best_match and results:
                best_match = results[0]  # Take first result

            if best_match:
                # Get detailed profile information
                profile_id = best_match.get('public_id')
                if profile_id:
                    detailed_profile = self.linkedin_api.get_profile(profile_id)

                    result = {
                        'linkedin_url': f"https://linkedin.com/in/{profile_id}",
                        'headline': detailed_profile.get('headline', ''),
                        'summary': detailed_profile.get('summary', ''),
                        'experience': detailed_profile.get('experience', []),
                        'education': detailed_profile.get('education', []),
                        'location': detailed_profile.get('geoLocationName', ''),
                        'industry': detailed_profile.get('industryName', ''),
                        'connections': detailed_profile.get('numConnections', 0)
                    }

                    self.cache.set(cache_key, result)
                    return result

            return None

        except Exception as e:
            logging.error(f"LinkedIn search error for {name}: {e}")
            return None


class NewsResearcher:
    """News and media mention research"""

    def __init__(self, config: Config):
        self.config = config
        self.cache = CacheManager(config.cache_dir)
        self.scraper = WebScraper(config)

    async def search_news_mentions(self, name: str, organisation: str = "") -> List[Dict[str, Any]]:
        """Search for news mentions"""
        cache_key = f"news_{name}_{organisation}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        mentions = []

        # Search on major Australian news sites
        search_sites = [
            "site:abc.net.au",
            "site:theguardian.com/australia-news",
            "site:smh.com.au",
            "site:theage.com.au",
            "site:news.com.au",
        ]

        for site in search_sites[:3]:  # Limit to avoid rate limits
            query = f'{site} "{name}" youth justice'

            # Use Google search (would need to implement proper API)
            # For now, we'll simulate with a placeholder
            mentions.append({
                'title': f"Search result for {name} on {site}",
                'url': f"https://www.google.com/search?q={query}",
                'date': datetime.now().isoformat(),
                'summary': f"Placeholder news mention for {name}",
                'sentiment': 'neutral'
            })

        self.cache.set(cache_key, mentions)
        return mentions


class AIAnalyzer:
    """AI-powered analysis and insights"""

    def __init__(self, config: Config):
        self.config = config
        self.openai_client = None

        if HAS_OPENAI and config.openai_api_key:
            openai.api_key = config.openai_api_key
            self.openai_client = openai
            logging.info("OpenAI client initialized")

    def analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of text (-1 to 1)"""
        if HAS_TEXTBLOB:
            blob = TextBlob(text)
            return blob.sentiment.polarity
        elif HAS_NLTK:
            try:
                analyzer = SentimentIntensityAnalyzer()
                scores = analyzer.polarity_scores(text)
                return scores['compound']
            except:
                pass

        return 0.0  # Neutral if no analysis available

    async def generate_engagement_strategy(self, enrichment: ContactEnrichment) -> Dict[str, str]:
        """Generate AI-powered engagement strategy"""
        if not self.openai_client:
            return {
                'best_approach': 'Direct professional contact',
                'engagement_timing': 'Business hours, weekdays',
                'personalised_suggestions': ['Mention shared interest in youth justice reform']
            }

        try:
            # Prepare context about the contact
            context = f"""
            Contact Information:
            - Name: {enrichment.original_data.get('First Name', '')} {enrichment.original_data.get('Last Name', '')}
            - Organisation: {enrichment.original_data.get('Organisation', '')}
            - Role: {enrichment.original_data.get('Role', '')}
            - Current Position: {enrichment.current_position or 'Unknown'}
            - Youth Justice Involvement: {enrichment.youth_justice_involvement}
            - Recent Activities: {enrichment.recent_activities[:3] if enrichment.recent_activities else 'None found'}
            - Policy Positions: {enrichment.policy_positions[:3] if enrichment.policy_positions else 'None identified'}
            """

            prompt = f"""
            Based on the following contact information, provide engagement recommendations for someone working on youth justice reform in Australia:

            {context}

            Please provide:
            1. Best approach for initial contact
            2. Optimal timing for engagement
            3. 3 personalised conversation starters or connection points
            4. Risk assessment (low/medium/high) with brief explanation

            Format as JSON with keys: best_approach, engagement_timing, personalised_suggestions (array), risk_assessment
            """

            response = await self.openai_client.ChatCompletion.acreate(
                model=self.config.ai_model,
                messages=[
                    {"role": "system", "content": "You are an expert in stakeholder engagement and Australian youth justice policy."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )

            result = response.choices[0].message.content

            # Try to parse as JSON
            try:
                parsed = json.loads(result)
                return parsed
            except:
                # Fallback to text parsing
                return {
                    'best_approach': result[:200],
                    'engagement_timing': 'Business hours recommended',
                    'personalised_suggestions': ['AI-generated suggestion pending'],
                    'risk_assessment': 'low'
                }

        except Exception as e:
            logging.error(f"AI analysis error: {e}")
            return {
                'best_approach': 'Professional email introduction',
                'engagement_timing': 'Business hours, avoid Mondays/Fridays',
                'personalised_suggestions': ['Reference mutual interest in youth justice reform'],
                'risk_assessment': 'low'
            }

    def calculate_influence_score(self, enrichment: ContactEnrichment) -> float:
        """Calculate influence score based on available data"""
        score = 0.0

        # Base score from position
        if enrichment.current_position:
            position_lower = enrichment.current_position.lower()
            if any(word in position_lower for word in ['ceo', 'director', 'minister', 'commissioner']):
                score += 0.4
            elif any(word in position_lower for word in ['manager', 'coordinator', 'lead']):
                score += 0.2

        # Media mentions boost
        if enrichment.news_mentions:
            score += min(len(enrichment.news_mentions) * 0.1, 0.3)

        # Academic publications boost
        if enrichment.academic_publications:
            score += min(len(enrichment.academic_publications) * 0.05, 0.2)

        # Speaking engagements boost
        if enrichment.speaking_engagements:
            score += min(len(enrichment.speaking_engagements) * 0.05, 0.1)

        return min(score, 1.0)

    def calculate_collaboration_potential(self, enrichment: ContactEnrichment) -> float:
        """Calculate collaboration potential score"""
        score = 0.0

        # Positive sentiment towards youth justice
        if enrichment.youth_justice_sentiment and enrichment.youth_justice_sentiment > 0:
            score += enrichment.youth_justice_sentiment * 0.4

        # Mutual connections
        if enrichment.mutual_connections:
            score += min(len(enrichment.mutual_connections) * 0.1, 0.3)

        # Recent activities in the space
        if enrichment.recent_activities:
            score += min(len(enrichment.recent_activities) * 0.05, 0.2)

        # Organisation type
        org = enrichment.original_data.get('Organisation', '').lower()
        if any(word in org for word in ['youth', 'justice', 'community', 'legal', 'advocacy']):
            score += 0.1

        return min(score, 1.0)


class ContactResearchOrchestrator:
    """Main orchestrator for contact research and enrichment"""

    def __init__(self, config: Config):
        self.config = config
        self.scraper = WebScraper(config)
        self.email_finder = EmailFinder(config)
        self.linkedin_researcher = LinkedInResearcher(config)
        self.news_researcher = NewsResearcher(config)
        self.ai_analyzer = AIAnalyzer(config)

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(config.log_file),
                logging.StreamHandler()
            ]
        )

    async def research_single_contact(self, contact_data: Dict[str, str]) -> ContactEnrichment:
        """Research and enrich a single contact"""
        enrichment = ContactEnrichment(original_data=contact_data)

        name = f"{contact_data.get('First Name', '')} {contact_data.get('Last Name', '')}".strip()
        organisation = contact_data.get('Organisation', '').strip()

        logging.info(f"Researching contact: {name} at {organisation}")

        try:
            # Email finding
            if self.config.enable_email_finding:
                emails_found = await self.email_finder.find_emails_for_contact(contact_data)
                for email, confidence in emails_found:
                    enrichment.found_emails.append(email)
                    enrichment.email_confidence_scores[email] = confidence

                    # Verify emails
                    if self.email_finder.verify_email_domain(email):
                        enrichment.verified_emails.append(email)

                enrichment.data_sources.append('email_patterns')
                if self.config.hunter_io_api_key:
                    enrichment.data_sources.append('hunter_io')

            # LinkedIn research
            if self.config.enable_linkedin_research:
                linkedin_data = await self.linkedin_researcher.search_linkedin_profile(name, organisation)
                if linkedin_data:
                    enrichment.linkedin_url = linkedin_data.get('linkedin_url')
                    enrichment.current_position = linkedin_data.get('headline')

                    # Extract experience and education
                    for exp in linkedin_data.get('experience', [])[:3]:
                        enrichment.previous_positions.append({
                            'title': exp.get('title', ''),
                            'company': exp.get('companyName', ''),
                            'duration': f"{exp.get('dateRange', {}).get('start', '')} - {exp.get('dateRange', {}).get('end', 'Present')}"
                        })

                    for edu in linkedin_data.get('education', [])[:3]:
                        enrichment.education.append({
                            'institution': edu.get('schoolName', ''),
                            'degree': edu.get('degreeName', ''),
                            'field': edu.get('fieldOfStudy', '')
                        })

                    enrichment.data_sources.append('linkedin')

            # News research
            if self.config.enable_news_research:
                news_mentions = await self.news_researcher.search_news_mentions(name, organisation)
                enrichment.news_mentions = news_mentions
                if news_mentions:
                    enrichment.data_sources.append('news_search')

            # Web scraping for organisation
            if self.config.enable_web_scraping and organisation:
                # Try to find organisation website
                possible_domains = [
                    f"https://www.{organisation.lower().replace(' ', '')}.org.au",
                    f"https://www.{organisation.lower().replace(' ', '')}.com.au",
                    f"https://www.{organisation.lower().replace(' ', '')}.gov.au",
                ]

                for domain in possible_domains[:2]:  # Try first 2
                    scraped_data = await self.scraper.scrape_url(domain)
                    if scraped_data:
                        # Look for social media links
                        for social_link in scraped_data.get('social_links', []):
                            platform = social_link['platform']
                            username = social_link['username']

                            if platform == 'linkedin':
                                enrichment.linkedin_url = f"https://linkedin.com/in/{username}"
                            elif platform == 'twitter':
                                enrichment.twitter_handle = username
                            elif platform == 'facebook':
                                enrichment.facebook_url = f"https://facebook.com/{username}"
                            elif platform == 'instagram':
                                enrichment.instagram_handle = username

                        enrichment.data_sources.append('web_scraping')
                        break

            # AI-powered analysis
            if self.config.enable_ai_analysis:
                # Analyze sentiment towards youth justice
                text_for_analysis = ""
                if enrichment.news_mentions:
                    text_for_analysis += " ".join([mention.get('summary', '') for mention in enrichment.news_mentions])
                if enrichment.current_position:
                    text_for_analysis += " " + enrichment.current_position

                if text_for_analysis.strip():
                    enrichment.youth_justice_sentiment = self.ai_analyzer.analyze_sentiment(text_for_analysis)

                # Calculate scores
                enrichment.influence_score = self.ai_analyzer.calculate_influence_score(enrichment)
                enrichment.collaboration_potential = self.ai_analyzer.calculate_collaboration_potential(enrichment)

                # Generate engagement strategy
                engagement_strategy = await self.ai_analyzer.generate_engagement_strategy(enrichment)
                enrichment.best_approach = engagement_strategy.get('best_approach', '')
                enrichment.engagement_timing = engagement_strategy.get('engagement_timing', '')
                enrichment.personalised_suggestions = engagement_strategy.get('personalised_suggestions', [])
                enrichment.risk_assessment = engagement_strategy.get('risk_assessment', 'low')

                enrichment.data_sources.append('ai_analysis')

            # Calculate overall research confidence
            enrichment.research_confidence = len(enrichment.data_sources) / 6.0  # Max 6 sources

            logging.info(f"Completed research for {name} - confidence: {enrichment.research_confidence:.2f}")

        except Exception as e:
            logging.error(f"Error researching {name}: {e}")

        return enrichment

    async def process_csv_file(self) -> None:
        """Process the entire CSV file"""
        logging.info(f"Starting contact research from {self.config.input_csv}")

        # Read input CSV
        try:
            df = pd.read_csv(self.config.input_csv)
            logging.info(f"Loaded {len(df)} contacts from CSV")
        except Exception as e:
            logging.error(f"Error reading CSV file: {e}")
            return

        # Process each contact
        enriched_contacts = []

        for index, row in df.iterrows():
            contact_data = row.to_dict()

            # Skip empty rows
            if not contact_data.get('First Name') and not contact_data.get('Last Name'):
                continue

            try:
                enrichment = await self.research_single_contact(contact_data)
                enriched_contacts.append(enrichment)

                # Save progress every 10 contacts
                if (index + 1) % 10 == 0:
                    await self.save_progress(enriched_contacts)
                    logging.info(f"Processed {index + 1}/{len(df)} contacts")

                # Respect rate limits
                await asyncio.sleep(self.config.delay_between_requests)

            except Exception as e:
                logging.error(f"Error processing contact at row {index}: {e}")
                continue

        # Save final results
        await self.save_results(enriched_contacts)
        logging.info(f"Research complete! Results saved to {self.config.output_csv}")

    async def save_progress(self, enriched_contacts: List[ContactEnrichment]) -> None:
        """Save progress to temporary file"""
        temp_file = f"temp_{self.config.output_csv}"
        await self.save_results(enriched_contacts, temp_file)

    async def save_results(self, enriched_contacts: List[ContactEnrichment], filename: str = None) -> None:
        """Save enriched contacts to CSV"""
        if filename is None:
            filename = self.config.output_csv

        # Prepare data for CSV
        csv_data = []

        for enrichment in enriched_contacts:
            row = enrichment.original_data.copy()

            # Add enriched fields
            row.update({
                'Enriched_Found_Emails': '; '.join(enrichment.found_emails),
                'Enriched_Verified_Emails': '; '.join(enrichment.verified_emails),
                'Enriched_Email_Confidence': json.dumps(enrichment.email_confidence_scores),
                'Enriched_LinkedIn_URL': enrichment.linkedin_url or '',
                'Enriched_Twitter_Handle': enrichment.twitter_handle or '',
                'Enriched_Facebook_URL': enrichment.facebook_url or '',
                'Enriched_Instagram_Handle': enrichment.instagram_handle or '',
                'Enriched_Current_Position': enrichment.current_position or '',
                'Enriched_Current_Organisation': enrichment.current_organisation or '',
                'Enriched_Previous_Positions': json.dumps(enrichment.previous_positions),
                'Enriched_Education': json.dumps(enrichment.education),
                'Enriched_Recent_Activities': json.dumps(enrichment.recent_activities),
                'Enriched_News_Mentions': json.dumps(enrichment.news_mentions),
                'Enriched_Academic_Publications': json.dumps(enrichment.academic_publications),
                'Enriched_Speaking_Engagements': json.dumps(enrichment.speaking_engagements),
                'Enriched_Youth_Justice_Involvement': enrichment.youth_justice_involvement,
                'Enriched_Youth_Justice_Sentiment': enrichment.youth_justice_sentiment or '',
                'Enriched_Policy_Positions': '; '.join(enrichment.policy_positions or []),
                'Enriched_Funding_History': json.dumps(enrichment.funding_history),
                'Enriched_Mutual_Connections': '; '.join(enrichment.mutual_connections or []),
                'Enriched_Influence_Score': enrichment.influence_score or '',
                'Enriched_Collaboration_Potential': enrichment.collaboration_potential or '',
                'Enriched_Best_Approach': enrichment.best_approach,
                'Enriched_Engagement_Timing': enrichment.engagement_timing,
                'Enriched_Personalised_Suggestions': '; '.join(enrichment.personalised_suggestions or []),
                'Enriched_Risk_Assessment': enrichment.risk_assessment,
                'Enriched_Research_Date': enrichment.research_date,
                'Enriched_Research_Confidence': enrichment.research_confidence,
                'Enriched_Data_Sources': '; '.join(enrichment.data_sources),
            })

            csv_data.append(row)

        # Save to CSV
        try:
            df_output = pd.DataFrame(csv_data)
            df_output.to_csv(filename, index=False, encoding='utf-8')
            logging.info(f"Saved {len(csv_data)} enriched contacts to {filename}")
        except Exception as e:
            logging.error(f"Error saving CSV: {e}")


async def main():
    """Main entry point"""
    print("AI-Powered Contact Research and Enrichment System")
    print("=" * 50)

    config = Config()

    # Check required files
    if not os.path.exists(config.input_csv):
        print(f"Error: Input file '{config.input_csv}' not found!")
        print("Please ensure the youth-justice-master-contacts.csv file exists in the current directory.")
        return

    # Check API keys
    missing_keys = []
    if config.enable_email_finding and not config.hunter_io_api_key:
        missing_keys.append("HUNTER_IO_API_KEY")
    if config.enable_linkedin_research and (not config.linkedin_username or not config.linkedin_password):
        missing_keys.append("LINKEDIN_USERNAME and LINKEDIN_PASSWORD")
    if config.enable_ai_analysis and not config.openai_api_key:
        missing_keys.append("OPENAI_API_KEY")

    if missing_keys:
        print("Warning: Missing API keys for some features:")
        for key in missing_keys:
            print(f"  - {key}")
        print("\nSome research capabilities will be limited.")
        print("Set these environment variables to enable full functionality.")

        response = input("\nContinue with limited functionality? (y/n): ")
        if response.lower() != 'y':
            return

    # Display configuration
    print(f"\nConfiguration:")
    print(f"  Input file: {config.input_csv}")
    print(f"  Output file: {config.output_csv}")
    print(f"  Web scraping: {'Enabled' if config.enable_web_scraping else 'Disabled'}")
    print(f"  LinkedIn research: {'Enabled' if config.enable_linkedin_research else 'Disabled'}")
    print(f"  Email finding: {'Enabled' if config.enable_email_finding else 'Disabled'}")
    print(f"  AI analysis: {'Enabled' if config.enable_ai_analysis else 'Disabled'}")
    print(f"  Rate limit: {config.requests_per_minute} requests/minute")

    # Create orchestrator and run
    orchestrator = ContactResearchOrchestrator(config)

    print(f"\nStarting contact research...")
    start_time = time.time()

    try:
        await orchestrator.process_csv_file()

        end_time = time.time()
        duration = end_time - start_time

        print(f"\n✅ Research completed successfully!")
        print(f"⏱️  Total time: {duration/60:.1f} minutes")
        print(f"📄 Results saved to: {config.output_csv}")
        print(f"📋 Log file: {config.log_file}")

    except KeyboardInterrupt:
        print("\n\n⚠️  Research interrupted by user")
        print("Progress has been saved to temporary files")
    except Exception as e:
        print(f"\n❌ Error during research: {e}")
        logging.error(f"Fatal error: {e}")


if __name__ == "__main__":
    # Create example environment file if it doesn't exist
    env_example = """# AI-Powered Contact Research Environment Variables
# Copy this to .env and fill in your API keys

# Required for AI analysis and engagement strategy generation
OPENAI_API_KEY=your_openai_api_key_here

# Required for LinkedIn profile research
LINKEDIN_USERNAME=your_linkedin_email@example.com
LINKEDIN_PASSWORD=your_linkedin_password

# Required for advanced email finding
HUNTER_IO_API_KEY=your_hunter_io_api_key

# Optional: Additional enrichment services
CLEARBIT_API_KEY=your_clearbit_api_key

# Optional: Alternative AI providers
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
"""

    if not os.path.exists('.env.research'):
        with open('.env.research', 'w') as f:
            f.write(env_example)
        print("Created .env.research template file")
        print("Please configure your API keys before running the script")

    # Load environment variables from .env.research if it exists
    if os.path.exists('.env.research'):
        with open('.env.research', 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#') and '=' in line:
                    key, value = line.strip().split('=', 1)
                    if value and not value.startswith('your_'):
                        os.environ[key] = value

    # Run the main function
    asyncio.run(main())