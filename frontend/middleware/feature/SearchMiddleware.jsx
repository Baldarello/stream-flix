/**
 * @fileoverview Feature Middleware - Search View Handler
 * 
 * This middleware handles the search functionality,
 * displaying search results or search prompt.
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslations } from '../../hooks/useTranslations.js';
import GridView from '../../components/layout/GridView.jsx';
import { MainLayout } from '../../features/shared/MainLayout.jsx';

/**
 * Search Middleware
 * 
 * Checks if search is active and displays the search view.
 * Returns search results, loading spinner, or search prompt.
 * Wraps content in MainLayout which includes Header, Footer, DetailView, and modals.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.mediaStore - Media store with search state
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} Search view or null to continue chain
 */
export const SearchMiddleware = ({ stores, children }) => {
    const { t } = useTranslations();
    const { isSearchActive, isSearching, searchQuery, searchResults } = stores.mediaStore;

    if (!isSearchActive) {
        return children;
    }

    // Show loading spinner when searching
    if (isSearching && searchQuery) {
        return (
            <MainLayout>
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
            </MainLayout>
        );
    }

    // Show search prompt when no query
    if (!searchQuery) {
        return (
            <MainLayout>
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
            </MainLayout>
        );
    }

    // Show search results
    return (
        <MainLayout>
            <GridView 
                id="search-results"
                title={t('gridView.searchResultsFor', { query: searchQuery })} 
                items={searchResults} 
            />
        </MainLayout>
    );
};
