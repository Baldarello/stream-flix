import React, {useEffect} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {FormControl, InputLabel, MenuItem, Select, Stack, Tab, Tabs} from '@mui/material';
import ManageLinksView from '../library/ManageLinksView.jsx';
import AddLinkTabs from '../library/AddLinkTabs.jsx';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from './ModalShell.jsx';
import {holoFieldSx} from "../../styles/style.js"


const LinkEpisodesModal = observer(() => {
    const {
        isLinkEpisodesModalOpen,
        closeLinkEpisodesModal,
        linkingEpisodesForItem: item,
        setEpisodeLinksForSeason,
        expandedLinkAccordionId,
        setExpandedLinkAccordionId,
        linkEpisodesTab,
        setLinkEpisodesTab,
        linkEpisodesSeason,
        setLinkEpisodesSeason
    } = mediaStore;
    const {t} = useTranslations();

    useEffect(() => {
        if (item?.seasons?.[0]) {
            setLinkEpisodesSeason(item.seasons[0].season_number);
        } else {
            setLinkEpisodesSeason('');
        }
        setLinkEpisodesTab('add');
    }, [item?.id, setLinkEpisodesSeason, setLinkEpisodesTab]);

    if (!item) return null;

    const currentSeason = item.seasons?.find(s => s.season_number === linkEpisodesSeason);



    const handleSeasonChange = (event) => {
        setLinkEpisodesSeason(event.target.value);
        setExpandedLinkAccordionId(false); // Reset expanded accordion when season changes
    };

    return (
        <ModalShell
            id="link-episodes-modal"
            data-component="link-episodes-modal"
            open={isLinkEpisodesModalOpen}
            onClose={closeLinkEpisodesModal}
            title={t('linkEpisodesModal.title', {name: item.name})}
            maxWidth="md"
        >
            <Stack spacing={2} sx={{pt: 1, display: 'flex', flexDirection: 'column'}}>
                <FormControl fullWidth required sx={holoFieldSx}>
                    <InputLabel>{t('linkEpisodesModal.selectSeason')}</InputLabel>
                    <Select
                        value={linkEpisodesSeason}
                        label={t('linkEpisodesModal.selectSeason')}
                        onChange={handleSeasonChange}
                    >
                        {item.seasons?.map(season => <MenuItem key={season.id}
                                                               value={season.season_number}>{season.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <Tabs
                    value={linkEpisodesTab}
                    onChange={(_, val) => setLinkEpisodesTab(val)}
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

                {linkEpisodesTab === 'add' && currentSeason && <AddLinkTabs selectedSeason={currentSeason.season_number}
                                                                            seasonEpisodeCount={currentSeason.episode_count}
                                                                            seasonName={currentSeason.name}
                                                                            onSave={setEpisodeLinksForSeason}
                                                                            onSuccess={() => setLinkEpisodesTab('manage')}/>}
                {linkEpisodesTab === 'manage' && currentSeason && (
                    <ManageLinksView
                        currentSeason={currentSeason}
                        item={item}
                        expandedAccordion={expandedLinkAccordionId}
                    />
                )}
            </Stack>
        </ModalShell>
    );
});
LinkEpisodesModal.displayName = 'LinkEpisodesModal';

export default LinkEpisodesModal;
