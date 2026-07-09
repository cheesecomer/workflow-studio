vi.mock('server-only', () => ({}));
vi.mock('@/lib/actions/documents', () => ({
  createDocumentAction: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDocumentAction } from '@/lib/actions/documents';
import { NewDocumentForm } from './NewDocumentForm';

describe('NewDocumentForm', () => {
  it('renders the name field and submit button', () => {
    render(<NewDocumentForm />);

    expect(screen.getByRole('textbox', { name: /申請書名/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '作成' })).toBeInTheDocument();
  });

  it('shows the error message returned by the action', async () => {
    vi.mocked(createDocumentAction).mockResolvedValue({
      ok: false,
      message: '申請書名を入力してください',
    });
    const user = userEvent.setup();

    render(<NewDocumentForm />);
    await user.type(screen.getByRole('textbox', { name: /申請書名/ }), '経費精算書');
    await user.click(screen.getByRole('button', { name: '作成' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '申請書名を入力してください',
    );
    expect(createDocumentAction).toHaveBeenCalled();
  });
});
