import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    inputSize: {
      control: 'select',
      options: ['default', 'sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: {
    placeholder: 'Digite algo...',
    inputSize: 'default',
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Small: Story = {
  args: { inputSize: 'sm', placeholder: 'Tamanho Pequeno (32px)' },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Medium: Story = {
  args: { inputSize: 'md', placeholder: 'Tamanho Médio (36px)' },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Large: Story = {
  args: { inputSize: 'lg', placeholder: 'Tamanho Grande (44px)' },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Campo desabilitado' },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-80">
      <Input inputSize="sm" placeholder="Small (32px / h-8)" />
      <Input inputSize="md" placeholder="Medium (36px / h-9)" />
      <Input inputSize="default" placeholder="Default (40px / h-10)" />
      <Input inputSize="lg" placeholder="Large (44px / h-11)" />
    </div>
  ),
};
