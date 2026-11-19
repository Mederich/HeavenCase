import type { Meta, StoryObj } from '@storybook/react-vite'
import { Header } from './Header'

const meta = {
  title: 'Navigation/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Deconnecte: Story = { parameters: { user: null } }

export const Connecte: Story = {
  parameters: { user: { id: '1', username: 'flo', email: 'flo@exemple.fr', balance: 12500 } },
}

export const SessionEnCours: Story = { parameters: { user: undefined } }
