<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A Curious Tractor - Farm Ecosystem</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Georgia, serif;
            background: #FFF8E7;
            color: #2C3E50;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #6B4226 0%, #7CB342 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .tagline {
            font-size: 1.2em;
            font-style: italic;
            opacity: 0.9;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .field {
            background: white;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .field:hover {
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        
        .field-header {
            background: #6B4226;
            color: white;
            padding: 20px 25px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.3s ease;
        }
        
        .field-header:hover {
            background: #5a3621;
        }
        
        .field-header.active {
            background: #7CB342;
        }
        
        .field-title {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 1.4em;
        }
        
        .field-icon {
            font-size: 1.5em;
        }
        
        .field-meta {
            display: flex;
            align-items: center;
            gap: 20px;
            font-size: 0.9em;
        }
        
        .project-count {
            background: rgba(255,255,255,0.2);
            padding: 5px 12px;
            border-radius: 15px;
        }
        
        .expand-icon {
            font-size: 1.2em;
            transition: transform 0.3s ease;
        }
        
        .expand-icon.rotated {
            transform: rotate(180deg);
        }
        
        .field-content {
            display: none;
            padding: 0;
            background: #fafafa;
        }
        
        .field-content.show {
            display: block;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1px;
            background: #e0e0e0;
        }
        
        .project {
            background: white;
            padding: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            border-left: 5px solid transparent;
        }
        
        .project:hover {
            background: #f8f9fa;
            border-left-color: #7CB342;
        }
        
        .project.active {
            background: #f0f8f0;
            border-left-color: #FF6B35;
        }
        
        .project-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .project-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #2C3E50;
            margin-bottom: 5px;
        }
        
        .project-status {
            padding: 5px 12px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .status-active {
            background: #FFE0D6;
            color: #FF6B35;
        }
        
        .status-ideation {
            background: #F3E5F5;
            color: #9C27B0;
        }
        
        .status-sunsetting {
            background: #FFF3E0;
            color: #FF9800;
        }
        
        .project-description {
            color: #666;
            font-size: 0.95em;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        
        .project-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        
        .tag {
            background: #E8F5E8;
            color: #4CAF50;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
        }
        
        .practices-section {
            display: none;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            padding: 20px 25px;
        }
        
        .practices-section.show {
            display: block;
        }
        
        .practices-title {
            font-size: 1.1em;
            color: #6B4226;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .practice-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 3px solid #7CB342;
        }
        
        .practice-name {
            font-weight: 600;
            color: #2C3E50;
            margin-bottom: 5px;
        }
        
        .practice-description {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        
        .tests-section {
            margin-top: 10px;
            padding-left: 15px;
            border-left: 2px solid #E8F5E8;
        }
        
        .test-item {
            margin-bottom: 8px;
            font-size: 0.85em;
        }
        
        .test-name {
            color: #7CB342;
            font-weight: 500;
        }
        
        .test-description {
            color: #888;
            margin-left: 10px;
        }
        
        .stories-hint {
            margin-top: 10px;
            padding: 10px;
            background: #FFF8E7;
            border-radius: 6px;
            font-size: 0.85em;
            color: #6B4226;
            cursor: pointer;
        }
        
        .stories-hint:hover {
            background: #F0F0F0;
        }
        
        .funding-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85em;
            margin-top: 10px;
        }
        
        .funding-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .funded { background: #4CAF50; }
        .needs-funding { background: #FF9800; }
        .self-funded { background: #2196F3; }
        
        .legend {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .legend-title {
            color: #6B4226;
            font-size: 1.1em;
            margin-bottom: 15px;
        }
        
        .legend-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
        }
        
        .legend {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .legend-title {
            color: #6B4226;
            font-size: 1.1em;
            margin-bottom: 15px;
        }
        
        .legend-items {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
        }
        
        @media (max-width: 768px) {
            .projects-grid {
                grid-template-columns: 1fr;
            }
            
            .field-meta {
                flex-direction: column;
                gap: 8px;
                align-items: flex-end;
            }
            
            .legend-items {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚜 A Curious Tractor</h1>
        <p class="tagline">Cultivating seeds of impact through purposeful action</p>
    </div>
    
    <div class="container">
        <div class="legend">
            <div class="legend-title">How to Read the Farm</div>
            <div class="legend-items">
                <div class="legend-item">
                    <span style="font-size: 1.2em;">📖</span>
                    <span><strong>Fields</strong> - Our main areas of work</span>
                </div>
                <div class="legend-item">
                    <span style="font-size: 1.2em;">🌱</span>
                    <span><strong>Projects</strong> - Specific initiatives within each field</span>
                </div>
                <div class="legend-item">
                    <span style="font-size: 1.2em;">🛠️</span>
                    <span><strong>Practices</strong> - How we work on each project</span>
                </div>
                <div class="legend-item">
                    <span style="font-size: 1.2em;">🧪</span>
                    <span><strong>Tests</strong> - Specific experiments we're running</span>
                </div>
                <div class="legend-item">
                    <div class="funding-dot funded"></div>
                    <span>Funded & Growing</span>
                </div>
                <div class="legend-item">
                    <div class="funding-dot needs-funding"></div>
                    <span>Needs Resources</span>
                </div>
                <div class="legend-item">
                    <div class="funding-dot self-funded"></div>
                    <span>Community Self-Sustaining</span>
                </div>
            </div>
        </div>
        
        <!-- Story & Sovereignty Field -->
        <div class="field">
            <div class="field-header" onclick="toggleField('story')">
                <div class="field-title">
                    <span class="field-icon">📖</span>
                    <span>Story & Sovereignty</span>
                </div>
                <div class="field-meta">
                    <span class="project-count">12 projects</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="field-content" id="story-content">
                <div class="projects-grid">
                    
                    <div class="project" onclick="toggleProject('empathy-ledger')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Empathy Ledger</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community-owned storytelling platform</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Platform ensuring storytellers retain control and share in value created from their narratives, dismantling extractive storytelling practices.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Community Ownership</span>
                        </div>
                        
                        <div class="practices-section" id="empathy-ledger-practices">
                            <div class="practices-title">🛠️ How We Work</div>
                            <div class="practice-item">
                                <div class="practice-name">Consent-First Design</div>
                                <div class="practice-description">Every story requires explicit, revocable consent with clear ownership</div>
                                <div class="tests-section">
                                    <div class="test-item">
                                        <span class="test-name">Dynamic Consent App:</span>
                                        <span class="test-description">Testing real-time permission management</span>
                                    </div>
                                </div>
                                <div class="stories-hint" onclick="showStories('empathy-ledger')">
                                    💬 Hear from storytellers who own their narratives →
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('wilya-janta')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Wilya Janta Communications</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Supporting traditional story preservation</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Supporting the Frank family to capture and share traditional stories under their complete control and cultural protocols.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Economic Freedom</span>
                            <span class="tag">Indigenous</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('anat-spectra')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">ANAT SPECTRA 2025</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Gold Phone interactive installation</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Nicholas leads storytelling project featuring Gold Phone installation for interactive conversations at USC Art Gallery.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Storytelling</span>
                            <span class="tag">Truth-Telling</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('barkly-backbone')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Barkly Backbone</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community storytelling infrastructure</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Building storytelling infrastructure and capacity in the Barkly region with community partners.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Storytelling</span>
                            <span class="tag">Truth-Telling</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('project-her-self')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Project Her Self</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community-centered storytelling design</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Storytelling project emphasizing truth-telling and community involvement, prioritizing community needs over external narratives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Community</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('qfcc-empathy')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">QFCC Empathy Ledger</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Youth voice amplification platform</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Queensland Family and Child Commission initiative ensuring young people maintain ownership of their stories and influence decisions affecting their lives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Data Sovereignty</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('orange-sky-empathy')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Orange Sky Empathy Ledger</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>108 stories collected ethically</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Successfully collected 108 stories emphasizing ethical storytelling and volunteer engagement with robust consent management.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Ethical Practice</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('tomnet')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">TOMNET</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Older men's storytelling network</span>
                                </div>
                            </div>
                            <div class="project-status status-sunsetting">🌅 Harvest</div>
                        </div>
                        <div class="project-description">
                            Supporting older men in regional Australia through storytelling, addressing isolation and mental health through community narratives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Regional Communities</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('sxsw-2025')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">SXSW 2025</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Youth justice storytelling experience</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Immersive storytelling experience for SXSW Sydney featuring Traditional Owners and young people, with interactive installations addressing youth justice.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Youth Justice</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('westpac-summit')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Westpac Summit 2025</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Corporate storytelling intervention</span>
                                </div>
                            </div>
                            <div class="project-status status-sunsetting">🌅 Harvest</div>
                        </div>
                        <div class="project-description">
                            Storytelling-focused summit project exploring how corporate Australia can better listen to and amplify community voices.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Creativity</span>
                            <span class="tag">Corporate Accountability</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('yac-story')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">YAC Story & Action</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Youth advocacy storytelling dashboard</span>
                                </div>
                            </div>
                            <div class="project-status status-sunsetting">🌅 Harvest</div>
                        </div>
                        <div class="project-description">
                            Youth engagement project including story capture, Empathy Ledger for youth stories, and interactive dashboard for analysis and advocacy.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Youth Ownership</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
        
        <!-- Justice & Healing Field -->
        <div class="field">
            <div class="field-header" onclick="toggleField('justice')">
                <div class="field-title">
                    <span class="field-icon">⚖️</span>
                    <span>Justice & Healing</span>
                </div>
                <div class="field-meta">
                    <span class="project-count">11 projects</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="field-content" id="justice-content">
                <div class="projects-grid">
                    
                    <div class="project" onclick="toggleProject('bg-fit')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">BG Fit</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Indigenous youth fitness & mentorship</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Brodie Germain's gym in Mount Isa empowering Indigenous youth through culturally grounded fitness, mentorship and camping on country programs.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Community-Led</span>
                        </div>
                        
                        <div class="practices-section" id="bg-fit-practices">
                            <div class="practices-title">🛠️ How We Work</div>
                            <div class="practice-item">
                                <div class="practice-name">Community Elder Leadership</div>
                                <div class="practice-description">Brodie leads, we support with systems and storytelling</div>
                                <div class="tests-section">
                                    <div class="test-item">
                                        <span class="test-name">Gym + Country Programs:</span>
                                        <span class="test-description">Combining fitness with traditional healing</span>
                                    </div>
                                </div>
                                <div class="stories-hint">
                                    💬 Young people talking about transformation →
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('justice-hub')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">JusticeHub</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Open-source justice programs</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Platform where grassroots justice programs can "fork" proven models, access insights, and co-create culturally aligned governance structures.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Open Source</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('justice-centre')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">JusticeHub - Centre of Excellence</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Healing-centered youth justice transformation</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Vision for transforming youth justice in Australia by prioritizing healing-centered approaches, Indigenous governance, and community-led practices.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Healing-Centered</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('contained')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Contained</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Youth justice art + interactive experience</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Art project led by Benjamin Knight focusing on youth justice, emphasizing truth-telling and creative advocacy. Deadline October 12, 2025.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Art + Advocacy</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('oonchiumpa')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Oonchiumpa</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Aboriginal youth cultural healing program</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Supporting at-risk Aboriginal youth in Central Australia through holistic cultural healing, education, and system navigation with community leadership.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Cultural Healing</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('stradbroke-island')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Stradbroke Island</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Indigenous-led justice innovation</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Supporting Indigenous-led initiatives on Stradbroke Island, focusing on justice innovation that honors traditional knowledge and builds sustainable opportunities.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Indigenous</span>
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Radical Humility</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('maningrida')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Maningrida - Justice Reinvestment</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community-led justice solutions</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Justice reinvestment project in Maningrida emphasizing decentralized power, youth justice, and Indigenous storytelling approaches.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Indigenous</span>
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('bimberi')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Bimberi - Holiday Programs</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Indigenous-led youth wellbeing programs</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Empowering Indigenous-led initiatives through governance support, storytelling, and resource mobilization for youth justice and wellbeing programs.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Governance Support</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('diagrama')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Diagrama</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Spanish youth justice model for Australia</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            La Fundación Diagrama seeks to expand to Australia, transforming youth detention and rehabilitation approaches with therapeutic models respecting Indigenous context.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">International Model</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('first-pathways')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">First Pathways - Custodian Economy</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Indigenous youth employment strategy</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Keiron Lander's approach supporting Indigenous youth through trust-building, practical engagement, and addressing employment barriers with "fair and firm" philosophy.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Employment</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('double-disadvantage')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">The Double Disadvantage</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Young people with disabilities in justice system</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Framework to support young people with disabilities in Queensland's justice system through better identification, coordination, and evidence-based practices.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Truth-Telling</span>
                            <span class="tag">Disability Rights</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
        
        <!-- Health & Regeneration Field -->
        <div class="field">
            <div class="field-header" onclick="toggleField('health')">
                <div class="field-title">
                    <span class="field-icon">🌿</span>
                    <span>Health & Regeneration</span>
                </div>
                <div class="field-meta">
                    <span class="project-count">13 projects</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="field-content" id="health-content">
                <div class="projects-grid">
                    
                    <div class="project" onclick="toggleProject('goods')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Goods.</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community-made essential products</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Co-designing mattresses, washing machines from recycled plastic in Tennant Creek. Communities own production and profits.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Circular Economy</span>
                        </div>
                        
                        <div class="practices-section" id="goods-practices">
                            <div class="practices-title">🛠️ How We Work</div>
                            <div class="practice-item">
                                <div class="practice-name">Community Co-Design</div>
                                <div class="practice-description">160 mattresses in testing based on community interviews</div>
                                <div class="tests-section">
                                    <div class="test-item">
                                        <span class="test-name">Indestructible Washing Machines:</span>
                                        <span class="test-description">5 machines launched in Tennant Creek</span>
                                    </div>
                                    <div class="test-item">
                                        <span class="test-name">Local Plastic Recycling:</span>
                                        <span class="test-description">Turning waste into manufacturing inputs</span>
                                    </div>
                                </div>
                                <div class="stories-hint">
                                    💬 Community members talking about ownership →
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('black-cockatoo')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Black Cockatoo Valley</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>117ha regenerative conservation</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Conservation estate combining eco-cottages, Indigenous land-care jobs, and biodiversity credits for sustainable impact.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Conservation</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('bcv-reforest')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">BCV Reforest</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Large nature refuge creation</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Acquiring adjacent properties to create large nature refuge, focusing on community-driven conservation and regenerative finance with Indigenous custodians.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Creativity</span>
                            <span class="tag">Conservation</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('smart-recovery')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">SMART Recovery</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Addiction recovery revolution</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Revolutionizing addiction recovery through community-led initiatives, storytelling, and digital solutions. Growing from 350 to 1,000 meetings by 2027.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Creativity</span>
                            <span class="tag">Community-Led</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('smart-gp-uplift')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">SMART HCP GP Uplift</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>GP awareness enhancement</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            $30,000 initiative to enhance GP awareness of SMART Recovery, improving referral pathways for addiction support through targeted campaigns and workflow integration.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Creativity</span>
                            <span class="tag">System Change</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('dad-lab')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Dad.Lab.25</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Father connection and support network</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Planning 2024 Alumni event to reconnect and prepare for 2025 gathering, with opportunities for sponsorship and volunteer support from participants.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Creativity</span>
                            <span class="tag">Community Building</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('junes-patch')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">June's Patch</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Therapeutic food garden for healthcare workers</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Therapeutic food garden to nourish and rejuvenate healthcare workers, enhancing care through nature-based wellness at Black Cockatoo Valley.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Radical Humility</span>
                            <span class="tag">Healthcare Support</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('witta-harvest')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Witta Harvest HQ</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Regenerative community space</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Regenerative community space focused on safety, sustainability, and collaboration, empowering individuals and nurturing land for future generations.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Global community</span>
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Decentralised Power</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('olive-express')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Olive Express</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Virtual train journeys for elders</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Immersive virtual train journeys for elders inspired by their love for travel. Expanding nationwide with "Conductor In Residence" volunteer support.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Elder Care</span>
                            <span class="tag">Technology</span>
                            <span class="tag">Community Connection</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('palm-island')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Palm Island - Storm Stories & Rangers</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Community health and storytelling</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Multi-faceted project including storm stories, community server infrastructure, Goods manufacturing, and ranger programs for health and wellbeing.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Indigenous</span>
                            <span class="tag">Decentralised Power</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('fishers-oysters')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Fishers Oysters</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Indigenous sovereignty through oyster restoration</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Reclaiming and restoring Moreton Bay's oyster industry as cornerstone of Indigenous sovereignty and ecological justice through community-led initiatives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Economic Freedom</span>
                            <span class="tag">Youth Justice</span>
                            <span class="tag">Decentralised Power</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('the-shed')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">The Shed</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Community workshop and maker space</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Community workshop and maker space supporting health and wellbeing through hands-on creation and skill-sharing.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Maker Space</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('deadly-homes')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Deadly Homes and Gardens</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Community-led housing solutions</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Health and wellbeing project exploring community-led approaches to housing and garden solutions with cultural integration.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Radical Humility</span>
                            <span class="tag">Housing</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
        
        <!-- Connection & Innovation Field -->
        <div class="field">
            <div class="field-header" onclick="toggleField('innovation')">
                <div class="field-title">
                    <span class="field-icon">🤝</span>
                    <span>Connection & Innovation</span>
                </div>
                <div class="field-meta">
                    <span class="project-count">8 projects</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="field-content" id="innovation-content">
                <div class="projects-grid">
                    
                    <div class="project" onclick="toggleProject('global-laundry')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Global Laundry Alliance</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Laundry access as human right</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Transforming laundry access into fundamental human right, emphasizing dignity for those facing clean clothes poverty through community partnerships and co-design.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Global community</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Human Rights</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('act-cc')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">ACT Conservation Collective</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Regenerative ecosystem integration</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Regenerative ecosystem project integrating conservation with hospitality, creating sustainable model benefiting environment and community through eco-cottages and employment.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Economic Freedom</span>
                            <span class="tag">Health and wellbeing</span>
                            <span class="tag">Decentralised Power</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('gold-phone')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Gold.Phone</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Interactive conversation technology</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Interactive phone installation for reintegration conference, testing VM recording flows and creating inside-out experiences for users.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Technology</span>
                            <span class="tag">Interactive Art</span>
                            <span class="tag">Reintegration</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('os-playground')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">OS Playground</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Remote laundry demand mapping</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Creating Remote Laundry Demand Register to assess and prioritize laundry service needs, ensuring effective resource allocation and improved health outcomes.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Storytelling</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Digital Experience</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('treacher')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">Treacher</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Nature reconnection through historical trees</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Reconnecting people with nature through immersive experience centered around historical tree, highlighting ecological and cultural narratives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Nature Connection</span>
                            <span class="tag">Cultural Narratives</span>
                            <span class="tag">Environmental Education</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('confessional')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">The Confessional</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Art installation for idea sharing</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Interactive art installation designed to create safe spaces for people to share ideas, thoughts and stories in a non-judgmental environment.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Art Installation</span>
                            <span class="tag">Safe Spaces</span>
                            <span class="tag">Community Dialogue</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('aime')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">AIME</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Community engagement transition</span>
                                </div>
                            </div>
                            <div class="project-status status-sunsetting">🌅 Harvest</div>
                        </div>
                        <div class="project-description">
                            Project focusing on radical humility and community engagement, currently sunsetting with emphasis on decentralized power and community-led initiatives.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Global community</span>
                            <span class="tag">Indigenous</span>
                            <span class="tag">Radical Humility</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('sefa-partnership')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">SEFA Partnership</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Social enterprise finance collaboration</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Partnership focusing on economic freedom through community-led initiatives, emphasizing stakeholder engagement and impact vision development.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Economic Freedom</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Social Enterprise</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
        
        <!-- Operations & Infrastructure Field -->
        <div class="field">
            <div class="field-header" onclick="toggleField('operations')">
                <div class="field-title">
                    <span class="field-icon">🛠️</span>
                    <span>Operations & Infrastructure</span>
                </div>
                <div class="field-meta">
                    <span class="project-count">6 projects</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="field-content" id="operations-content">
                <div class="projects-grid">
                    
                    <div class="project" onclick="toggleProject('act-setup')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">ACT Business Setup</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Dual-entity structure for community ownership</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Creating dual-entity structure: ACT Foundation (grants) + ACT Ventures (profit-sharing) to ensure 40% of profits flow to communities.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Economic Freedom</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Legal Structure</span>
                        </div>
                        
                        <div class="practices-section" id="act-setup-practices">
                            <div class="practices-title">🛠️ How We Work</div>
                            <div class="practice-item">
                                <div class="practice-name">Design for Obsolescence</div>
                                <div class="practice-description">Every tool comes with sunset clause so communities can take ownership</div>
                                <div class="tests-section">
                                    <div class="test-item">
                                        <span class="test-name">Mission-Locked Structure:</span>
                                        <span class="test-description">Legal protection against mission drift</span>
                                    </div>
                                    <div class="test-item">
                                        <span class="test-name">40% Profit Guarantee:</span>
                                        <span class="test-description">Ensuring value flows back to communities</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('act-notion-audit')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">ACT Notion / Tool Audit</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot self-funded"></div>
                                    <span>Knowledge database organization</span>
                                </div>
                            </div>
                            <div class="project-status status-ideation">🌀 Building</div>
                        </div>
                        <div class="project-description">
                            Creating consistent knowledge database using PARA model, focusing on four main database tables for projects, tasks, and resources to enhance organization.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Operations</span>
                            <span class="tag">Creativity</span>
                            <span class="tag">Knowledge Management</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('dgr-application')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">DGR Community Category Application</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot needs-funding"></div>
                                    <span>Charitable status for enhanced funding</span>
                                </div>
                            </div>
                            <div class="project-status status-sunsetting">🌅 Harvest</div>
                        </div>
                        <div class="project-description">
                            Applying for DGR Community Charity status to enhance support for grassroots justice initiatives and facilitate funding for community-led solutions.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Operations</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Legal Compliance</span>
                        </div>
                    </div>
                    
                    <div class="project" onclick="toggleProject('saf-foundation')">
                        <div class="project-header">
                            <div>
                                <div class="project-title">SAF Foundation Master</div>
                                <div class="funding-indicator">
                                    <div class="funding-dot funded"></div>
                                    <span>Client-led collaboration framework</span>
                                </div>
                            </div>
                            <div class="project-status status-active">🔥 Active</div>
                        </div>
                        <div class="project-description">
                            Client-led collaboration project emphasizing decentralized power, currently active with focus on planning resources and stakeholder engagement.
                        </div>
                        <div class="project-tags">
                            <span class="tag">Operations</span>
                            <span class="tag">Decentralised Power</span>
                            <span class="tag">Client-Led</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
        
    </div>
    
    <script>
        function toggleField(fieldId) {
            const content = document.getElementById(fieldId + '-content');
            const header = content.previousElementSibling;
            const icon = header.querySelector('.expand-icon');
            
            // Close all other fields
            document.querySelectorAll('.field-content').forEach(el => {
                if (el.id !== fieldId + '-content') {
                    el.classList.remove('show');
                    el.previousElementSibling.classList.remove('active');
                    el.previousElementSibling.querySelector('.expand-icon').classList.remove('rotated');
                }
            });
            
            // Close all project practices
            document.querySelectorAll('.practices-section').forEach(el => {
                el.classList.remove('show');
                el.closest('.project').classList.remove('active');
            });
            
            // Toggle current field
            content.classList.toggle('show');
            header.classList.toggle('active');
            icon.classList.toggle('rotated');
        }
        
        function toggleProject(projectId) {
            event.stopPropagation();
            
            const practicesSection = document.getElementById(projectId + '-practices');
            const projectElement = practicesSection.closest('.project');
            
            // Close all other project practices in this field
            const currentField = projectElement.closest('.field-content');
            currentField.querySelectorAll('.practices-section').forEach(el => {
                if (el.id !== projectId + '-practices') {
                    el.classList.remove('show');
                    el.closest('.project').classList.remove('active');
                }
            });
            
            // Toggle current project
            practicesSection.classList.toggle('show');
            projectElement.classList.toggle('active');
        }
        
        function showStories(projectId) {
            event.stopPropagation();
            alert(`Stories for ${projectId} would open here - featuring community voices and outcomes`);
        }
    </script>
</body>
</html>