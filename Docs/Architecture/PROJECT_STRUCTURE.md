# ACT Platform - Separated Architecture

## 🏗️ **Clean Separation Strategy**

```
ACT-Platform/
├── backend/                    # Pure backend API
│   ├── src/
│   │   ├── api/               # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, CORS, etc.
│   │   └── utils/             # Helpers
│   ├── database/              # DB schemas & migrations
│   ├── tests/                 # Backend tests
│   └── package.json           # Backend dependencies
│
├── frontend/                   # Pure frontend app
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API clients
│   │   └── utils/             # Frontend helpers
│   ├── public/                # Static assets
│   └── package.json           # Frontend dependencies
│
├── shared/                     # Shared types & constants
│   ├── types/                 # TypeScript definitions
│   └── constants/             # Shared constants
│
└── docs/                      # Documentation
    ├── api/                   # API documentation
    ├── deployment/            # Deployment guides
    └── development/           # Dev setup guides
```

## 🔗 **Connection Strategy**

- **Backend**: Express.js API server + Supabase database
- **Frontend**: React app that calls backend API
- **Communication**: REST API with JSON
- **Authentication**: Backend handles auth, frontend stores tokens
- **Deployment**: Separate deployments (backend → Railway/Render, frontend → Vercel/Netlify)