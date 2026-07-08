import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('NotFound', () => {
  it('renders a heading and a link back to the top page', () => {
    render(<NotFound />);

    expect(
      screen.getByRole('heading', { name: 'ページが見つかりません' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'トップに戻る' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
