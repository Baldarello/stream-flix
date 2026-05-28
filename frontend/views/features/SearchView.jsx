/**
 * @fileoverview Search View - Search Interface
 * 
 * Displays the search interface when mediaStore.isSearchActive is true.
 * Shows search prompt, loading state, or search results.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useStores } from '../../context/StoreContext.jsx';
import { useTranslations } from '../../hooks/useTranslations.js';
import GridView from '../../components/layout/GridView.jsx';

/**
 * SearchView Component
 * 
 * Displays search interface with three states:
 * 1. Loading state when searching with query
 * 2. Prompt state when no search query
 * 3. Results state showing matching items
 * 
 * @returns {React.ReactElement} Search view component
 */
export const SearchView = observer(() => {
    const { mediaStore } = useStores();
    const { t } = useTranslations();
    const { isSearching, searchQuery, searchResults } = mediaStore;

    // Loading state
    if (isSearching && searchQuery) {
        return (
            <Box
                id="search-loading"
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 'calc(100vh - 64px - 200px)',
                    pt: 'env(safe-area-inset-top)'
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // Prompt state - no search query
    if (!searchQuery) {
        return (
            <Box
                id="search-prompt"
                sx={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'calc(100vh - 64px - 200px)',
                    pt: 'env(safe-area-inset-top)'
                }}
            >
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                    {t('misc.searchPrompt.title')}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    {t('misc.searchPrompt.subtitle')}
                </Typography>
            </Box>
        );
    }

    // Results state
    return (
        <Box
            id="search-results"
            sx={{
                pt: 'calc(64px + env(safe-area-inset-top))'
            }}
        >
            <GridView 
                id="search-results-grid"
                title={t('gridView.searchResultsFor', { query: searchQuery })} 
                items={searchResults} 
            />
        </Box>
    );
});

SearchView.displayName = 'SearchView';
