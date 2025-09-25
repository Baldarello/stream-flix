import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, TextField, Stack, IconButton, Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Alert, FormControlLabel, Switch, Autocomplete, CircularProgress } from '@mui/material';
// FIX: `SelectChangeEvent` is imported from '@mui/material/Select' instead of '@mui/material'.
import { SelectChangeEvent } from '@mui/material/Select';
// FIX: Imported CloseIcon to resolve the "Cannot find name" error.
import CloseIcon from '@mui/icons-material/Close';
import ManageLinksView from './ManageLinksView';
import { useTranslations } from '../hooks/useTranslations';


const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 600 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  pt: 6, 
  px: 4, 
  pb: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

type TabValue = 'add' | 'manage';

const AddLinkTabs: React.FC<{
    selectedSeason: number;
    seasonEpisodeCount: number;
    onSave: (payload: { seasonNumber: number; method: string; data: any; language: string; type: 'sub' | 'dub'; }) => Promise<boolean>;
    onSuccess: () => void;
}> = observer(({ selectedSeason, seasonEpisodeCount, onSave, onSuccess }) => {
    const { t } = useTranslations();
    const [addMethod, setAddMethod] = useState<'pattern' | 'list' | 'json'>('pattern');
    const [pattern, setPattern] = useState('');
    const [padding, setPadding] = useState('2');
    const [label, setLabel] = useState('');
    const [linkList, setLinkList] = useState('');
    const [json, setJson] = useState('');
    const patternInputRef = useRef<HTMLInputElement>(null);
    const [isAdvanced, setIsAdvanced] = useState(false);
    const [startEpisode, setStartEpisode] = useState('1');
    const [endEpisode, setEndEpisode] = useState('12');
    const [startNumber, setStartNumber] = useState('1');
    const [endNumber, setEndNumber] = useState('12');
    const [isSaving, setIsSaving] = useState(false);
    const [language, setLanguage] = useState('ITA');
    const [type, setType] = useState<'sub' | 'dub'>('sub');

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
        let data: any, error: string | null = null, isErrorKey = false, errorValues: Record<string, any> = {};
        switch (addMethod) {
            case 'pattern':
                if (!pattern) { error = "Il pattern non può essere vuoto."; }
                else if (!pattern.includes('[@EP]')) { error = "Il pattern deve includere il segnaposto [@EP]."; }
                else {
                    data = { pattern, padding: parseInt(padding, 10), label };
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
                            errorValues = { epRange: endEp - startEp + 1, numRange: endNum - startNum + 1 };
                        }
                        else {
                           data.start = startEp;
                           data.end = endEp;
                           data.startNum = startNum;
                           data.endNum = endNum;
                        }
                    }
                }
                break;
            case 'list':
                if (!linkList.trim()) error = "La lista non può essere vuota.";
                else data = { list: linkList };
                break;
            case 'json':
                 if (!json.trim()) error = "Il JSON non può essere vuoto.";
                else data = { json };
                break;
        }

        if (error) {
            mediaStore.showSnackbar(error, 'error', isErrorKey, errorValues);
            setIsSaving(false);
        } else if (data) {
            const success = await onSave({ seasonNumber: selectedSeason, method: addMethod, data, language, type });
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
    
    const handleInsertPlaceholder = (placeholder: '[@EP]' | '[@LABEL]') => {
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
    
    const renderAddContent = () => {
        switch (addMethod) {
          case 'pattern':
            return (
              <Stack spacing={2}>
                <Alert severity="info">{t('linkEpisodesModal.add.patternInfo')}</Alert>
                <TextField 
                    label={t('linkEpisodesModal.add.patternUrl')} 
                    required value={pattern} 
                    onChange={e => setPattern(e.target.value)} 
                    inputRef={patternInputRef} 
                    InputProps={{ 
                        endAdornment: (
                            <Button 
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleInsertPlaceholder('[@EP]')}
                            >
                                &#91;@EP&#93;
                            </Button>
                        )
                    }} 
                />
                <FormControlLabel
                    control={<Switch checked={isAdvanced} onChange={(e) => setIsAdvanced(e.target.checked)} />}
                    label={t('linkEpisodesModal.add.advancedConfig')}
                />
                {isAdvanced && (
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label={t('linkEpisodesModal.add.startEpisode')}
                                type="number"
                                value={startEpisode}
                                onChange={(e) => setStartEpisode(e.target.value)}
                                inputProps={{ min: 1 }}
                                fullWidth
                            />
                            <TextField
                                label={t('linkEpisodesModal.add.endEpisode')}
                                type="number"
                                value={endEpisode}
                                onChange={(e) => setEndEpisode(e.target.value)}
                                inputProps={{ min: 1 }}
                                fullWidth
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label={t('linkEpisodesModal.add.startNumberPlaceholder')}
                                type="number"
                                value={startNumber}
                                onChange={(e) => setStartNumber(e.target.value)}
                                inputProps={{ min: 1 }}
                                fullWidth
                            />
                            <TextField
                                label={t('linkEpisodesModal.add.endNumberPlaceholder')}
                                type="number"
                                value={endNumber}
                                onChange={(e) => setEndNumber(e.target.value)}
                                inputProps={{ min: 1 }}
                                fullWidth
                            />
                        </Stack>
                        <Autocomplete
                            freeSolo
                            options={mediaStore.allUniqueLabels}
                            value={label}
                            onInputChange={(event, newInputValue) => {
                                setLabel(newInputValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={t('linkEpisodesModal.add.linkLabel')}
                                    helperText={t('linkEpisodesModal.add.linkLabelHelper')}
                                />
                            )}
                        />
                        <TextField label={t('linkEpisodesModal.add.padding')} required type="number" value={padding} onChange={e => setPadding(e.target.value)} helperText={t('linkEpisodesModal.add.paddingHelper')} />
                    </Stack>
                )}
              </Stack>
            );
          case 'list':
            return (
                <Stack spacing={2}>
                    <Alert severity="info">{t('linkEpisodesModal.add.listInfo', { count: seasonEpisodeCount })}</Alert>
                    <TextField label={t('linkEpisodesModal.add.listLinks')} multiline rows={8} value={linkList} onChange={e => setLinkList(e.target.value)} />
                </Stack>
            );
          case 'json':
            return (
                <Stack spacing={2}>
                    <Alert severity="info">{t('linkEpisodesModal.add.jsonInfo')}</Alert>
                    <TextField label={t('linkEpisodesModal.add.jsonArray')} multiline rows={8} value={json} onChange={e => setJson(e.target.value)} placeholder={t('linkEpisodesModal.add.jsonPlaceholder')} />
                </Stack>
            );
        }
    };

    return (
        <Box sx={{ display: 'flex', mt: 2, flexGrow: 1, overflow: 'hidden' }}>
            <Tabs
                orientation="vertical"
                variant="scrollable"
                value={addMethod}
                onChange={(_, v) => setAddMethod(v)}
                sx={{ borderRight: 1, borderColor: 'divider', mr: 2, flexShrink: 0 }}
            >
                <Tab label={t('linkEpisodesModal.add.pattern')} value="pattern" />
                <Tab label={t('linkEpisodesModal.add.list')} value="list" />
                <Tab label={t('linkEpisodesModal.add.json')} value="json" />
            </Tabs>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                 <Box sx={{ flexGrow: 1, pr: 1 }}>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label={t('linkEpisodesModal.add.language')}
                                value={language}
                                onChange={e => setLanguage(e.target.value.toUpperCase())}
                                required
                                sx={{width: '100px'}}
                                inputProps={{ maxLength: 3 }}
                            />
                            <FormControl fullWidth required>
                                <InputLabel>{t('linkEpisodesModal.add.type')}</InputLabel>
                                <Select value={type} label={t('linkEpisodesModal.add.type')} onChange={(e) => setType(e.target.value as 'sub' | 'dub')}>
                                    <MenuItem value="sub">{t('linkEpisodesModal.add.sub')}</MenuItem>
                                    <MenuItem value="dub">{t('linkEpisodesModal.add.dub')}</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                        {renderAddContent()}
                    </Stack>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', flexShrink: 0, p: 1 }}>
                    <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} color="inherit" /> : t('linkEpisodesModal.add.save')}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
});


