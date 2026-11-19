import type { Meta, StoryObj } from '@storybook/react-vite'
import { lootTable } from '@/stories/fixtures'
import { ItemCard } from './ItemCard'

const meta = {
  title: 'Caisses/ItemCard',
  component: ItemCard,
  args: { item: lootTable[2], showProbability: true },
  decorators: [(Story) => <div className="w-44"><Story /></div>],
} satisfies Meta<typeof ItemCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SansProbabilite: Story = { args: { showProbability: false } }

export const Couteau: Story = { args: { item: lootTable[0] } }

export const Grades: Story = {
  decorators: [(Story) => <div className="w-[60rem]"><Story /></div>],
  render: (args) => (
    <div className="grid grid-cols-5 gap-3">
      {lootTable.map((item) => (
        <ItemCard key={item.item_id} {...args} item={item} />
      ))}
    </div>
  ),
}
