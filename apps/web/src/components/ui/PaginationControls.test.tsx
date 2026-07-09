import { render, screen } from '@testing-library/react';
import { PaginationControls } from './PaginationControls';

describe('PaginationControls', () => {
  it('renders prev/next links preserving other search params', () => {
    render(
      <PaginationControls
        meta={{ page: 2, limit: 2, total: 6, totalPages: 3 }}
        basePath="/submissions"
        searchParams={{ status: 'draft' }}
      />,
    );

    expect(screen.getByRole('link', { name: '前へ' })).toHaveAttribute(
      'href',
      '/submissions?status=draft&page=1',
    );
    expect(screen.getByRole('link', { name: '次へ' })).toHaveAttribute(
      'href',
      '/submissions?status=draft&page=3',
    );
    expect(screen.getByText('2 / 3 ページ（全 6 件）')).toBeInTheDocument();
  });

  it('does not render a prev link on the first page', () => {
    render(
      <PaginationControls
        meta={{ page: 1, limit: 2, total: 6, totalPages: 3 }}
        basePath="/submissions"
        searchParams={{}}
      />,
    );

    expect(
      screen.queryByRole('link', { name: '前へ' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '次へ' })).toBeInTheDocument();
  });

  it('does not render a next link on the last page', () => {
    render(
      <PaginationControls
        meta={{ page: 3, limit: 2, total: 6, totalPages: 3 }}
        basePath="/submissions"
        searchParams={{}}
      />,
    );

    expect(screen.getByRole('link', { name: '前へ' })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '次へ' }),
    ).not.toBeInTheDocument();
  });

  it('renders neither link and treats an empty result as a single page', () => {
    render(
      <PaginationControls
        meta={{ page: 1, limit: 20, total: 0, totalPages: 0 }}
        basePath="/submissions"
        searchParams={{}}
      />,
    );

    expect(
      screen.queryByRole('link', { name: '前へ' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '次へ' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1 / 1 ページ（全 0 件）')).toBeInTheDocument();
  });
});
