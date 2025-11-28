import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-sm prose-pink max-w-none break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="rounded-lg overflow-hidden my-2 bg-gray-800 text-gray-100 shadow-sm">
                <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 flex justify-between">
                  <span>{match[1]}</span>
                </div>
                <pre className="p-3 overflow-x-auto text-sm">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-sm font-medium" {...props}>
                {children}
              </code>
            );
          },
          p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">{children}</a>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;