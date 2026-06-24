/**
 * @fileoverview LibraryDashboard - sticky header for the library screen.
 *
 * Renders the cinematic display title, the global search input that
 * drives the cross-tab filter, and four `HoloChip` counters bound to
 * `mediaStore.libraryCounts`.
 *
 * The component is fully `observer`-driven: it does not hold any
 * `useState` of its own. The controlled `TextField` mirrors the local
 * `librarySearchQuery` on the store through the debounced setter so
 * the user sees the keystroke immediately while the debounce keeps
 * the heavy re-render at 200ms.
 */

import React, {useEffect, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {Box, InputAdornment, Stack, Tab, Tabs, TextField, Typography} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {mediaStore} from '../../../store/mediaStore.js';
import {useTranslations} from '../../../hooks/useTranslations.js';
import {HoloChip} from '../../feedback/HoloChip.jsx';

const CounterChip = observer(({id, label, value, accent = 'var(--neon-accent)'}) => (
    <HoloChip
        id={id}
        sx={{
            gap: 1,
            px: 1.5,
            '& .counter-value': {
                color: accent,
                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                fontWeight: 700,
            },
        }}
        label={
            <Box component="span" sx={{display: 'inline-flex', alignItems: 'center', gap: 0.75}}>
                <span>{label}</span>
                <span className="counter-value">{value}</span>
            </Box>
        }
    />
));

/**
 * LibraryDashboard Component
 *
 * @param {Object} props
 * @param {string} [props.id] - DOM id prefix.
 * @returns {React.ReactElement}
 */
export const LibraryDashboard = observer(({id = 'library-dashboard'}) => {
    const {t} = useTranslations();
    const counts = mediaStore.libraryCounts;
    const storeQuery = mediaStore.librarySearchQuery;
    const [inputValue, setInputValue] = useState(() => storeQuery);

    // Keep the local input in sync when the store value changes from
    // outside (e.g. test or programmatic reset).
    useEffect(() => {
        setInputValue(storeQuery);
    }, [storeQuery]);

    const handleChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        mediaStore.setLibrarySearchQuery(value);
    };

    return (
        <Box
            id={id}
            data-component="library-dashboard"
            className="holo-surface"
            sx={{
                position: 'sticky',
                top: {xs: 64, md: 72},
                zIndex: 5,
                py: {xs: 2, md: 2.5},
                px: {xs: 2, md: 3},
                borderRadius: '14px',
                mb: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            <Box sx={{
                display: 'flex',
                flexDirection: {xs: 'column', sm: 'row'},
                gap: 2,
                alignItems: {sm: 'center'},
                justifyContent: 'space-between'
            }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: 'var(--text-primary)',
                        textShadow: '0 0 16px rgba(76, 210, 255, 0.25)',
                        fontSize: {xs: '1.5rem', md: '2rem'},
                    }}
                >
                    {t('libraryManagement.title')}
                </Typography>
                <TextField
                    id={`${id}-search`}
                    value={inputValue}
                    onChange={handleChange}
                    placeholder={t('libraryManagement.dashboard.searchPlaceholder')}
                    inputProps={{
                        'aria-label': t('libraryManagement.dashboard.searchAriaLabel'),
                    }}
                    size="small"
                    sx={{
                        minWidth: {xs: '100%', sm: 320},
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(76, 210, 255, 0.35)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--neon-accent-hot)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--neon-accent)',
                            boxShadow: 'var(--edge-glow)',
                        },
                        '& .MuiInputBase-input': {
                            color: 'var(--text-primary)',
                            fontFamily: "'Inter', sans-serif",
                        },
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{color: 'var(--neon-accent)'}}/>
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <Stack
                direction="row"
                spacing={1}
                sx={{
                    flexWrap: 'wrap',
                    rowGap: 1,
                    '& > *': {mr: 0.5},
                }}
            >
                <CounterChip
                    id={`${id}-counter-my-list`}
                    label={t('libraryManagement.dashboard.counters.myList')}
                    value={counts.myList}
                />
                <CounterChip
                    id={`${id}-counter-continue`}
                    label={t('libraryManagement.dashboard.counters.continueWatching')}
                    value={counts.continueWatching}
                />
                <CounterChip
                    id={`${id}-counter-links`}
                    label={t('libraryManagement.dashboard.counters.links')}
                    value={counts.links}
                />
                <CounterChip
                    id={`${id}-counter-invalid`}
                    label={t('libraryManagement.dashboard.counters.invalid')}
                    value={counts.invalid}
                    accent="var(--neon-accent-hot)"
                />
            </Stack>
            <Tabs
                id={`${id}-tabs`}
                value={mediaStore.activeLibraryTab}
                onChange={(_, v) => mediaStore.setActiveLibraryTab(v)}
                variant="scrollable"
                allowScrollButtonsMobile
                aria-label={t('libraryManagement.title')}
                sx={{
                    minHeight: 42,
                    borderTop: '1px solid rgba(76, 210, 255, 0.18)',
                    pt: 1,
                    '& .MuiTab-root': {
                        color: 'var(--text-secondary)',
                        minHeight: 42,
                        textTransform: 'none',
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                    },
                    '& .Mui-selected': {color: 'var(--neon-accent)'},
                    '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--neon-accent)',
                        boxShadow: 'var(--edge-glow)',
                    },
                }}
            >
                <Tab id={`${id}-tab-my-list`} label={t('libraryManagement.tabs.myList')} value={0}/>
                <Tab
                    id={`${id}-tab-continue`}
                    label={t('libraryManagement.tabs.continueWatching')}
                    value={1}
                />
                <Tab id={`${id}-tab-links`} label={t('libraryManagement.tabs.links')} value={2}/>
                <Tab
                    id={`${id}-tab-preferred`}
                    label={t('libraryManagement.tabs.preferredSources')}
                    value={3}
                />
            </Tabs>
        </Box>
    );
});

LibraryDashboard.displayName = 'LibraryDashboard';

export default LibraryDashboard;
