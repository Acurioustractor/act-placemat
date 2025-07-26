// ACTUAL Notion database schemas - Generated from real database inspection
// This file maps the frontend to the REAL database properties

export const DATABASE_SCHEMAS = {
  projects: {
    id: "177ebcf981cf80dd9514f1ec32f3314c",
    title: "Projects",
    properties: {
      // Core project info
      Name: { type: "title" },
      Description: { type: "rich_text" },
      Status: { 
        type: "select",
        options: ["Transferred ✅", "Sunsetting 🌅", "Active 🔥", "Ideation 🌀", "Active"]
      },
      
      // Location & Geographic
      State: { 
        type: "select",
        options: ["Queensland", "Northern Territory", "Global", "National", "ACT", "NSW"]
      },
      Location: { 
        type: "select",
        options: ["Sunshine Coast", "Tennant Creek", "Mount Isa", "Canberra", "Sydney", "Spain", "Everywhere", "Brisbane", "Stradbroke Island", "Maningrida", "Alice Springs", "Palm Island", "Townsville", "Toowoomba"]
      },
      
      // Themes & Areas (multi-select)
      Theme: { 
        type: "multi_select",
        options: ["Youth Justice", "Health and wellbeing", "Indigenous", "Global community", "Economic Freedom", "Storytelling", "Operations"]
      },
      
      // Tags (multi-select)
      Tags: { 
        type: "multi_select",
        options: ["Technology", "Concept", "Design", "Experience", "Health", "Living", "Product", "Digital Experience", "Farm", "Moneymaker", "Client Led", "Connected", "Collaboration", "Event", "Workshop", "Podcast", "Fellowship", "Storytelling", "Research", "Strategy", "Business", "Con-nected", "Empathy Ledger", "justice"]
      },
      
      // Financial
      "Revenue Actual": { type: "number" },
      "Revenue Potential": { type: "number" },
      "Actual Incoming": { type: "number" },
      "Potential Incoming": { type: "number" },
      "Total Funding": { type: "rollup" },
      
      // Dates
      "Next Milestone Date": { type: "date" },
      
      // People & Relationships
      "Project Lead": { type: "people" },
      Organisations: { type: "relation" },
      Opportunities: { type: "relation" },
      Artifacts: { type: "relation" },
      
      // Project Classification
      Place: { 
        type: "select",
        options: ["Bank", "Lab", "Knowledge", "Seedling", "Seed"]
      },
      "Core Values": { 
        type: "select",
        options: ["Truth-Telling", "Creativity", "Decentralised Power", "Radical Humility"]
      }
    }
  },
  
  opportunities: {
    id: "234ebcf981cf804e873ff352f03c36da",
    title: "Opportunities",
    properties: {
      // Core opportunity info
      Name: { type: "title" },
      Amount: { type: "number" },
      
      // Stage & Probability
      Stage: { 
        type: "select",
        options: ["Discovery", "Applied", "Negotiation", "Closed Won", "Closed Lost"]
      },
      Probability: { 
        type: "select",
        options: ["10%", "25%", "50%", "75%", "90%"]
      },
      
      // Dates & Actions
      Deadline: { type: "date" },
      "Next Action": { type: "rich_text" },
      
      // Relationships
      Projects: { type: "relation" },
      Organisations: { type: "relation" },
      "Team members": { type: "relation" },
      Artifacts: { type: "relation" }
    }
  },
  
  organizations: {
    id: "948f39467d1c42f2bd7e1317a755e67b",
    title: "Organisations",
    properties: {
      // Core org info
      Name: { type: "title" },
      Description: { type: "rich_text" },
      Website: { type: "url" },
      Twitter: { type: "url" },
      
      // Status & Relationships
      Status: { 
        type: "select",
        options: ["Contacted", "Research", "Pitched", "Diligence", "Won", "Lost"]
      },
      
      // Relationships
      "Primary Contacts": { type: "relation" },
      Contacts: { type: "relation" },
      Projects: { type: "relation" },
      Opportunities: { type: "relation" },
      Fundings: { type: "relation" },
      
      // Metrics
      "Active Projects": { type: "rollup" },
      LinkedIn: { type: "rollup" }
    }
  },
  
  people: {
    id: "47bdc1c4df994ddc81c4a0214c919d69",
    title: "People",
    properties: {
      // Core person info - CRITICAL: Missing Name title field!
      Email: { type: "email" },
      Mobile: { type: "phone_number" },
      Source: { type: "rich_text" },
      Company: { type: "select" }, // 200+ company options
      
      // Location & Contact
      Location: { type: "select" }, // 24 location options
      Address: { type: "rich_text" },
      Website: { type: "url" },
      LinkedIn: { type: "url" },
      Twitter: { type: "url" },
      
      // Relationship Management
      Connection: { type: "select" }, // 11 connection types
      Status: { type: "select" }, // 6 status options
      Role: { type: "select" }, // 75+ role options
      Theme: { type: "select" },
      
      // Relations - USER ADDED THESE!
      Projects: { type: "relation" },
      Opportunities: { type: "relation" },
      Organisation: { type: "relation" },
      Actions: { type: "relation" },
      
      // Contact Tracking
      "First Contact": { type: "date" },
      "Last Contact": { type: "date" },
      "Meeting Date & Time": { type: "date" },
      "Meeting Location": { type: "rich_text" },
      Notes: { type: "rich_text" },
      Birthday: { type: "date" },
      
      // Workflow
      Tag: { type: "multi_select" }, // 25 tag options
      Followup: { type: "checkbox" },
      Rekindle: { type: "checkbox" }
    }
  },
  
  artifacts: {
    id: "234ebcf981cf8015878deadb337662e4",
    title: "Artifacts",
    properties: {
      // Core artifact info
      Name: { type: "title" },
      Type: { type: "select" },
      Link: { type: "url" },
      
      // File management
      "Files & media": { type: "files" },
      "Thumbnail Image": { type: "files" },
      
      // Relationships
      Projects: { type: "relation" },
      Opportunities: { type: "relation" }
    }
  }
};

// Helper functions to get actual options
export const getActualStatusOptions = (database: keyof typeof DATABASE_SCHEMAS) => {
  return DATABASE_SCHEMAS[database].properties.Status?.options || [];
};

export const getActualThemeOptions = () => {
  return DATABASE_SCHEMAS.projects.properties.Theme?.options || [];
};

export const getActualLocationOptions = () => {
  return DATABASE_SCHEMAS.projects.properties.Location?.options || [];
};

export const getActualStateOptions = () => {
  return DATABASE_SCHEMAS.projects.properties.State?.options || [];
};

export const getActualStageOptions = () => {
  return DATABASE_SCHEMAS.opportunities.properties.Stage?.options || [];
};

export const getActualProbabilityOptions = () => {
  return DATABASE_SCHEMAS.opportunities.properties.Probability?.options || [];
};