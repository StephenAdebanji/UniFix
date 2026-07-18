import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewRequestPage from '../page';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const push = jest.fn();
const back = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace: jest.fn() }),
  usePathname: () => '/requests/new',
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    categories: { list: jest.fn() },
    requests: { create: jest.fn() },
    upload: { evidence: jest.fn() },
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockApi = api as unknown as {
  categories: { list: jest.Mock };
  requests: { create: jest.Mock };
  upload: { evidence: jest.Mock };
};

describe('NewRequestPage', () => {
  beforeEach(() => {
    push.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 2, name: 'Yaw', role: 'STUDENT_STAFF' },
      loading: false,
    });
    mockApi.categories.list.mockResolvedValue([
      { id: 1, name: 'Electricity' },
      { id: 2, name: 'Plumbing' },
    ]);
  });

  it('requires title, category, location, and description before submitting', async () => {
    render(<NewRequestPage />);
    await screen.findByText('Electricity');

    const submitButton = screen.getByRole('button', { name: 'Submit request' });
    expect(submitButton).toHaveAttribute('type', 'submit');
    expect(screen.getByLabelText(/Title/)).toBeRequired();
    expect(screen.getByLabelText(/Category/)).toBeRequired();
    expect(screen.getByLabelText(/Location/)).toBeRequired();
    expect(screen.getByLabelText(/Description/)).toBeRequired();
  });

  it('submits the form and redirects to the new request detail page', async () => {
    mockApi.requests.create.mockResolvedValue({ id: 42 });
    const user = userEvent.setup();

    render(<NewRequestPage />);
    await screen.findByText('Electricity');

    await user.type(screen.getByLabelText(/Title/), 'Broken projector');
    await user.selectOptions(screen.getByLabelText(/Category/), '1');
    await user.type(screen.getByLabelText(/Location/), 'LT-2');
    await user.type(
      screen.getByLabelText(/Description/),
      'The projector will not power on for morning lectures.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() =>
      expect(mockApi.requests.create).toHaveBeenCalledWith({
        title: 'Broken projector',
        categoryId: 1,
        priority: 'MEDIUM',
        location: 'LT-2',
        description: 'The projector will not power on for morning lectures.',
        evidenceFileUrl: undefined,
      }),
    );
    expect(push).toHaveBeenCalledWith('/requests/42');
  });
});
