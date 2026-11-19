import type { Meta, StoryObj } from '@storybook/react-vite'
import { caseSummary } from '@/stories/fixtures'
import { CaseCard } from './CaseCard'

const meta = {
  title: 'Caisses/CaseCard',
  component: CaseCard,
  args: { item: caseSummary },
  decorators: [(Story) => <div className="w-56"><Story /></div>],
} satisfies Meta<typeof CaseCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Teintes: Story = {
  decorators: [(Story) => <div className="w-[56rem]"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      {[25, 100, 200, 300, 450, 1000, 2000, 5000].map((price) => (
        <CaseCard key={price} item={{ ...caseSummary, id: String(price), name: `Caisse ${price}`, price }} />
      ))}
    </div>
  ),
}
