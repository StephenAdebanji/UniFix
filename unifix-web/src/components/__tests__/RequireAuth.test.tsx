import { render, screen } from '@testing-library/react';
import { RequireAuth } from '../RequireAuth';
import { useAuth } from '@/lib/auth-context';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('RequireAuth', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('redirects to /sign-in when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <RequireAuth>
        <div>secret content</div>
      </RequireAuth>,
    );
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when the role is not permitted', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'STUDENT_STAFF' },
      loading: false,
    });
    render(
      <RequireAuth roles={['ADMINISTRATOR']}>
        <div>admin only content</div>
      </RequireAuth>,
    );
    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('admin only content')).not.toBeInTheDocument();
  });

  it('renders children when the role is permitted', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, role: 'ADMINISTRATOR' },
      loading: false,
    });
    render(
      <RequireAuth roles={['ADMINISTRATOR']}>
        <div>admin only content</div>
      </RequireAuth>,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('admin only content')).toBeInTheDocument();
  });

  it('shows a loading state while auth is resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <RequireAuth>
        <div>secret content</div>
      </RequireAuth>,
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
