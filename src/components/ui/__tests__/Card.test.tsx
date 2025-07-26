import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from '../Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div data-testid="card-content">Card Content</div>
      </Card>
    );
    expect(screen.getByTestId('card-content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(
      <Card title="Card Title" subtitle="Card Subtitle">
        Card Content
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  it('applies different padding classes based on padding prop', () => {
    const { rerender } = render(<Card padding="none">No Padding</Card>);
    expect(screen.getByText('No Padding').parentElement).not.toHaveClass('p-3', 'p-5', 'p-6');

    rerender(<Card padding="sm">Small Padding</Card>);
    expect(screen.getByText('Small Padding').parentElement).toHaveClass('p-3');

    rerender(<Card padding="md">Medium Padding</Card>);
    expect(screen.getByText('Medium Padding').parentElement).toHaveClass('p-5');

    rerender(<Card padding="lg">Large Padding</Card>);
    expect(screen.getByText('Large Padding').parentElement).toHaveClass('p-6');
  });

  it('applies hoverable styles when hoverable prop is true', () => {
    render(<Card hoverable>Hoverable Card</Card>);
    expect(screen.getByText('Hoverable Card').parentElement).toHaveClass('hover:shadow-md', 'cursor-pointer');
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    fireEvent.click(screen.getByText('Clickable Card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className when provided', () => {
    render(<Card className="custom-class">Custom Class Card</Card>);
    expect(screen.getByText('Custom Class Card').parentElement).toHaveClass('custom-class');
  });

  it('applies custom style when provided', () => {
    render(
      <Card style={{ backgroundColor: 'red' }}>
        Styled Card
      </Card>
    );
    expect(screen.getByText('Styled Card').parentElement).toHaveStyle('background-color: red');
  });
});