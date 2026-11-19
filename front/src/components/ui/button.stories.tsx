import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Ouvrir' },
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] },
    size: { control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = { args: { variant: 'outline', children: 'Se connecter' } }

export const Ghost: Story = { args: { variant: 'ghost', children: 'Se déconnecter' } }

export const Destructive: Story = { args: { variant: 'destructive', children: 'Vendre' } }

export const Disabled: Story = { args: { disabled: true } }

export const Tailles: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Button {...args} size="xs" />
      <Button {...args} size="sm" />
      <Button {...args} />
      <Button {...args} size="lg" />
    </div>
  ),
}
