import React from 'react';

export const SkeletonGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs animate-pulse flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-gray-200 rounded-md w-2/3" />
                <div className="h-3.5 bg-gray-100 rounded-md w-1/3" />
              </div>
              <div className="h-5 bg-gray-100 rounded-md w-14" />
            </div>

            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-purple-100/50 rounded-full w-24" />
              <div className="h-6 bg-blue-100/50 rounded-full w-20" />
            </div>

            <div className="h-9 bg-emerald-50 rounded-xl mb-4" />

            <div className="space-y-2 mb-6">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
              <div className="h-3 bg-gray-100 rounded w-4/6" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex gap-2">
            <div className="h-9 bg-blue-200/60 rounded-xl flex-1" />
            <div className="h-9 bg-gray-100 rounded-xl w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};
