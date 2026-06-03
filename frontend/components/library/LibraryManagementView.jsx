/**
 * @fileoverview LibraryManagementView - thin orchestrator for the
 * library screen. It mounts the sticky `LibraryDashboard`, the
 * four-tab strip and the active tab content. All heavy UI lives in
 * `tabs/*`; the modal is a sibling rendered last so its z-index sits
 * above the rest.
 *
 * Public contract is preserved: the screen still responds to
 * `currentActiveView === 'Libreria'` and still uses
 * `mediaStore.activeLibraryTab` to keep state across mounts.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box, Paper, Tab, Tabs} from '@mui/material';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import StarIcon from '@mui/icons-material/Star';

import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';

import {LibraryDashboard} from './shared/LibraryDashboard.jsx';
import {MyListTab} from './tabs/MyListTab.jsx';
import {ContinueWatchingTab} from './tabs/ContinueWatchingTab.jsx';
import {VideoLinksTab} from './tabs/VideoLinksTab.jsx';
import {PreferredSourcesTab} from './tabs/PreferredSourcesTab.jsx';
import {LinkEditModal} from './LinkEditModal.jsx';

const TABS = [
    {key: 'myList', icon: <VideoLibraryIcon/>},
    {key: 'continueWatching', icon: <AccessTimeIcon/>},
    {key: 'links', icon: <LinkIcon/>},
    {key: 'preferredSources', icon: <StarIcon/>},
];

const LibraryManagementView = observer(() => {
    const {t} = useTranslations();
    const activeTab = mediaStore.activeLibraryTab;
    const setActiveTab = (idx) => mediaStore.setActiveLibraryTab(idx);

    return (
        <Box sx={{p: {xs: 2, md: 3}, maxWidth: 1400, mx: 'auto'}}>
            <LibraryDashboard id="library-dashboard"/>

            <Paper
                id="library-tabs"
                data-component="library-tabs"
                sx={{
                    mb: 3,
                    bgcolor: 'background.paper',
                    backgroundImage: 'var(--holo-grad)',
                    border: '1px solid rgba(76, 210, 255, 0.18)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label={t('libraryManagement.title')}
                    sx={{
                        '& .MuiTab-root': {
                            minWidth: 120,
                            color: 'var(--text-secondary)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            fontSize: '0.78rem',
                        },
                        '& .Mui-selected': {color: 'var(--neon-accent)'},
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'var(--neon-accent)',
                            boxShadow: '0 0 10px rgba(76, 210, 255, 0.6)',
                        },
                    }}
                >
                    {TABS.map((tab) => (
                        <Tab
                            key={tab.key}
                            id={`library-tab-${tab.key}`}
                            icon={tab.icon}
                            iconPosition="start"
                            label={t(`libraryManagement.tabs.${tab.key}`)}
                        />
                    ))}
                </Tabs>
            </Paper>

            <Box role="tabpanel" id={`library-tabpanel-${activeTab}`}>
                {activeTab === 0 && <MyListTab/>}
                {activeTab === 1 && <ContinueWatchingTab/>}
                {activeTab === 2 && <VideoLinksTab/>}
                {activeTab === 3 && <PreferredSourcesTab/>}
            </Box>

            <LinkEditModal/>
        </Box>
    );
});

export default LibraryManagementView;
