import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmActionButton } from './confirm-action-button';

describe('ConfirmActionButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onClick when the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmActionButton confirmMessage="削除しますか？" onClick={onClick}>
        削除
      </ConfirmActionButton>,
    );

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(window.confirm).toHaveBeenCalledWith('削除しますか？');
    expect(onClick).toHaveBeenCalled();
  });

  it('does not call onClick when the user cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmActionButton confirmMessage="削除しますか？" onClick={onClick}>
        削除
      </ConfirmActionButton>,
    );

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
