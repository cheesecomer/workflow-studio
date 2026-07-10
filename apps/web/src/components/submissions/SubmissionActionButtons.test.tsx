vi.mock('@/lib/actions/submissions', () => ({
  deleteSubmissionAction: vi.fn(),
  submitSubmissionDirectlyAction: vi.fn(),
  withdrawSubmissionAction: vi.fn(),
}));

import { render, screen } from '@testing-library/react';
import { SubmissionActionButtons } from './SubmissionActionButtons';

describe('SubmissionActionButtons', () => {
  it('renders edit, submit, and delete for a draft submission', () => {
    render(
      <SubmissionActionButtons
        id="1"
        availableActions={['edit', 'submit', 'delete']}
      />,
    );

    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/submissions/1/edit',
    );
    expect(
      screen.getByRole('button', { name: '提出' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '削除' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '取り下げ' }),
    ).not.toBeInTheDocument();
  });

  it('renders only withdraw for a submitted submission', () => {
    render(<SubmissionActionButtons id="1" availableActions={['withdraw']} />);

    expect(
      screen.getByRole('button', { name: '取り下げ' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '提出' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '削除' }),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when there are no available actions', () => {
    render(<SubmissionActionButtons id="1" availableActions={[]} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
