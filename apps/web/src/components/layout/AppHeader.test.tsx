import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('renders the app name inside a banner landmark', () => {
    render(<AppHeader />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument();
  });

  it('links to the document management screen', () => {
    render(<AppHeader />);

    expect(screen.getByRole('link', { name: '申請書管理' })).toHaveAttribute(
      'href',
      '/documents',
    );
  });
});
