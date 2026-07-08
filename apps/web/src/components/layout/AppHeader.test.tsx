import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('renders the app name inside a banner landmark', () => {
    render(<AppHeader />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument();
  });
});
