import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { lootTable } from '@/stories/fixtures'
import { Roulette } from './Roulette'

const meta = {
  title: 'Caisses/Roulette',
  component: Roulette,
  parameters: { layout: 'fullscreen' },
  args: { items: lootTable, winner: lootTable[1], spinKey: '1', skip: false, onDone: fn() },
} satisfies Meta<typeof Roulette>

export default meta
type Story = StoryObj<typeof meta>

export const Animation: Story = {}

export const SansAnimation: Story = { args: { skip: true, spinKey: '2' } }
