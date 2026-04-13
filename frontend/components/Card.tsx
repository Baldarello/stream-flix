import React from 'react';
import type {MediaItem} from '../types.ts';
import {Box, Card as MuiCard, CardActionArea, CardMedia, IconButton, Tooltip, Typography} from '@mui/material';
import {observer} from 'mobx-react-lite';
// FIX: mediaStore is now a named export, not a default one.
import {mediaStore} from '../store/mediaStore.ts';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TheatersIcon from '@mui/icons-material/Theaters';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {useTranslations} from '../hooks/useTranslations.ts';

interface CardProps {
    item: MediaItem;
    onClick: (item: MediaItem) => void;
    displayMode?: 'row' | 'grid';
    className?: string;
    style?: React.CSSProperties;
    isContinueWatching?: boolean;
    isReorderable?: boolean;
    onReorderTop?: () => void;
    onReorderBottom?: () => void;
    isDragActive?: boolean;
}

export const Card: React.FC<CardProps> = observer(({
                                                       item,
                                                       onClick,
                                                       displayMode = 'row',
                                                       className,
                                                       style,
                                                       isContinueWatching = false,
                                                       isReorderable = false,
                                                       onReorderTop,
                                                       onReorderBottom,
                                                       isDragActive = false
                                                   }) => {
    const {t} = useTranslations();
    const title = item.title || item.name;
    const isInMyList = mediaStore.myList.includes(item.id);

    const handleActionButtonClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (isContinueWatching) {
            mediaStore.removeFromContinueWatching(item.id);
        } else {
            mediaStore.toggleMyList(item);
        }
    };

    const getGlowColor = () => {
        switch (mediaStore.activeTheme) {
            case 'Film':
                return 'var(--glow-film-color)';
            case 'Anime':
                return 'var(--glow-anime-color)';
            case 'SerieTV':
            default:
                return 'var(--glow-seriestv-color)';
        }
    }

    const actionButtonTooltip = isContinueWatching
        ? t('card.removeFromContinueWatching')
        : (isInMyList ? t('card.removeFromList') : t('card.addToList'));

    const actionButtonIcon = isContinueWatching
        ? <CloseIcon/>
        : (isInMyList ? <CheckIcon/> : <AddIcon/>);

    const rowStyles = {
        '&:hover': {
            transform: 'scale(1.15) translateY(-10px)',
            marginLeft: '10px',
            marginRight: '50px',
            borderColor: getGlowColor(),
            boxShadow: `0 15px 25px rgba(0,0,0,0.7), 0 0 20px ${getGlowColor()}`,
        },
    };

    const gridStyles = {
        width: '100%',
        '&:hover': {
            transform: 'scale(1.05)',
            zIndex: 10,
            borderColor: getGlowColor(),
            boxShadow: `0 10px 15px rgba(0,0,0,0.5), 0 0 10px ${getGlowColor()}`,
        },
    };

    const cardBaseStyles = {
        position: 'relative',
        bgcolor: 'transparent',
        flexShrink: 0,
        width: {xs: 160, md: 208, lg: 256},
        aspectRatio: '2/3',
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        border: '2px solid transparent',
        overflow: 'visible',
        '& .title-overlay': {opacity: 0, transition: 'opacity 0.3s'},
        '&:hover .title-overlay': {opacity: 1},
        '& .add-to-list-btn': {opacity: 0, transform: 'translateY(10px)', transition: 'opacity 0.3s, transform 0.3s'},
        '&:hover .add-to-list-btn': {opacity: 1, transform: 'translateY(0)'},
        '& .reorder-btn': {opacity: 0, transform: 'scale(0.8)', transition: 'opacity 0.2s, transform 0.2s'},
        '&:hover .reorder-btn': {opacity: 1, transform: 'scale(1)'},
        ...(isDragActive && {
            transform: 'scale(1.2) translateY(-10px)',
            boxShadow: `0 20px 40px rgba(0,0,0,0.8), 0 0 30px ${getGlowColor()}`,
            borderColor: getGlowColor(),
            zIndex: 100,
        }),
    };

    return (
        <MuiCard
            className={className}
            style={style}
            sx={{
                ...cardBaseStyles,
                ...(displayMode === 'row' ? rowStyles : gridStyles),
                cursor: isReorderable ? 'grab' : undefined,
            }}
            onClick={() => onClick(item)}
            role="button"
            aria-label={t('card.detailsFor', {title})}
        >
            {/* Reorder buttons - only show when reorderable */}
            {isReorderable && (
                <>
                    <Tooltip title={t('card.moveToTop') || 'Move to top'}>
                        <IconButton
                            className="reorder-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReorderTop?.();
                            }}
                            aria-label={t('card.moveToTop') || 'Move to top'}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                zIndex: 11,
                                bgcolor: 'rgba(20, 20, 20, 0.9)',
                                color: 'white',
                                width: 28,
                                height: 28,
                                '&:hover': {
                                    bgcolor: 'rgba(20, 20, 20, 1)',
                                    transform: 'scale(1.1)',
                                },
                            }}
                        >
                            <ArrowUpwardIcon sx={{fontSize: 18}}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('card.moveToBottom') || 'Move to bottom'}>
                        <IconButton
                            className="reorder-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReorderBottom?.();
                            }}
                            aria-label={t('card.moveToBottom') || 'Move to bottom'}
                            sx={{
                                position: 'absolute',
                                top: 42,
                                left: 8,
                                zIndex: 11,
                                bgcolor: 'rgba(20, 20, 20, 0.9)',
                                color: 'white',
                                width: 28,
                                height: 28,
                                '&:hover': {
                                    bgcolor: 'rgba(20, 20, 20, 1)',
                                    transform: 'scale(1.1)',
                                },
                            }}
                        >
                            <ArrowDownwardIcon sx={{fontSize: 18}}/>
                        </IconButton>
                    </Tooltip>
                </>
            )}

            {/* FIX: (line 103) Wrap IconButton with Tooltip component */}
            <Tooltip title={actionButtonTooltip}>
                <IconButton
                    className="add-to-list-btn"
                    onClick={handleActionButtonClick}
                    aria-label={actionButtonTooltip}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 11,
                        bgcolor: 'rgba(20, 20, 20, 0.7)',
                        color: 'white',
                        '&:hover': {
                            bgcolor: 'rgba(20, 20, 20, 0.9)',
                            transform: 'scale(1.1) translateY(0)', // Override parent hover transform
                        },
                    }}
                >
                    {actionButtonIcon}
                </IconButton>
            </Tooltip>
            <CardActionArea sx={{borderRadius: '10px', overflow: 'hidden', height: '100%'}}>
                {item.poster_path ? (
                    <CardMedia
                        component="img"
                        image={item.poster_path}
                        alt={title}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <Box sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.05)',
                    }}>
                        <TheatersIcon color="disabled" sx={{fontSize: '6rem'}}/>
                    </Box>
                )}
                <Box
                    className="title-overlay"
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 1.5,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                    }}
                >
                    <Typography variant="subtitle2" color="white" fontWeight="bold" noWrap>
                        {title}
                    </Typography>
                </Box>
            </CardActionArea>
        </MuiCard>
    );
});
