import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {uiStore} from '../../store/uiStore.js';
import {FormControl, InputLabel, MenuItem, Select, Stack, Tab, Tabs} from '@mui/material';
import ManageLinksView from '../library/ManageLinksView.jsx';
import AddLinkTabs from '../library/AddLinkTabs.jsx';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from './ModalShell.jsx';
import {holoFieldSx} from "../../styles/style.js"



// ponytail: observer wraps the component — reads uiStore.linkEpisodesTab reactively.
const LinkEpisodesModal = observer(() => {
    const snapTab = uiStore.linkEpisodesTab;
    const isModalOpen = mediaStore.isLinkEpisodesModalOpen;

    const { setEpisodeLinksForSeason } = mediaStore;

    const {t} = useTranslations();

    const initializedForId = useRef(null);
    const userManuallySwitchedToManage = useRef(false);

    // ponytail: initialize season + tab when modal opens; isModalOpen in deps
    // ensures re-init even when same item re-opens the modal.
    const item = mediaStore.linkingEpisodesForItem;
    useEffect(() => {
        if (!isModalOpen) return;
        if (!item?.id) return;
        if (Number(initializedForId.current) !== Number(item.id)) {
            initializedForId.current = Number(item.id);
            userManuallySwitchedToManage.current = false;
            if (item?.seasons?.[0]) {
                mediaStore.setLinkEpisodesSeason(item.seasons[0].season_number);
            } else {
                mediaStore.setLinkEpisodesSeason('');
            }
            uiStore.setLinkEpisodesTab('add');
        } else if (userManuallySwitchedToManage.current) {
            userManuallySwitchedToManage.current = false;
        }
    }, [isModalOpen, mediaStore.linkingEpisodesForItem?.id]);

    // ponytail: linkEpisodesSeason may be empty on first render (useEffect hasn't run yet).
    // Fall back to item.seasons[0] so AddLinkTabs renders on the first mount.
    const currentSeason = item?.seasons?.find(s => s.season_number === mediaStore.linkEpisodesSeason)
        || (!mediaStore.linkEpisodesSeason && item?.seasons?.[0]);


    const handleSeasonChange = (eventOrValue) => {
        const rawValue = eventOrValue?.target?.value ?? eventOrValue;
        mediaStore.setLinkEpisodesSeason(rawValue);
        mediaStore.setExpandedLinkAccordionId(false);
    };

    if (!item) return null;

    return (
        <ModalShell
            id="link-episodes-modal"
            data-component="link-episodes-modal"
            open={isModalOpen}
            onClose={() => mediaStore.closeLinkEpisodesModal()}
            title={t('linkEpisodesModal.title', {name: item.name})}
            maxWidth="md"
        >
            <Stack spacing={2} sx={{pt: 1, display: 'flex', flexDirection: 'column'}}>
                <FormControl fullWidth required sx={holoFieldSx}>
                    <InputLabel>{t('linkEpisodesModal.selectSeason')}</InputLabel>
                    <Select
                        value={mediaStore.linkEpisodesSeason}
                        label={t('linkEpisodesModal.selectSeason')}
                        onChange={handleSeasonChange}
                    >
                        {item.seasons?.map(season => <MenuItem key={season.id}
                                                               value={season.season_number}>{season.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <Tabs
                    value={snapTab}
                    onChange={(_, val) => {
                        if (val === 'manage') userManuallySwitchedToManage.current = true;
                        uiStore.setLinkEpisodesTab(val);
                    }}
                    sx={{
                        borderBottom: '1px solid rgba(76, 210, 255, 0.25)',
                        '& .MuiTab-root': {
                            color: 'var(--text-secondary)',
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            textTransform: 'none'
                        },
                        '& .Mui-selected': {color: 'var(--neon-accent)'},
                        '& .MuiTabs-indicator': {backgroundColor: 'var(--neon-accent)'}
                    }}
                >
                    <Tab
                        label={t('linkEpisodesModal.addLinks')}
                        value="add"
                        id="link-episodes-tab-add"
                    />
                    <Tab
                        label={t('linkEpisodesModal.manageLinks')}
                        value="manage"
                        id="link-episodes-tab-manage"
                    />
                </Tabs>

                {snapTab === 'add' && currentSeason && <AddLinkTabs selectedSeason={currentSeason.season_number}
                                                                            seasonEpisodeCount={currentSeason.episode_count}
                                                                            seasonName={currentSeason.name}
                                                                            onSave={setEpisodeLinksForSeason}
                                                                            onSuccess={() => { userManuallySwitchedToManage.current = true; uiStore.setLinkEpisodesTab('manage'); }}/>}
                {snapTab === 'manage' && currentSeason && (
                    <ManageLinksView
                        currentSeason={currentSeason}
                        item={item}
                        expandedAccordion={mediaStore.expandedLinkAccordionId}
                    />
                )}
            </Stack>
        </ModalShell>
    );
});
LinkEpisodesModal.displayName = 'LinkEpisodesModal';

export default LinkEpisodesModal;