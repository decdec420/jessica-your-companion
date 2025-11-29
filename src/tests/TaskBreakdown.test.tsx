import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TaskBreakdown from '../src/components/executive/TaskBreakdown';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { response: 'Mocked response' }, error: null })
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('TaskBreakdown Component', () => {
  const mockProps = {
    originalTask: 'Test task',
    onTasksGenerated: vi.fn(),
    context: 'Test context',
    difficulty: 'easy_first' as const
  };

  it('should render without crashing', () => {
    render(<TaskBreakdown {...mockProps} />);
    expect(screen.getByText('Task Breakdown Assistant')).toBeInTheDocument();
  });

  it('should display the original task', () => {
    render(<TaskBreakdown {...mockProps} />);
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('should show breakdown button when no tasks exist', () => {
    render(<TaskBreakdown {...mockProps} />);
    expect(screen.getByText('Break this down for me!')).toBeInTheDocument();
  });
});
