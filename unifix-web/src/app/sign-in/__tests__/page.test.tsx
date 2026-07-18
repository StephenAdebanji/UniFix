import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('SignInPage', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shows an error message when login fails', async () => {
    const login = jest.fn().mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    mockUseAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByPlaceholderText('you@uni.edu'), 'wrong@uni.edu');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates to /dashboard on successful login', async () => {
    const login = jest.fn().mockResolvedValue({ id: 1, role: 'STUDENT_STAFF' });
    mockUseAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.type(screen.getByPlaceholderText('you@uni.edu'), 'student@uni.edu');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    expect(login).toHaveBeenCalledWith('student@uni.edu', 'password123');
  });

  it('logs in with a demo account when its button is clicked', async () => {
    const login = jest.fn().mockResolvedValue({ id: 1, role: 'ADMINISTRATOR' });
    mockUseAuth.mockReturnValue({ login });
    const user = userEvent.setup();

    render(<SignInPage />);

    await user.click(screen.getByRole('button', { name: /Administrator/ }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('admin@uni.edu', 'password123'),
    );
  });
});
