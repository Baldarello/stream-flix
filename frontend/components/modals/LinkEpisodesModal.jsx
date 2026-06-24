import React, {useEffect, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {mediaStore} from '../../store/mediaStore.js';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField
} from '@mui/material';
import ManageLinksView from '../library/ManageLinksView.jsx';
import {useTranslations} from '../../hooks/useTranslations.js';
import {ModalShell} from './ModalShell.jsx';
import {previewPattern} from '../../utils/patternResolver.js';

// Visual recipe for holo-themed field controls, mirrored from
// EpisodesDrawer.jsx so the modal uses the same palette.
const holoFieldSx = {
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(76,210,255,0.35)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent-hot)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--neon-accent)',
        boxShadow: 'var(--edge-glow)',
    },
    '& .MuiInputLabel-root': {
        color: 'var(--text-secondary)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--neon-accent)',
    },
    '& .MuiInputBase-input': {
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
    },
    '& .MuiFormHelperText-root': {
        color: 'var(--text-secondary)',
    },
};

const AddLinkTabs = observer(({selectedSeason, seasonEpisodeCount, seasonName, onSave, onSuccess}) => {
    const {t} = useTranslations();
    const [addMethod, setAddMethod] = useState('pattern');
    const [pattern, setPattern] = useState('');
    const [padding, setPadding] = useState('2');
    const [label, setLabel] = useState('');
    const [linkList, setLinkList] = useState('');
    const [json, setJson] = useState('');
    const patternInputRef = useRef(null);
    const [isAdvanced, setIsAdvanced] = useState(false);
    const [startEpisode, setStartEpisode] = useState('1');
    const [endEpisode, setEndEpisode] = useState('12');
    const [startNumber, setStartNumber] = useState('1');
    const [endNumber, setEndNumber] = useState('12');
    const [isSaving, setIsSaving] = useState(false);
    const [language, setLanguage] = useState('ITA');
    const [type, setType] = useState('sub');

    useEffect(() => {
        setEndEpisode(seasonEpisodeCount.toString());
        setEndNumber(seasonEpisodeCount.toString());
    }, [seasonEpisodeCount]);

    useEffect(() => {
        setStartNumber(startEpisode);
    }, [startEpisode]);

    useEffect(() => {
        setEndNumber(endEpisode);
    }, [endEpisode]);

    const handleSave = async () => {
        setIsSaving(true);
        let data, error = null, isErrorKey = false, errorValues = {};
        switch (addMethod) {
            case 'pattern':
                if (!pattern) {
                    error = 'linkEpisodesModal.add.errors.emptyPattern';
                    isErrorKey = true;
                } else if (!pattern.includes('[@EP]')) {
                    error = 'linkEpisodesModal.add.errors.missingPlaceholder';
                    isErrorKey = true;
                } else {
                    data = {pattern, padding: parseInt(padding, 10), label};
                    if (isAdvanced) {
                        const startEp = parseInt(startEpisode, 10);
                        const endEp = parseInt(endEpisode, 10);
                        const startNum = parseInt(startNumber, 10);
                        const endNum = parseInt(endNumber, 10);
                        if (isNaN(startEp) || isNaN(endEp) || startEp < 1 || endEp < startEp) {
                            error = 'notifications.invalidEpisodeRange';
                            isErrorKey = true;
                        } else if (endEp - startEp !== endNum - startNum) {
                            error = 'notifications.episodeNumberRangeMismatch';
                            isErrorKey = true;
                            errorValues = {epRange: endEp - startEp + 1, numRange: endNum - startNum + 1};
                        } else {
                            data.start = startEp;
                            data.end = endEp;
                            data.startNum = startNum;
                            data.endNum = endNum;
                        }
                    }
                }
                break;
            case 'list':
                if (!linkList.trim()) {
                    error = 'linkEpisodesModal.add.errors.emptyList';
                    isErrorKey = true;
                } else data = {list: linkList};
                break;
            case 'json':
                if (!json.trim()) {
                    error = 'linkEpisodesModal.add.errors.emptyJson';
                    isErrorKey = true;
                } else data = {json};
                break;
        }

        if (error) {
            mediaStore.showSnackbar(error, 'error', isErrorKey, errorValues);
            setIsSaving(false);
        } else if (data) {
            const success = await onSave({
                seasonNumber: selectedSeason,
                method: addMethod,
                data,
                language,
                type,
                seasonName
            });
            if (success) {
                // Reset state for next time
                setPattern('');
                setLabel('');
                setLinkList('');
                setJson('');
                setStartEpisode('1');
                setEndEpisode(seasonEpisodeCount.toString());
                setStartNumber('1');
                setEndNumber(seasonEpisodeCount.toString());
                onSuccess();
            }
            setIsSaving(false);
        } else {
            setIsSaving(false);
        }
    };

    const handleInsertPlaceholder = (placeholder) => {
        const input = placeholder === '[@EP]' ? patternInputRef.current : null; // Can be extended for label field
        const setter = placeholder === '[@EP]' ? setPattern : setLabel;

        if (input) {
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;

            const currentValue = input.value;

            const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
            setter(newValue);

            requestAnimationFrame(() => {
                if (patternInputRef.current) {
                    const newCursorPos = start + placeholder.length;
                    patternInputRef.current.focus();
                    patternInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            });
        }
    };

    // Live preview for the pattern builder. Re-runs whenever the user
    // edits the inputs, giving them a quick visual confirmation that
    // the resulting URLs are correct.
    const patternPreview = (() => {
        if (addMethod !== 'pattern' || !pattern || !pattern.includes('[@EP]')) return [];
        const startEp = parseInt(startEpisode, 10);
        const endEp = parseInt(endEpisode, 10);
        const startNum = parseInt(startNumber, 10);
        const endNum = parseInt(endNumber, 10);
        return previewPattern({
            pattern,
            padding: parseInt(padding, 10),
            start: startEp,
            end: endEp,
            startNum,
            endNum,
        });
    })();

    const renderAddContent = () => {
        switch (addMethod) {
            case 'pattern':
                return (
                    <Stack spacing={2}>
                        <Alert
                            severity="info"
                            sx={{
                                background: 'var(--holo-grad)',
                                color: 'var(--text-primary)',
                                border: '1px solid rgba(76, 210, 255, 0.35)',
                                '& .MuiAlert-icon': {color: 'var(--neon-accent)'}
                            }}
                        >{t('linkEpisodesModal.add.patternInfo')}</Alert>
                        <TextField
                            id={"pattern-url-episode"}
                            label={t('linkEpisodesModal.add.patternUrl')}
                            required value={pattern}
                            onChange={e => setPattern(e.target.value)}
                            inputRef={patternInputRef}
                            sx={holoFieldSx}
                            InputProps={{
                                endAdornment: (
                                    <Button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleInsertPlaceholder('[@EP]')}
                                        sx={{color: 'var(--neon-accent)'}}
                                    >
                                        &#91;@EP&#93;
                                    </Button>
                                )
                            }}
                        />
                        {patternPreview.length > 0 && (
                            <Box
                                data-testid="pattern-preview"
                                sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    border: '1px dashed rgba(76, 210, 255, 0.35)',
                                    background: 'rgba(76, 210, 255, 0.04)',
                                }}
                            >
                                <Box sx={{fontSize: 12, color: 'var(--text-secondary)', mb: 0.5}}>
                                    {t('linkEpisodesModal.add.preview.title')}
                                </Box>
                                <Box
                                    component="ul"
                                    sx={{m: 0, pl: 2, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)'}}
                                >
                                    {patternPreview.map((url, idx) => (
                                        <Box component="li" key={idx} sx={{wordBreak: 'break-all'}}>{url}</Box>
                                    ))}
                                </Box>
                            </Box>
                        )}
                        <FormControlLabel
                            control={<Switch
                                checked={isAdvanced}
                                onChange={(e) => setIsAdvanced(e.target.checked)}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {color: 'var(--neon-accent)'},
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {backgroundColor: 'var(--neon-accent)'}
                                }}
                            />}
                            label={t('linkEpisodesModal.add.advancedConfig')}
                            sx={{color: 'var(--text-secondary)'}}
                        />
                        {isAdvanced && (
                            <Stack spacing={2}>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        label={t('linkEpisodesModal.add.startEpisode')}
                                        type="number"
                                        value={startEpisode}
                                        onChange={(e) => setStartEpisode(e.target.value)}
                                        inputProps={{min: 1}}
                                        fullWidth
                                        sx={holoFieldSx}
                                    />
                                    <TextField
                                        label={t('linkEpisodesModal.add.endEpisode')}
                                        type="number"
                                        value={endEpisode}
                                        onChange={(e) => setEndEpisode(e.target.value)}
                                        inputProps={{min: 1}}
                                        fullWidth
                                        sx={holoFieldSx}
                                    />
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        label={t('linkEpisodesModal.add.startNumberPlaceholder')}
                                        type="number"
                                        value={startNumber}
                                        onChange={(e) => setStartNumber(e.target.value)}
                                        inputProps={{min: 1}}
                                        fullWidth
                                        sx={holoFieldSx}
                                    />
                                    <TextField
                                        label={t('linkEpisodesModal.add.endNumberPlaceholder')}
                                        type="number"
                                        value={endNumber}
                                        onChange={(e) => setEndNumber(e.target.value)}
                                        inputProps={{min: 1}}
                                        fullWidth
                                        sx={holoFieldSx}
                                    />
                                </Stack>
                                <Autocomplete
                                    freeSolo
                                    options={mediaStore.allUniqueLabels}
                                    value={label}
                                    onInputChange={(event, newInputValue) => {
                                        setLabel(newInputValue);
                                    }}
                                    sx={holoFieldSx}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={t('linkEpisodesModal.add.linkLabel')}
                                            helperText={t('linkEpisodesModal.add.linkLabelHelper')}
                                        />
                                    )}
                                />
                                <TextField
                                    label={t('linkEpisodesModal.add.padding')}
                                    required
                                    type="number"
                                    value={padding}
                                    onChange={e => setPadding(e.target.value)}
                                    helperText={t('linkEpisodesModal.add.paddingHelper')}
                                    sx={holoFieldSx}
                                />
                            </Stack>
                        )}
                    </Stack>
                );
            case 'list':
                return (
                    <Stack spacing={2}>
                        <Alert
                            severity="info"
                            sx={{
                                background: 'var(--holo-grad)',
                                color: 'var(--text-primary)',
                                border: '1px solid rgba(76, 210, 255, 0.35)',
                                '& .MuiAlert-icon': {color: 'var(--neon-accent)'}
                            }}
                        >{t('linkEpisodesModal.add.listInfo', {count: seasonEpisodeCount})}</Alert>
                        <TextField
                            label={t('linkEpisodesModal.add.listLinks')}
                            multiline
                            rows={8}
                            value={linkList}
                            onChange={e => setLinkList(e.target.value)}
                            sx={holoFieldSx}
                        />
                    </Stack>
                );
            case 'json':
                return (
                    <Stack spacing={2}>
                        <Alert
                            severity="info"
                            sx={{
                                background: 'var(--holo-grad)',
                                color: 'var(--text-primary)',
                                border: '1px solid rgba(76, 210, 255, 0.35)',
                                '& .MuiAlert-icon': {color: 'var(--neon-accent)'}
                            }}
                        >{t('linkEpisodesModal.add.jsonInfo')}</Alert>
                        <TextField
                            label={t('linkEpisodesModal.add.jsonArray')}
                            multiline
                            rows={8}
                            value={json}
                            onChange={e => setJson(e.target.value)}
                            placeholder={t('linkEpisodesModal.add.jsonPlaceholder')}
                            sx={holoFieldSx}
                        />
                    </Stack>
                );
        }
    };

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', mt: 2}}>
            {/* Top Controls: Common inputs + Mobile Method Selector */}
            <Stack spacing={2} sx={{mb: 2, flexShrink: 0}}>
                {/* Mobile-only method selector */}
                <FormControl
                    fullWidth
                    required
                    sx={{display: {xs: 'block', md: 'none'}, ...holoFieldSx}}
                >
                    <InputLabel>{t('linkEpisodesModal.add.method')}</InputLabel>
                    <Select
                        value={addMethod}
                        label={t('linkEpisodesModal.add.method')}
                        onChange={(e) => setAddMethod(e.target.value)}
                    >
                        <MenuItem value="pattern">{t('linkEpisodesModal.add.pattern')}</MenuItem>
                        <MenuItem value="list">{t('linkEpisodesModal.add.list')}</MenuItem>
                        <MenuItem value="json">{t('linkEpisodesModal.add.json')}</MenuItem>
                    </Select>
                </FormControl>

                {/* Language and Type inputs */}
                <Stack direction="row" spacing={2}>
                    <TextField
                        label={t('linkEpisodesModal.add.language')}
                        value={language}
                        onChange={e => setLanguage(e.target.value.toUpperCase())}
                        required
                        sx={{width: '100px', ...holoFieldSx}}
                        inputProps={{maxLength: 3}}
                    />
                    <FormControl fullWidth required sx={holoFieldSx}>
                        <InputLabel>{t('linkEpisodesModal.add.type')}</InputLabel>
                        <Select value={type} label={t('linkEpisodesModal.add.type')}
                                onChange={(e) => setType(e.target.value)}>
                            <MenuItem value="sub">{t('linkEpisodesModal.add.sub')}</MenuItem>
                            <MenuItem value="dub">{t('linkEpisodesModal.add.dub')}</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Stack>

            {/* Content area */}
            <Box sx={{display: 'flex'}}>
                {/* Desktop-only vertical tabs */}
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={addMethod}
                    onChange={(_, v) => setAddMethod(v)}
                    sx={{
                        borderRight: '1px solid rgba(76, 210, 255, 0.25)',
                        mr: 2,
                        flexShrink: 0,
                        display: {xs: 'none', md: 'flex'},
                        '& .MuiTab-root': {color: 'var(--text-secondary)', alignItems: 'flex-start', textAlign: 'left'},
                        '& .Mui-selected': {color: 'var(--neon-accent)'},
                        '& .MuiTabs-indicator': {backgroundColor: 'var(--neon-accent)'}
                    }}
                >
                    <Tab label={t('linkEpisodesModal.add.pattern')} value="pattern"/>
                    <Tab label={t('linkEpisodesModal.add.list')} value="list"/>
                    <Tab label={t('linkEpisodesModal.add.json')} value="json"/>
                </Tabs>

                {/* The main content that changes based on method, and save button */}
                <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                    <Box sx={{pr: 1}}>
                        {renderAddContent()}
                    </Box>
                    <Box sx={{mt: 2, display: 'flex', justifyContent: 'flex-end', flexShrink: 0, p: 1, pr: 0}}>
                        <Button
                            id={"add-links-button"}
                            data-component="add-links-button"
                            className="neon-edge"
                            onClick={handleSave}
                            variant="contained"
                            disabled={isSaving}
                            sx={{
                                background: 'var(--neon-accent)',
                                color: 'var(--bg-deep)',
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                '&:hover': {background: 'var(--neon-accent-hot)', boxShadow: 'var(--edge-glow-hot)'},
                                '&.Mui-disabled': {
                                    background: 'rgba(76, 210, 255, 0.25)',
                                    color: 'var(--text-secondary)'
                                }
                            }}
                        >
                            {isSaving ? <CircularProgress size={24} color="inherit"/> : t('linkEpisodesModal.add.save')}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
});
AddLinkTabs.displayName = 'AddLinkTabs';


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

    const handleAccordionChange = (panelId) => (event, isExpanded) => {
        setExpandedLinkAccordionId(isExpanded ? panelId : false);
    };

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
                        onAccordionChange={handleAccordionChange}
                    />
                )}
            </Stack>
        </ModalShell>
    );
});
LinkEpisodesModal.displayName = 'LinkEpisodesModal';

export default LinkEpisodesModal;
