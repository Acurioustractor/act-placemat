// Notion Database Setup Script
// This script helps create and configure the ACT Placemat database structure

const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

// Database schemas for ACT Placemat
const databaseSchemas = {
    projects: {
        title: "ACT Projects",
        properties: {
            "Name": { title: {} },
            "Area": {
                select: {
                    options: [
                        { name: "Story & Sovereignty", color: "blue" },
                        { name: "Economic Freedom", color: "green" },
                        { name: "Community Engagement", color: "yellow" },
                        { name: "Operations & Infrastructure", color: "orange" },
                        { name: "Research & Development", color: "purple" }
                    ]
                }
            },
            "Status": {
                select: {
                    options: [
                        { name: "Active 🔥", color: "red" },
                        { name: "Building 🔨", color: "yellow" },
                        { name: "Ideation 🌀", color: "blue" },
                        { name: "Sunsetting 🌅", color: "orange" },
                        { name: "Completed ✅", color: "green" }
                    ]
                }
            },
            "Description": { rich_text: {} },
            "AI Summary": { rich_text: {} },
            "Project Lead": { people: {} },
            "Team Members": { people: {} },
            "Core Values": {
                select: {
                    options: [
                        { name: "Truth-Telling", color: "blue" },
                        { name: "Economic Freedom", color: "green" },
                        { name: "Decentralised Power", color: "orange" },
                        { name: "Creativity", color: "purple" },
                        { name: "Radical Humility", color: "pink" }
                    ]
                }
            },
            "Themes": {
                multi_select: {
                    options: [
                        { name: "Youth Justice", color: "red" },
                        { name: "Health and wellbeing", color: "green" },
                        { name: "Storytelling", color: "blue" },
                        { name: "Operations", color: "orange" },
                        { name: "Indigenous", color: "purple" },
                        { name: "Economic Freedom", color: "yellow" }
                    ]
                }
            },
            "Tags": { multi_select: {} },
            "Place": {
                select: {
                    options: [
                        { name: "Seed 🌱", color: "green" },
                        { name: "Seedling 🌿", color: "yellow" },
                        { name: "Lab 🧪", color: "blue" },
                        { name: "Harvest 🌾", color: "orange" }
                    ]
                }
            },
            "Location": { rich_text: {} },
            "State": {
                select: {
                    options: [
                        { name: "Queensland", color: "red" },
                        { name: "NSW", color: "blue" },
                        { name: "Victoria", color: "purple" },
                        { name: "National", color: "orange" },
                        { name: "Global", color: "green" }
                    ]
                }
            },
            "Revenue Actual": { number: { format: "australian_dollar" } },
            "Revenue Potential": { number: { format: "australian_dollar" } },
            "Actual Incoming": { number: { format: "australian_dollar" } },
            "Potential Incoming": { number: { format: "australian_dollar" } },
            "Next Milestone Date": { date: {} },
            "Start Date": { date: {} },
            "End Date": { date: {} },
            "Success Metrics": { rich_text: {} },
            "Website/Links": { url: {} }
        }
    },

    opportunities: {
        title: "ACT Opportunities",
        properties: {
            "Opportunity Name": { title: {} },
            "Stage": {
                select: {
                    options: [
                        { name: "Discovery 🔍", color: "gray" },
                        { name: "Qualification 📋", color: "blue" },
                        { name: "Proposal 📄", color: "yellow" },
                        { name: "Negotiation 🤝", color: "orange" },
                        { name: "Closed Won ✅", color: "green" },
                        { name: "Closed Lost ❌", color: "red" }
                    ]
                }
            },
            "Revenue Amount": { number: { format: "australian_dollar" } },
            "Probability": {
                select: {
                    options: [
                        { name: "10%", color: "red" },
                        { name: "25%", color: "orange" },
                        { name: "50%", color: "yellow" },
                        { name: "75%", color: "blue" },
                        { name: "90%", color: "green" },
                        { name: "100%", color: "green" }
                    ]
                }
            },
            "Weighted Revenue": {
                formula: {
                    expression: "prop(\"Revenue Amount\") * (toNumber(replaceAll(prop(\"Probability\"), \"%\", \"\")) / 100)"
                }
            },
            "Opportunity Type": {
                select: {
                    options: [
                        { name: "Grant", color: "green" },
                        { name: "Contract", color: "blue" },
                        { name: "Partnership", color: "purple" },
                        { name: "Investment", color: "orange" },
                        { name: "License", color: "yellow" },
                        { name: "Donation", color: "pink" }
                    ]
                }
            },
            "Description": { rich_text: {} },
            "Next Action": { rich_text: {} },
            "Next Action Date": { date: {} },
            "Deadline": { date: {} },
            "Application Date": { date: {} },
            "Expected Decision Date": { date: {} },
            "Requirements": { rich_text: {} },
            "Competition": { rich_text: {} },
            "Budget Breakdown": { rich_text: {} },
            "Success Criteria": { rich_text: {} },
            "Risk Assessment": { rich_text: {} },
            "Notes": { rich_text: {} }
        }
    },

    organizations: {
        title: "ACT Organizations",
        properties: {
            "Organization Name": { title: {} },
            "Type": {
                select: {
                    options: [
                        { name: "Government", color: "red" },
                        { name: "NGO", color: "green" },
                        { name: "Foundation", color: "blue" },
                        { name: "Corporate", color: "orange" },
                        { name: "University", color: "purple" },
                        { name: "Community Group", color: "yellow" },
                        { name: "Startup", color: "pink" }
                    ]
                }
            },
            "Sector": {
                multi_select: {
                    options: [
                        { name: "Health", color: "green" },
                        { name: "Education", color: "blue" },
                        { name: "Justice", color: "red" },
                        { name: "Environment", color: "green" },
                        { name: "Technology", color: "purple" },
                        { name: "Arts", color: "pink" }
                    ]
                }
            },
            "Size": {
                select: {
                    options: [
                        { name: "Startup (<10)", color: "red" },
                        { name: "Small (10-50)", color: "orange" },
                        { name: "Medium (50-200)", color: "yellow" },
                        { name: "Large (200-1000)", color: "blue" },
                        { name: "Enterprise (1000+)", color: "green" }
                    ]
                }
            },
            "Location": { rich_text: {} },
            "Website": { url: {} },
            "Description": { rich_text: {} },
            "Relationship Status": {
                select: {
                    options: [
                        { name: "Prospect", color: "gray" },
                        { name: "Active Partner", color: "green" },
                        { name: "Past Partner", color: "yellow" },
                        { name: "Current Client", color: "blue" },
                        { name: "Potential Client", color: "purple" }
                    ]
                }
            },
            "Partnership Type": {
                multi_select: {
                    options: [
                        { name: "Funding Partner", color: "green" },
                        { name: "Implementation Partner", color: "blue" },
                        { name: "Strategic Partner", color: "purple" },
                        { name: "Client", color: "orange" },
                        { name: "Vendor", color: "yellow" }
                    ]
                }
            },
            "Annual Budget": { number: { format: "australian_dollar" } },
            "Funding Capacity": {
                select: {
                    options: [
                        { name: "<$10K", color: "red" },
                        { name: "$10K-$50K", color: "orange" },
                        { name: "$50K-$200K", color: "yellow" },
                        { name: "$200K-$1M", color: "blue" },
                        { name: "$1M+", color: "green" }
                    ]
                }
            },
            "Decision Timeline": {
                select: {
                    options: [
                        { name: "Fast (<1 month)", color: "red" },
                        { name: "Medium (1-3 months)", color: "orange" },
                        { name: "Slow (3-6 months)", color: "yellow" },
                        { name: "Very Slow (6+ months)", color: "blue" }
                    ]
                }
            },
            "Values Alignment": {
                select: {
                    options: [
                        { name: "High", color: "green" },
                        { name: "Medium", color: "yellow" },
                        { name: "Low", color: "red" }
                    ]
                }
            },
            "Strategic Priority": {
                select: {
                    options: [
                        { name: "High", color: "red" },
                        { name: "Medium", color: "yellow" },
                        { name: "Low", color: "gray" }
                    ]
                }
            },
            "Last Contact Date": { date: {} },
            "Next Contact Date": { date: {} },
            "Notes": { rich_text: {} }
        }
    },

    people: {
        title: "ACT People",
        properties: {
            "Full Name": { title: {} },
            "Role/Title": { rich_text: {} },
            "Email": { email: {} },
            "Phone": { phone_number: {} },
            "LinkedIn": { url: {} },
            "Location": { rich_text: {} },
            "Relationship Type": {
                select: {
                    options: [
                        { name: "Team Member", color: "blue" },
                        { name: "Partner", color: "green" },
                        { name: "Client", color: "orange" },
                        { name: "Funder", color: "purple" },
                        { name: "Advisor", color: "yellow" },
                        { name: "Community Member", color: "pink" },
                        { name: "Prospect", color: "gray" }
                    ]
                }
            },
            "Influence Level": {
                select: {
                    options: [
                        { name: "Decision Maker", color: "red" },
                        { name: "Influencer", color: "orange" },
                        { name: "User", color: "yellow" },
                        { name: "Gatekeeper", color: "blue" }
                    ]
                }
            },
            "Communication Preference": {
                select: {
                    options: [
                        { name: "Email", color: "blue" },
                        { name: "Phone", color: "green" },
                        { name: "LinkedIn", color: "purple" },
                        { name: "In-Person", color: "orange" },
                        { name: "Video Call", color: "yellow" }
                    ]
                }
            },
            "Interests": { multi_select: {} },
            "Expertise": { multi_select: {} },
            "Last Contact Date": { date: {} },
            "Next Contact Date": { date: {} },
            "Contact Frequency": {
                select: {
                    options: [
                        { name: "Weekly", color: "red" },
                        { name: "Monthly", color: "orange" },
                        { name: "Quarterly", color: "yellow" },
                        { name: "Annually", color: "blue" },
                        { name: "As Needed", color: "gray" }
                    ]
                }
            },
            "Relationship Strength": {
                select: {
                    options: [
                        { name: "Strong", color: "green" },
                        { name: "Medium", color: "yellow" },
                        { name: "Weak", color: "orange" },
                        { name: "New", color: "blue" }
                    ]
                }
            },
            "Notes": { rich_text: {} },
            "Birthday": { date: {} },
            "Personal Interests": { rich_text: {} }
        }
    },

    artifacts: {
        title: "ACT Artifacts",
        properties: {
            "Artifact Name": { title: {} },
            "Type": {
                select: {
                    options: [
                        { name: "One Pager", color: "blue" },
                        { name: "Presentation", color: "orange" },
                        { name: "Proposal", color: "purple" },
                        { name: "Contract", color: "red" },
                        { name: "Report", color: "green" },
                        { name: "Case Study", color: "yellow" },
                        { name: "Website", color: "pink" },
                        { name: "Video", color: "gray" },
                        { name: "Notion Page", color: "blue" }
                    ]
                }
            },
            "Format": {
                select: {
                    options: [
                        { name: "PDF", color: "red" },
                        { name: "PowerPoint", color: "orange" },
                        { name: "Word", color: "blue" },
                        { name: "Notion", color: "gray" },
                        { name: "Website", color: "green" },
                        { name: "Video", color: "purple" },
                        { name: "Image", color: "yellow" }
                    ]
                }
            },
            "Status": {
                select: {
                    options: [
                        { name: "Draft", color: "red" },
                        { name: "Review", color: "orange" },
                        { name: "Approved", color: "green" },
                        { name: "Published", color: "blue" },
                        { name: "Archived", color: "gray" }
                    ]
                }
            },
            "File/Link": { files: {} },
            "Description": { rich_text: {} },
            "Audience": { multi_select: {} },
            "Purpose": {
                select: {
                    options: [
                        { name: "Sales", color: "green" },
                        { name: "Marketing", color: "blue" },
                        { name: "Reporting", color: "orange" },
                        { name: "Legal", color: "red" },
                        { name: "Internal", color: "gray" },
                        { name: "Training", color: "purple" }
                    ]
                }
            },
            "Version": { number: {} },
            "Created By": { people: {} },
            "Approved By": { people: {} },
            "Review Date": { date: {} },
            "Access Level": {
                select: {
                    options: [
                        { name: "Public", color: "green" },
                        { name: "Internal", color: "yellow" },
                        { name: "Confidential", color: "orange" },
                        { name: "Restricted", color: "red" }
                    ]
                }
            },
            "Tags": { multi_select: {} },
            "Usage Notes": { rich_text: {} }
        }
    }
};

