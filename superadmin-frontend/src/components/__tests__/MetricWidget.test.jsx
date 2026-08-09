import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetricWidget from '../MetricWidget';
import { Users } from 'lucide-react';

const jest = vi;

describe('MetricWidget', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly with data', () => {
    render(
      <MetricWidget 
        title="Total Users" 
        value={1234} 
        isLoading={false} 
        icon={Users} 
      />
    );

    const widget = screen.getByTestId('metric-widget-Total Users');
    expect(widget).toBeInTheDocument();
    
    // Check if title is rendered
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    
    // Check if value is rendered with toLocaleString
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders zero value properly without breaking or showing empty', () => {
    render(
      <MetricWidget 
        title="Zero Value" 
        value={0} 
        isLoading={false} 
        icon={Users} 
      />
    );

    const widget = screen.getByTestId('metric-widget-Zero Value');
    expect(widget).toBeInTheDocument();
    
    // Check if 0 is rendered correctly
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(
      <MetricWidget 
        title="Loading Metric" 
        value={undefined} 
        isLoading={true} 
        icon={Users} 
      />
    );

    // It should render skeleton inside the list item wrapper
    const widget = screen.getByTestId('metric-widget-Loading Metric');
    expect(widget).toBeInTheDocument();
    
    // Should have pulse animation class (skeleton)
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });
});
