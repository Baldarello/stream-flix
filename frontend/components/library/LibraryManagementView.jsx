/**
 * @fileoverview LibraryManagementView - thin orchestrator for the
 * library screen. It mounts the sticky `LibraryDashboard` (which now
 * embeds the tab strip) and the active tab content. All heavy UI lives
 * in `tabs/*`; both modals are siblings rendered last so their z-index
 * sits above the rest.
 *
 * Public contract is preserved: the screen still responds to
 * `currentActiveView === 'Libreria'` and still uses
 * `mediaStore.activeLibraryTab` to keep state across mounts.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box} from '@mui/material';

import {mediaStore} from '../../store/mediaStore.js';

import {LibraryDashboard} from './shared/LibraryDashboard.jsx';
import {MyListTab} from './tabs/MyListTab.jsx';
import {ContinueWatchingTab} from './tabs/ContinueWatchingTab.jsx';
import {VideoLinksTab} from './tabs/VideoLinksTab.jsx';
import {PreferredSourcesTab} from './tabs/PreferredSourcesTab.jsx';
import {LinkEditModal} from './LinkEditModal.jsx';
import {PreferredSourceEditModal} from './PreferredSourceEditModal.jsx';

const LibraryManagementView = observer(() => {
    const activeTab = mediaStore.activeLibraryTab;

    return (
        <Box sx={{p: {xs: 2, md: 3}, maxWidth: 1400, mx: 'auto'}}>
            <LibraryDashboard id="library-dashboard"/>

            <Box role="tabpanel" id={`library-tabpanel-${activeTab}`}>
                {activeTab === 0 && <MyListTab/>}
                {activeTab === 1 && <ContinueWatchingTab/>}
                {activeTab === 2 && <VideoLinksTab/>}
                {activeTab === 3 && <PreferredSourcesTab/>}
            </Box>

            <LinkEditModal/>
            <PreferredSourceEditModal/>
        </Box>
    );
});

export default LibraryManagementView;
