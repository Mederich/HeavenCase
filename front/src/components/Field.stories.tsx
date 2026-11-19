import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field } from './Field'

const meta = {
  title: 'Formulaires/Field',
  component: Field,
  args: { label: 'Email', type: 'email', placeholder: 'joueur@exemple.fr' },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AvecAide: Story = {
  args: { label: 'Pseudo', type: 'text', placeholder: undefined, hint: '3 à 20 caractères' },
}

export const EnErreur: Story = { args: { defaultValue: 'joueur', error: 'Email invalide' } }

export const MotDePasse: Story = {
  args: { label: 'Mot de passe', type: 'password', placeholder: undefined, defaultValue: 'motdepasse' },
}
