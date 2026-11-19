import type { Meta, StoryObj } from '@storybook/react-vite'
import { SuccessAlert } from './SuccessAlert'

const meta = {
  title: 'Retours/SuccessAlert',
  component: SuccessAlert,
  args: { children: 'Mot de passe modifié.' },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof SuccessAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
