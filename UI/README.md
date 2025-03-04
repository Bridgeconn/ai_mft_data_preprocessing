# React + TypeScript + Vite SWC

Comprehensive recommendation for setting up a React application with those specifications:

## To run the project

- You need to have nodejs and pnpm installed on you system
- To install pnpm run `npm install -g pnpm`

```
pnpm install
pnpm run dev
```

## Project Structure and Core Technologies:

1. Framework: React with TypeScript
2. Build Tool: Vite (faster and lighter than Create React App)
3. State Management: Zustand (lightweight alternative to Redux)
4. Routing: React Router
5. Type Safety: TypeScript
6. API Interactions: Axios or Tanstack Query
7. Authentication: React Context with JWT handling

Here's a detailed project setup guide:

````plaintext
# React TypeScript Gitea Project Setup

## Initial Project Creation
```bash
pnpm create vite@latest git-explorer-ui --template react-ts
cd git-explorer-ui
pnpm install
````

vite with react, typescript and swc

```
npm install vite@^5.0.0 @vitejs/plugin-react-swc@latest -D
```

## Core Dependencies

```bash
# Routing
pnpm install react-router-dom

# State Management
pnpm install zustand

# HTTP Requests
pnpm install axios @tanstack/react-query

# Form Handling
# pnpm install react-hook-form zod @hookform/resolvers

# Authentication
# pnpm install jwt-decode

# UI Component Library (optional)
pnpm install @shadcn/ui tailwindcss

# Utility Libraries
pnpm install lodash @types/lodash date-fns
```

## Commands run after this

```
pnpm install -D tailwindcss postcss autoprefixer

npx tailwindcss init -p

pnpm i -D @types/node

pnpm dlx shadcn@latest init

```

✔ Which style would you like to use? › Default
✔ Which color would you like to use as the base color? › Gray
✔ Would you like to use CSS variables for theming? … no / yes

```
pnpm install lucide-react @radix-ui/react-dropdown-menu @radix-ui/react-navigation-menu
```

## Recommended Project Structure

```
src/
│
├── components/
│   ├── common/           # Reusable components
│   ├── layout/           # Layout components
│   └── ui/               # UI-specific components
│
├── pages/                # Page components (20 pages)
│   ├── Dashboard/
│   ├── Authentication/
│   ├── Users/
│   └── ...
│
├── services/             # API interaction logic
│   ├── gitea/            # Gitea-specific API calls
│   │   ├── auth.service.ts
│   │   └── repo.service.ts
│   └── api.ts            # Axios configuration
│
├── stores/               # Zustand stores
│   ├── authStore.ts
│   └── userStore.ts
│
├── types/                # TypeScript type definitions
│   ├── user.ts
│   ├── repository.ts
│   └── auth.ts
│
├── utils/                # Utility functions
│   ├── auth.ts
│   └── helpers.ts
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   └── useGiteaApi.ts
│
└── App.tsx
```

## Authentication Strategy with Gitea

1. Use OAuth2 or Personal Access Tokens
2. Store tokens securely in HttpOnly cookies or encrypted localStorage
3. Implement refresh token mechanism
4. Create interceptors to handle token expiration

## Example Authentication Store (Zustand)

```typescript
import create from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  token: string | null;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const useStore = create<AuthStore>(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (credentials) => {
        // Gitea login logic
      },
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: "auth-storage",
      // Optional: Define storage mechanism
    }
  )
);
```

## Best Practices

1. Strict TypeScript Configuration
   - Enable `strict: true` in `tsconfig.json`
   - Use explicit type annotations
2. Error Handling

   - Create centralized error handling mechanism
   - Use React Error Boundaries
   - Implement global error toast/notification system

3. Performance Optimization

   - Use React.memo for component memoization
   - Implement code splitting with React.lazy
   - Use Tanstack Query for efficient data fetching and caching

4. Security Considerations

   - Implement CSRF protection
   - Use secure HTTP-only cookies
   - Validate and sanitize all user inputs
   - Implement proper authorization checks

5. API Interaction Patterns
   - Create type-safe service layers
   - Use interceptors for global error handling
   - Implement retry mechanisms for failed requests

## Recommended ESLint and Prettier Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "no-unused-vars": "error"
  }
}
```

## CI/CD Suggestions

- Use GitHub Actions for:
  - Automated testing
  - TypeScript type checking
  - Linting
  - Deployment to static hosting (Netlify/Vercel)

```

This comprehensive guide covers setting up a robust, type-safe React application with Gitea integration. The structure emphasizes modularity, type safety, and best practices for scalable frontend development.

Additional Recommendations:
- Use Tanstack Query for server state management
- Implement proper authentication flows
- Create reusable, composable components
- Use TypeScript for compile-time type checking

Potential Challenges to Consider:
- Managing 20 pages might require careful code organization
- Ensure consistent state management across complex flows
- Implement proper error boundaries and loading states

```

Key Highlights and Recommendations:

1. Architecture Choices

- TypeScript for type safety
- Vite for fast development
- Zustand for lightweight state management
- Tanstack Query for efficient data fetching
- React Router for navigation

2. Key Packages

- `axios` or `tanstack/react-query` for API calls
- `react-hook-form` for form management
- `zod` for runtime type validation
- `jwt-decode` for token handling
- `shadcn/ui` for component library (optional)

3. Important Practices

- Implement strict TypeScript configuration
- Create centralized error handling
- Use code splitting
- Secure token management
- Implement proper authentication flows

Would you like me to elaborate on any specific aspect of the project setup or discuss more detailed implementation strategies for Gitea integration?
