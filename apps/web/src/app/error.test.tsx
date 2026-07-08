import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorPage from './error';

describe('Error', () => {
  it('renders the error message and retries on click', async () => {
    const unstable_retry = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorPage
        error={new Error('Submission not found')}
        unstable_retry={unstable_retry}
      />,
    );

    expect(screen.getByText('Submission not found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '再試行' }));

    expect(unstable_retry).toHaveBeenCalledTimes(1);
  });
});
