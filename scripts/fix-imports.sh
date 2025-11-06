#!/bin/bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Fix UI component imports
find src -name "*.tsx" -type f -exec sed -i \
  -e "s|from '@/components/ui/input'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/card'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/label'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/select'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/badge'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/table'|from '@/components/ui'|g" \
  -e "s|from '@/components/ui/checkbox'|from '@/components/ui'|g" \
  {} \;

echo "Fixed all imports"
