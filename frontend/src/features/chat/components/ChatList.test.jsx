/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ChatList from './ChatList';

describe('ChatList', () => {
  afterEach(cleanup);
  const mockOnSelect = vi.fn();

  it('renders conversations correctly', () => {
    const conversations = [
      { id: '1', client: { name: 'Client 1' }, status: 'ACTIVE', lastMessageAt: new Date().toISOString() },
      { id: '2', client: { phoneNumber: '1234567890' }, status: 'PENDING_ASSIGNMENT', lastMessageAt: new Date().toISOString() },
    ];

    render(<ChatList conversations={conversations} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Client 1')).toBeDefined();
    expect(screen.getByText('1234567890')).toBeDefined();
    expect(screen.queryByText('Escalado')).toBeNull();
  });

  it('renders the alert badge when conversation status is ESCALATED', () => {
    const conversations = [
      { id: '1', client: { name: 'Escalated Client' }, status: 'ESCALATED', lastMessageAt: new Date().toISOString() },
    ];

    render(<ChatList conversations={conversations} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Escalated Client')).toBeDefined();
    const badge = screen.getByText('Escalado');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('aria-label')).toBe('Chat escalado');
  });

  it('calls onSelect when a conversation is clicked', () => {
    const conversations = [
      { id: '1', client: { name: 'Client 1' }, status: 'ACTIVE', lastMessageAt: new Date().toISOString() },
    ];

    render(<ChatList conversations={conversations} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByText('Client 1').closest('div'));
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });
});
