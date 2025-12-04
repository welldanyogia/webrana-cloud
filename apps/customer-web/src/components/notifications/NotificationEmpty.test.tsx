import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { NotificationEmpty } from './NotificationEmpty';

describe('NotificationEmpty', () => {
  it('should render default message', () => {
    render(<NotificationEmpty />);
    expect(screen.getByText('Tidak ada notifikasi')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<NotificationEmpty message="Custom empty message" />);
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<NotificationEmpty />);
    expect(
      screen.getByText('Semua notifikasi Anda akan muncul di sini')
    ).toBeInTheDocument();
  });

  it('should render bell icon', () => {
    render(<NotificationEmpty />);
    // The Bell icon is rendered inside a div container
    const container = document.querySelector('.rounded-full');
    expect(container).toBeInTheDocument();
  });

  it('should be centered', () => {
    render(<NotificationEmpty />);
    const container = document.querySelector('.flex.flex-col.items-center');
    expect(container).toBeInTheDocument();
  });
});
