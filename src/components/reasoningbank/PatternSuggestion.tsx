'use client';

import { Pattern } from '@/lib/reasoningbank/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Lightbulb, TrendingUp, Target } from 'lucide-react';
import { useState } from 'react';

interface PatternSuggestionProps {
  pattern: Pattern;
  onApply?: (pattern: Pattern) => void;
  showActions?: boolean;
}

export function PatternSuggestion({ pattern, onApply, showActions = true }: PatternSuggestionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Pattern: ${pattern.description}\n\nContext: ${pattern.context}\n\nTags: ${pattern.tags}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.8) return 'bg-blue-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-600';
    if (rate >= 0.8) return 'text-blue-600';
    if (rate >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getIcon = (domain: string) => {
    switch (domain) {
      case 'automotive':
      case 'automotive-kiosk':
        return <Target className="w-4 h-4" />;
      case 'feedback-optimization':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {getIcon(pattern.domain)}
            <CardTitle className="text-sm font-medium">{pattern.description}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pattern.domain.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {pattern.context}
        </p>

        <div className="flex items-center gap-4 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="font-medium">Confidence:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getConfidenceColor(pattern.confidence)}`} />
              <span className={getSuccessRateColor(pattern.confidence)}>
                {Math.round(pattern.confidence * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Success:</span>
            <span className={getSuccessRateColor(pattern.success_rate)}>
              {Math.round(pattern.success_rate * 100)}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {pattern.tags.split(',').map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag.trim()}
            </Badge>
          ))}
        </div>

        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              Copy
            </Button>
            {onApply && (
              <Button
                size="sm"
                onClick={() => onApply(pattern)}
                className="text-xs"
              >
                Apply
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PatternSuggestionsListProps {
  patterns: Pattern[];
  onApplyPattern?: (pattern: Pattern) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export function PatternSuggestionsList({
  patterns,
  onApplyPattern,
  showActions = true,
  emptyMessage = 'No patterns found'
}: PatternSuggestionsListProps) {
  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {patterns.map((pattern) => (
        <PatternSuggestion
          key={pattern.id}
          pattern={pattern}
          onApply={onApplyPattern}
          showActions={showActions}
        />
      ))}
    </div>
  );
}