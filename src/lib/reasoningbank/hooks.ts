import { useState, useEffect, useCallback } from 'react';
import { getReasoningBank, Pattern } from './client';

/**
 * Hook for querying reasoning bank patterns
 */
export function useReasoningBank() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const rb = getReasoningBank();

  const queryPatterns = useCallback(async (
    query: string,
    domain?: string,
    minConfidence: number = 0.7
  ) => {
    setLoading(true);
    try {
      const results = rb.queryPatterns(query, { domain, minConfidence });
      setPatterns(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, [rb]);

  const getAutomotivePatterns = useCallback((query: string = '') => {
    setLoading(true);
    try {
      const results = rb.getAutomotivePatterns(query);
      setPatterns(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, [rb]);

  const getKioskPatterns = useCallback(() => {
    setLoading(true);
    try {
      const results = rb.getKioskPatterns();
      setPatterns(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, [rb]);

  const getNotificationPatterns = useCallback(() => {
    setLoading(true);
    try {
      const results = rb.getNotificationPatterns();
      setPatterns(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, [rb]);

  const getSuggestions = useCallback((context: string, domain?: string) => {
    try {
      return rb.getSuggestions(context, domain);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }, [rb]);

  const loadStats = useCallback(() => {
    try {
      const stats = rb.getStats();
      setStats(stats);
      return stats;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [rb]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    patterns,
    loading,
    stats,
    queryPatterns,
    getAutomotivePatterns,
    getKioskPatterns,
    getNotificationPatterns,
    getSuggestions,
    loadStats
  };
}

/**
 * Hook for real-time pattern suggestions in forms
 */
export function usePatternSuggestions(domain: string) {
  const [suggestions, setSuggestions] = useState<Pattern[]>([]);
  const [contextSuggestions, setContextSuggestions] = useState<Pattern[]>([]);

  const rb = getReasoningBank();

  const updateContext = useCallback((context: string) => {
    if (context.length > 10) {
      const matches = rb.getSuggestions(context, domain);
      setContextSuggestions(matches);
    } else {
      setContextSuggestions([]);
    }
  }, [rb, domain]);

  return {
    suggestions,
    contextSuggestions,
    updateContext
  };
}