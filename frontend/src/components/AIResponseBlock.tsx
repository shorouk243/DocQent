import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface AIResponseBlockProps {
  response: string;
  isLoading?: boolean;
  onDismiss?: () => void;
  onInsert?: () => void;
}

export const AIResponseBlock: React.FC<AIResponseBlockProps> = ({
  response,
  isLoading = false,
  onDismiss,
  onInsert,
}) => {
  const [copied, setCopied] = useState(false);

  const renderMarkdownLite = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={`spacer-${index}`} className="h-2" />;
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h4 key={index} className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {trimmed.slice(5)}
          </h4>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-3">
            {trimmed.slice(4)}
          </h3>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={index} className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">
            {trimmed.slice(3)}
          </h2>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={index} className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-4">
            {trimmed.slice(2)}
          </h1>
        );
      }
      return (
        <p
          key={index}
          className="text-gray-700 dark:text-gray-300 leading-relaxed"
        >
          {line}
        </p>
      );
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="my-4"
    >
      <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-400">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Response
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Copy response"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Response content with streaming support */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {renderMarkdownLite(response)}
              {isLoading && (
                <span className="inline-block w-2 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse" />
              )}
            </div>
          </div>

          {/* Actions */}
          {!isLoading && onInsert && response && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={onInsert}>
                Insert into document
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
