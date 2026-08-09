import { Skeleton } from '@/components/ui/Skeleton';

const MetricWidget = ({ title, value, isLoading, icon: Icon }) => {
  if (isLoading) {
    return (
      <li 
        data-testid={`metric-widget-${title}`} 
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center justify-between"
      >
        <div>
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </li>
    );
  }

  return (
    <li 
      data-testid={`metric-widget-${title}`}
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center justify-between"
    >
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">
          {(value ?? 0).toLocaleString()}
        </p>
      </div>
      {Icon && (
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </li>
  );
};

export default MetricWidget;
