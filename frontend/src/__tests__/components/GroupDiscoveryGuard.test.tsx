import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GroupDiscoveryPage from '../../app/parents/discover/page';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

function setupAuthStore(user: any) {
  useAuthStore.setState({
    user,
    isLoading: false,
  } as any);
}

describe('GroupDiscoveryPage registration guard', () => {
  it('redirects to /register/complete when registration not completed', async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    setupAuthStore({
      role: 'parent',
      registrationCompleted: false,
    });

    render(<GroupDiscoveryPage />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/register/complete');
    });
  });

  it('allows access when registrationCompleted is true', async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    setupAuthStore({ role: 'parent', registrationCompleted: true });

    render(<GroupDiscoveryPage />);
    await waitFor(() => {
      expect(push).not.toHaveBeenCalled();
    });
  });
});
