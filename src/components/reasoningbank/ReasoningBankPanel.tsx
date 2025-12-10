'use client';

import { useState, useEffect } from 'react';
import { useReasoningBank } from '@/lib/reasoningbank/hooks';
import { PatternSuggestion } from './PatternSuggestion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Search, TrendingUp, Target, Bell, BarChart3 } from 'lucide-react';

export function ReasoningBankPanel() {
  const {
    patterns,
    loading,
    stats,
    queryPatterns,
    getAutomotivePatterns,
    getKioskPatterns,
    getNotificationPatterns,
    loadStats
  } = useReasoningBank();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const handleSearch = () => {
    queryPatterns(searchQuery, selectedDomain || undefined);
  };

  useEffect(() => {
    // Load initial automotive patterns
    getAutomotivePatterns();
  }, []);

  if (loading && patterns.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Pattern Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalPatterns}</div>
                <div className="text-sm text-gray-500">Total Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(stats.averageConfidence * 100)}%
                </div>
                <div className="text-sm text-gray-500">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.domainCounts.length}</div>
                <div className="text-sm text-gray-500">Domains</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.domainCounts.slice(0, 5).map(d => (
                <Badge
                  key={d.domain}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSelectedDomain(d.domain)}
                >
                  {d.domain} ({d.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          {selectedDomain && (
            <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              <span className="text-sm">Domain: </span>
              <Badge>{selectedDomain}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => setSelectedDomain(null)}
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pattern Categories */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" onClick={() => queryPatterns(searchQuery)}>
            All Patterns
          </TabsTrigger>
          <TabsTrigger value="automotive" onClick={() => getAutomotivePatterns()}>
            <Target className="w-4 h-4 mr-2" />
            Automotive
          </TabsTrigger>
          <TabsTrigger value="kiosk" onClick={() => getKioskPatterns()}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Kiosk
          </TabsTrigger>
          <TabsTrigger value="notifications" onClick={() => getNotificationPatterns()}>
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <PatternList patterns={patterns} loading={loading} />
        </TabsContent>
        <TabsContent value="automotive" className="mt-6">
          <PatternList patterns={patterns} loading={loading} />
        </TabsContent>
        <TabsContent value="kiosk" className="mt-6">
          <PatternList patterns={patterns} loading={loading} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <PatternList patterns={patterns} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PatternList({ patterns, loading }: { patterns: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No patterns found. Try adjusting your search or filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {patterns.map(pattern => (
        <PatternSuggestion
          key={pattern.id}
          pattern={pattern}
          onApply={(pattern) => {
            console.log('Apply pattern:', pattern);
            // TODO: Implement pattern application logic
          }}
        />
      ))}
    </div>
  );
}