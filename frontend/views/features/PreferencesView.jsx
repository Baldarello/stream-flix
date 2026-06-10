/**
 * @fileoverview Preferences View - User Settings Screen
 *
 * Displays user preferences including language selection.
 * Uses MobX observer to reactively update when preferences change.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { useStores } from '../../context/StoreContext.jsx';
import { useTranslations } from '../../hooks/useTranslations.js';

/**
 * PreferencesView Component
 *
 * Renders the user preferences screen with language selector.
 *
 * @returns {React.ReactElement} Preferences view
 */
export const PreferencesView = observer(() => {
    const { preferencesStore } = useStores();
    const { t } = useTranslations();

    return (
        <Box
            id="screen-preferences"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pt: 'calc(64px + env(safe-area-inset-top))',
                minHeight: '100vh',
                p: 3,
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom>
                {t('preferences.title')}
            </Typography>
            <FormControl sx={{ mt: 2, minWidth: 200 }}>
                <Select
                    value={preferencesStore.language}
                    onChange={(e) => preferencesStore.setLanguage(e.target.value)}
                    aria-label={t('preferences.language')}
                >
                    <MenuItem value="it">Italiano</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
});

PreferencesView.displayName = 'PreferencesView';
