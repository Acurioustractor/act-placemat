# ACT Placemat React Client

This is the React frontend for the ACT Placemat application.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **Framer Motion** for animations
- **Vitest** for testing

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API services
├── types/               # TypeScript definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── styles/              # Global styles
```

## API Integration

The client communicates with the Express server running on port 3000. In development, Vite proxies API calls to the backend server.

## Environment Variables

No client-side environment variables are needed. All sensitive configuration is handled by the backend server.