// Function to create a database
async function createDatabase(parentPageId, schema) {
    try {
        const response = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: parentPageId
            },
            title: [
                {
                    type: "text",
                    text: {
                        content: schema.title
                    }
                }
            ],
            properties: schema.properties
        });
        
        console.log(`✅ Created database: ${schema.title}`);
        console.log(`   Database ID: ${response.id}`);
        return response.id;
    } catch (error) {
        console.error(`❌ Error creating database ${schema.title}:`, error.message);
        return null;
    }
}

// Function to add relations between databases
async function addRelationProperties(databaseId, relations) {
    try {
        for (const [propertyName, relationConfig] of Object.entries(relations)) {
            await notion.databases.update({
                database_id: databaseId,
                properties: {
                    [propertyName]: {
                        relation: {
                            database_id: relationConfig.database_id,
                            type: relationConfig.type || "dual_property"
                        }
                    }
                }
            });
            console.log(`✅ Added relation: ${propertyName}`);
        }
    } catch (error) {
        console.error(`❌ Error adding relations:`, error.message);
    }
}

// Main setup function
async function setupACTDatabases(parentPageId) {
    console.log("🚀 Setting up ACT Placemat databases...\n");
    
    const databaseIds = {};
    
    // Create all databases first
    for (const [key, schema] of Object.entries(databaseSchemas)) {
        const id = await createDatabase(parentPageId, schema);
        if (id) {
            databaseIds[key] = id;
        }
    }
    
    console.log("\n📋 Database IDs created:");
    Object.entries(databaseIds).forEach(([name, id]) => {
        console.log(`   ${name}: ${id}`);
    });
    
    // Add relations between databases
    if (Object.keys(databaseIds).length === 5) {
        console.log("\n🔗 Adding database relations...");
        
        // Projects relations
        await addRelationProperties(databaseIds.projects, {
            "🎯 Related Opportunities": { database_id: databaseIds.opportunities },
            "📋 Project Artifacts": { database_id: databaseIds.artifacts },
            "🏢 Partner Organizations": { database_id: databaseIds.organizations }
        });
        
        // Opportunities relations
        await addRelationProperties(databaseIds.opportunities, {
            "Organization": { database_id: databaseIds.organizations },
            "🎯 Related Projects": { database_id: databaseIds.projects },
            "Primary Contact": { database_id: databaseIds.people },
            "Decision Makers": { database_id: databaseIds.people },
            "📋 Supporting Artifacts": { database_id: databaseIds.artifacts }
        });
        
        // Organizations relations
        await addRelationProperties(databaseIds.organizations, {
            "🎯 Active Opportunities": { database_id: databaseIds.opportunities },
            "🚀 Related Projects": { database_id: databaseIds.projects },
            "👥 Key Contacts": { database_id: databaseIds.people },
            "📋 Shared Artifacts": { database_id: databaseIds.artifacts }
        });
        
        // People relations
        await addRelationProperties(databaseIds.people, {
            "Organization": { database_id: databaseIds.organizations },
            "🎯 Related Opportunities": { database_id: databaseIds.opportunities },
            "🚀 Related Projects": { database_id: databaseIds.projects },
            "📋 Shared Artifacts": { database_id: databaseIds.artifacts }
        });
        
        // Artifacts relations
        await addRelationProperties(databaseIds.artifacts, {
            "🎯 Related Opportunities": { database_id: databaseIds.opportunities },
            "🚀 Related Projects": { database_id: databaseIds.projects },
            "🏢 Related Organizations": { database_id: databaseIds.organizations },
            "👥 Related People": { database_id: databaseIds.people }
        });
    }
    
    console.log("\n🎉 ACT Placemat database setup complete!");
    console.log("\n📝 Next steps:");
    console.log("1. Import your existing project data");
    console.log("2. Add key organizations and contacts");
    console.log("3. Start tracking opportunities");
    console.log("4. Create supporting artifacts");
    
    return databaseIds;
}

// Export for use
module.exports = {
    setupACTDatabases,
    databaseSchemas
};

// If run directly, execute setup
if (require.main === module) {
    const parentPageId = process.argv[2];
    if (!parentPageId) {
        console.error("❌ Please provide a parent page ID as an argument");
        console.log("Usage: node notion-integration.js <parent-page-id>");
        process.exit(1);
    }
    
    setupACTDatabases(parentPageId)
        .then(() => {
            console.log("✅ Setup completed successfully!");
        })
        .catch((error) => {
            console.error("❌ Setup failed:", error);
        });
}