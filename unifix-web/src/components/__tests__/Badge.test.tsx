import { render, screen } from '@testing-library/react';
import { PriorityBadge, StatusBadge } from '../Badge';

describe('StatusBadge', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['ASSIGNED', 'Assigned'],
    ['IN_PROGRESS', 'In Progress'],
    ['RESOLVED', 'Resolved'],
    ['REJECTED', 'Rejected'],
  ] as const)('renders the %s status as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it.each([
    ['LOW', 'Low Priority'],
    ['MEDIUM', 'Medium Priority'],
    ['HIGH', 'High Priority'],
  ] as const)('renders the %s priority as "%s"', (priority, label) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
