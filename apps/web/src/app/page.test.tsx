vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { redirect } from 'next/navigation';
import Home from './page';

describe('Home', () => {
  it('redirects to the submission list', () => {
    expect(() => Home()).toThrow('REDIRECT:/submissions');
    expect(redirect).toHaveBeenCalledWith('/submissions');
  });
});
