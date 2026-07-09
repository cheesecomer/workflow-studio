import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('Input', () => {
  it('renders a native input and forwards props', () => {
    render(<Input type="email" name="email" placeholder="you@example.com" />);

    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });
});