const LinkEpisodesModal: React.FC = observer(() => {
  const { isLinkEpisodesModalOpen, closeLinkEpisodesModal, linkingEpisodesForItem: item, setEpisodeLinksForSeason, expandedLinkAccordionId, setExpandedLinkAccordionId } = mediaStore;
  const { t } = useTranslations();
  
  const [activeTab, setActiveTab] = useState<TabValue>('add');
  const [selectedSeason, setSelectedSeason] = useState<number | ''>('');

  useEffect(() => {
    if (item?.seasons?.[0]) {
      setSelectedSeason(item.seasons[0].season_number);
    } else {
      setSelectedSeason('');
    }
    setActiveTab('add');
  }, [item?.id]);

  if (!item) return null;
  
  const currentSeason = item.seasons?.find(s => s.season_number === selectedSeason);

  const handleAccordionChange = (panelId: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedLinkAccordionId(isExpanded ? panelId : false);
  };
  
  const handleSeasonChange = (event: SelectChangeEvent<number>) => {
      setSelectedSeason(event.target.value as number);
      setExpandedLinkAccordionId(false); // Reset expanded accordion when season changes
  };
  
  return (
    <Modal open={isLinkEpisodesModalOpen} onClose={closeLinkEpisodesModal}>
      <Box sx={style}>
        <IconButton onClick={closeLinkEpisodesModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        <Typography variant="h5" component="h2" fontWeight="bold">{t('linkEpisodesModal.title', { name: item.name })}</Typography>

        {/* FIX: The `mt` prop is a system prop and should be passed inside the `sx` object. */}
        <Stack spacing={2} sx={{ mt: 2, pt: 2, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <FormControl fullWidth required>
              <InputLabel>{t('linkEpisodesModal.selectSeason')}</InputLabel>
              <Select value={selectedSeason} label={t('linkEpisodesModal.selectSeason')} onChange={handleSeasonChange}>
                {item.seasons?.map(season => <MenuItem key={season.id} value={season.season_number}>{season.name}</MenuItem>)}
              </Select>
            </FormControl>

            <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tab label={t('linkEpisodesModal.addLinks')} value="add" />
                <Tab label={t('linkEpisodesModal.manageLinks')} value="manage" />
            </Tabs>

            {activeTab === 'add' && currentSeason && <AddLinkTabs selectedSeason={currentSeason.season_number} seasonEpisodeCount={currentSeason.episode_count} onSave={setEpisodeLinksForSeason} onSuccess={() => setActiveTab('manage')} />}
            {activeTab === 'manage' && currentSeason && (
              <ManageLinksView 
                currentSeason={currentSeason} 
                item={item}
                expandedAccordion={expandedLinkAccordionId}
                onAccordionChange={handleAccordionChange}
              />
            )}
        </Stack>
      </Box>
    </Modal>
  );
});

export default LinkEpisodesModal;