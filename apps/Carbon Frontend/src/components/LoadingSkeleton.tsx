import React from 'react';

interface LoadingSkeletonProps {
  message?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ message = "Analyzing Codebase..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-transparent border-t-[#10B981] border-r-[#10B981] rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-4 border-transparent border-b-[#3b82f6] border-l-[#3b82f6] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          <span className="animate-pulse">🛡️</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-[#e6edf3] mb-2">{message}</h3>
      <p className="text-[#8b949e] animate-pulse">This might take a few moments</p>
      
      <div className="mt-12 w-full max-w-2xl space-y-4">
        <div className="h-4 bg-[#161b22] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#10B981] via-[#3b82f6] to-[#10B981] animate-[slide_2s_linear_infinite]" style={{ width: '200%', backgroundSize: '50% 100%' }}></div>
        </div>
        <div className="flex justify-between text-xs text-[#8b949e]">
          <span>Parsing AST</span>
          <span>Generating Graph</span>
          <span>Scanning Secrets</span>
        </div>
      </div>
      
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-50%) }
          100% { transform: translateX(0%) }
        }
      `}</style>
    </div>
  );
};
