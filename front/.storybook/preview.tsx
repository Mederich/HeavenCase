import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { AuthContext, type AuthContextValue, type CurrentUser } from '../src/auth/context'
import '../src/index.css'

// Session simulée : une story choisit le joueur avec `parameters.user`
// (undefined : vérification en cours, null : déconnecté).
function mockAuth(user: CurrentUser | null | undefined): AuthContextValue {
  return {
    user,
    login: async () => {},
    register: async () => '',
    logout: async () => {},
    refresh: async () => {},
  }
}

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story, { parameters }) => (
      <AuthContext.Provider value={mockAuth('user' in parameters ? parameters.user : null)}>
        <MemoryRouter>
          <div className="bg-background p-4 text-foreground">
            <Story />
          </div>
        </MemoryRouter>
      </AuthContext.Provider>
    ),
  ],
}

export default preview
