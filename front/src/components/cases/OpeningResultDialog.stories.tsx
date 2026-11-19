import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { openingResult } from '@/stories/fixtures'
import { OpeningResultDialog } from './OpeningResultDialog'

const meta = {
  title: 'Caisses/OpeningResultDialog',
  component: OpeningResultDialog,
  args: {
    result: openingResult,
    open: true,
    price: openingResult.price_paid,
    onOpenChange: fn(),
    onOpenAgain: fn() as (() => void) | null,
  },
} satisfies Meta<typeof OpeningResultDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SoldeInsuffisant: Story = { args: { onOpenAgain: null } }
