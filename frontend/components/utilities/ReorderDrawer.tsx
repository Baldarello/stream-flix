import React, {useCallback, useState} from 'react';
import {
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import type {MediaItem} from '../../types.ts';
import {useTranslations} from '../../hooks/useTranslations.ts';

interface ReorderDrawerProps {
    open: boolean;
    onClose: () => void;
    items: MediaItem[];
    onSave: (orderedIds: number[]) => Promise<void>;
}

export const ReorderDrawer: React.FC<ReorderDrawerProps> = ({
    open,
    onClose,
    items,
    onSave
}) => {
    const {t} = useTranslations();
    const [localItems, setLocalItems] = useState<MediaItem[]>([...items]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Sync local items when drawer opens or items change
    React.useEffect(() => {
        setLocalItems([...items]);
        setHasChanges(false);
    }, [items, open]);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newItems = [...localItems];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, draggedItem);
        setLocalItems(newItems);
        setDraggedIndex(index);
        setHasChanges(true);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleMoveUp = useCallback((index: number) => {
        if (index === 0) return;
        const newItems = [...localItems];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        setLocalItems(newItems);
        setHasChanges(true);
    }, [localItems]);

    const handleMoveDown = useCallback((index: number) => {
        if (index === localItems.length - 1) return;
        const newItems = [...localItems];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setLocalItems(newItems);
        setHasChanges(true);
    }, [localItems]);

    const handleSave = async () => {
        // Extract all IDs in the new order
        const orderedIds = localItems.map(item => item.id);
        await onSave(orderedIds);
        setHasChanges(false);
        onClose();
    };

    const handleClose = () => {
        // Reset to original if there are unsaved changes
        if (hasChanges) {
            setLocalItems([...items]);
            setHasChanges(false);
        }
        onClose();
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={handleClose}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '80vh',
                    backgroundColor: 'rgba(20, 20, 30, 0.95)',
                    backdropFilter: 'blur(10px)',
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <Typography variant="h6" component="h3">
                    {t('contentRow.editOrder') || 'Edit Order'}
                </Typography>
                <IconButton onClick={handleClose} sx={{color: 'white'}}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Instructions */}
            <Box sx={{p: 2, pb: 1}}>
                <Typography variant="body2" color="text.secondary">
                    {t('contentRow.reorderInstructions') || 'Drag items to reorder, or use the arrows'}
                </Typography>
            </Box>

            {/* List */}
            <List sx={{flex: 1, overflow: 'auto', py: 0}}>
                {localItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        <ListItem
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            sx={{
                                bgcolor: draggedIndex === index ? 'rgba(255,152,0,0.2)' : 'transparent',
                                borderRadius: 1,
                                mb: 0.5,
                                cursor: 'grab',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                },
                                '&:active': {
                                    cursor: 'grabbing',
                                }
                            }}
                            secondaryAction={
                                <Box sx={{display: 'flex', gap: 0.5}}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleMoveUp(index)}
                                        disabled={index === 0}
                                        sx={{color: 'white', opacity: index === 0 ? 0.3 : 0.7}}
                                    >
                                        ↑
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleMoveDown(index)}
                                        disabled={index === localItems.length - 1}
                                        sx={{color: 'white', opacity: index === localItems.length - 1 ? 0.3 : 0.7}}
                                    >
                                        ↓
                                    </IconButton>
                                </Box>
                            }
                        >
                            <ListItemAvatar sx={{minWidth: 40}}>
                                <DragIndicatorIcon sx={{color: 'rgba(255,255,255,0.5)'}} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={item.title || item.name}
                                secondary={item.year ? `(${item.year})` : ''}
                                primaryTypographyProps={{
                                    sx: {color: 'white', fontSize: '0.95rem'}
                                }}
                                secondaryTypographyProps={{
                                    sx: {color: 'rgba(255,255,255,0.5)'}
                                }}
                            />
                        </ListItem>
                        {index < localItems.length - 1 && <Divider sx={{mx: 2, borderColor: 'rgba(255,255,255,0.05)'}} />}
                    </React.Fragment>
                ))}
            </List>

            {/* Footer with Save button */}
            {hasChanges && (
                <Box sx={{
                    p: 2,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    position: 'sticky',
                    bottom: 0,
                    bgcolor: 'rgba(20, 20, 30, 0.98)'
                }}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        sx={{
                            bgcolor: '#ff9800',
                            color: 'black',
                            fontWeight: 'bold',
                            '&:hover': {
                                bgcolor: '#ffb74d',
                            }
                        }}
                    >
                        {t('contentRow.saveOrder') || 'Save Order'}
                    </Button>
                </Box>
            )}
        </Drawer>
    );
};
