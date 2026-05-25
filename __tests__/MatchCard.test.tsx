import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchCard } from '@/components/matching/MatchCard';

describe('MatchCard Component', () => {
  const mockMatch = {
    user: {
      name: 'Rahul',
      age: 28,
      travelStyle: 'adventure'
    },
    compatibility: {
      overallScore: 85,
      conflictRisk: 0.15,
      trustScore: 92
    }
  };

  it('renders the user information correctly', () => {
    render(<MatchCard match={mockMatch} onConnect={() => {}} />);
    
    expect(screen.getByText('Rahul, 28')).toBeInTheDocument();
    expect(screen.getByText('adventure')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('92/100')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('calls onConnect when the chat button is clicked', () => {
    const mockOnConnect = jest.fn();
    render(<MatchCard match={mockMatch} onConnect={mockOnConnect} />);
    
    const button = screen.getByText('Start Anonymous Chat');
    fireEvent.click(button);
    
    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });
});
