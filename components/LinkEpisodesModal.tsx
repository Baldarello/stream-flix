import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { mediaStore } from '../store/mediaStore';
import { Modal, Box, Typography, Button, TextField, Stack, IconButton, Select, MenuItem, FormControl, InputLabel, Tabs, Tab, Tooltip, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 550 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto',
};

type TabValue = 'pattern' | 'list' | 'json';

const LinkEpisodesModal: React.FC = () => {
  const { isLinkEpisodesModalOpen, closeLinkEpisodesModal, linkingEpisodesForItem: item } = mediaStore;
  
  const [activeTab, setActiveTab] = useState<TabValue>('pattern');
  const [selectedSeason, setSelectedSeason] = useState<number | ''>('');
  const [pattern, setPattern] = useState('');
  const [padding, setPadding] = useState('2');
  const [linkList, setLinkList] = useState('');
  const [json, setJson] = useState('');
  const patternInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item?.seasons?.[0]) {
      setSelectedSeason(item.seasons[0].season_number);
    } else {
        setSelectedSeason('');
    }
    // Reset fields on modal open
    setPattern('');
    setPadding('2');
    setLinkList('');
    setJson('');
    setActiveTab('pattern');
  }, [item]);

  if (!item) return null;
  
  const handleSave = () => {
    if (!selectedSeason) return;

    let data;
    switch(activeTab) {
        case 'pattern':
            data = { pattern, padding: parseInt(padding, 10) };
            break;
        case 'list':
            data = { list: linkList };
            break;
        case 'json':
            data = { json };
            break;
    }

    mediaStore.setEpisodeLinksForSeason({
        seasonNumber: selectedSeason,
        method: activeTab,
        data
    });
  };

  const handleInsertPlaceholder = () => {
    const input = patternInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const placeholder = '[@EP]';
    
    if (start !== null && end !== null) {
      const newPattern = pattern.substring(0, start) + placeholder + pattern.substring(end);
      setPattern(newPattern);
      
      // Focus and set cursor position after the inserted text
      input.focus();
      setTimeout(() => {
          input.selectionStart = input.selectionEnd = start + placeholder.length;
      }, 0);
    } else {
      setPattern(prev => prev + placeholder);
    }
  };

  const copyPlaceholder = () => {
    navigator.clipboard.writeText('[@EP]');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pattern':
        return (
          <Stack spacing={3} mt={3}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'rgba(255,255,255,0.23)' }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <InfoOutlinedIcon fontSize="small" />
                <strong>Come funziona:</strong>
              </Typography>
              <Typography component="ol" sx={{ pl: 2, m: 0, '& li': { mb: 1 } }}>
                <li>Trova il numero dell'episodio nel link (es. "01" in "Show_Ep_<b>01</b>_SUB.mp4").</li>
                <li>Copia il link e incollalo sotto.</li>
                <li>Sostituisci il numero (es. "01") con il segnaposto <code style={{background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px'}}>&#91;@EP&#93;</code>.</li>
              </Typography>
            </Paper>
            <TextField
              label="Incolla il link qui"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              inputRef={patternInputRef}
              InputProps={{
                endAdornment: (
                    <Button onClick={handleInsertPlaceholder} sx={{whiteSpace: 'nowrap'}}>[@EP]</Button>
                )
              }}
            />
            <TextField
              label="Padding (es. 2 per '01', 3 per '001')"
              required
              type="number"
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
            />
          </Stack>
        );
      case 'list':
        return (
            <Stack spacing={2} mt={3}>
                <Typography variant="body2">Incolla un elenco di link, uno per riga. L'ordine deve corrispondere a quello degli episodi.</Typography>
                <TextField
                    label="Lista di link"
                    multiline
                    rows={8}
                    value={linkList}
                    onChange={(e) => setLinkList(e.target.value)}
                />
            </Stack>
        );
      case 'json':
        return (
            <Stack spacing={2} mt={3}>
                <Typography variant="body2">Incolla un array JSON di stringhe di link.</Typography>
                <TextField
                    label="Array JSON"
                    multiline
                    rows={8}
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                    placeholder='[ "http://link1.mp4", "http://link2.mp4" ]'
                />
            </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={isLinkEpisodesModalOpen} onClose={closeLinkEpisodesModal}>
      <Box sx={style}>
        <IconButton
          onClick={closeLinkEpisodesModal}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
        
        <Typography variant="h5" component="h2" fontWeight="bold">
            Collega link per una stagione intera
        </Typography>

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
            <Tab label="Pattern" value="pattern" />
            <Tab label="Lista Link" value="list" />
            <Tab label="JSON" value="json" />
        </Tabs>
        
        <Stack spacing={3} mt={3}>
            <FormControl fullWidth required>
              <InputLabel id="season-select-label">Seleziona la stagione</InputLabel>
              <Select
                labelId="season-select-label"
                value={selectedSeason}
                label="Seleziona la stagione"
                onChange={(e) => setSelectedSeason(e.target.value as number)}
              >
                {item.seasons?.map(season => (
                  <MenuItem key={season.id} value={season.season_number}>
                    {season.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {renderTabContent()}
        </Stack>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={closeLinkEpisodesModal} color="inherit">Chiudi</Button>
            <Button onClick={handleSave} variant="contained">Salva</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default observer(LinkEpisodesModal);