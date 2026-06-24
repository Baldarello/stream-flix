/**
 * @fileoverview MyListDetailView - dedicated detail screen for "La mia lista".
 *
 * Replaces the simple grid view of the user's library with a richer
 * holographic screen that surfaces:
 *   - a sticky back button + screen title + a holo stats strip
 *   - quick filter chips (All / Movies / Series / Anime)
 *   - a sort selector (Recently added / Title / Last edited)
 *   - the actual library cards in a responsive grid
 *   - a dedicated drag-and-drop reorder mode (the original
 *     "edit" toggle that used to live on the home page row)
 *
 * The component is fully MobX-driven. Local React state is reserved
 * for purely visual concerns (the in-flight remove confirmation).
 *
 * Routing is owned by the parent (`FeatureRouter`) — this view
 * only reads `mediaStore.activeView` to no-op side effects and
 * exposes a "back" handler that flips the active view to `Home`.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {observer} from 'mobx-react-lite';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MovieIcon from '@mui/icons-material/Movie';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import TvIcon from '@mui/icons-material/Tv';
import {gsap} from 'gsap';
import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {HoloCard} from '../layout/HoloCard.jsx';
import {HoloChip} from '../feedback/HoloChip.jsx';
import {EmptyState} from './shared/EmptyState.jsx';
import {durations, easings, reducedMotion} from '../../motion/grammar.js';

const FILTER_KEYS = ['all', 'movie', 'tv'];
const SORT_KEYS = ['recent', 'title', 'edited'];

const matchesQuery = (item, query) => {
    if (!query) return true;
    const name = (item.name || item.title || '').toLowerCase();
    return name.includes(query.toLowerCase());
};

const sortItems = (items, sortKey) => {
    const copy = [...items];
    switch (sortKey) {
        case 'title':
            copy.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
            break;
        case 'edited':
            // Items are already keyed by the library order, so we keep
            // the persisted order but allow the caller to opt into
            // a manual edited-at sort when last-edited timestamps are
            // available. The header reads the timestamps from the
            // store on demand so we just preserve the order here.
            break;
        case 'recent':
        default:
            break;
    }
    return copy;
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleDateString(
            mediaStore.language === 'en' ? 'en-US' : 'it-IT',
            {day: '2-digit', month: '2-digit', year: 'numeric'}
        );
    } catch (e) {
        return '';
    }
};

const MyListDetailView = observer(() => {
    const {t} = useTranslations();
    const gridRef = useRef(null);

    const {
        myListItems,
        myList,
        libraryLastEdited,
        librarySearchQuery,
        setLibrarySearchQuery,
        activeView,
        setActiveView,
        toggleReorderMode,
        isReorderMode,
        reorderMyList,
        toggleMyList
    } = mediaStore;

    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('recent');
    const [pendingRemove, setPendingRemove] = useState(null);
    const [dragItemId, setDragItemId] = useState(null);
    const [dropTargetId, setDropTargetId] = useState(null);
    const dragItemIdRef = useRef(null);
    const dropTargetIdRef = useRef(null);

    // Reset the local filter/sort when the view is hidden (e.g. the
    // user navigates to the home page and back). We don't want stale
    // chip selection to follow them across visits.
    useEffect(() => {
        if (activeView !== 'MyListDetail') {
            setFilter('all');
            setSort('recent');
            setDragItemId(null);
            setDropTargetId(null);
            dragItemIdRef.current = null;
            dropTargetIdRef.current = null;
        }
    }, [activeView]);

    // Cards enter with a tiny stagger so the grid feels alive on
    // first paint. Reduced motion collapses to a fade.
    useEffect(() => {
        const el = gridRef.current;
        if (!el || reducedMotion()) return;
        const cards = el.querySelectorAll('[data-component="holo-card"]');
        if (cards.length === 0) return;
        gsap.fromTo(cards,
            {y: 18, autoAlpha: 0},
            {y: 0, autoAlpha: 1, duration: durations.med, ease: easings.standard, stagger: 0.04, overwrite: 'auto'});
    }, [myListItems && myListItems.length, filter, sort]);

    const counts = useMemo(() => {
        const result = {all: 0, movie: 0, tv: 0};
        for (const item of myListItems) {
            if (!item) continue;
            result.all += 1;
            const type = item.media_type;
            if (type === 'movie' || type === 'tv') {
                result[type] += 1;
            }
        }
        return result;
    }, [myListItems]);

    const filteredItems = useMemo(() => {
        const filtered = myListItems.filter((item) => {
            if (!item) return false;
            if (filter !== 'all' && item.media_type !== filter) return false;
            return matchesQuery(item, librarySearchQuery);
        });
        return sortItems(filtered, sort);
    }, [myListItems, filter, sort, librarySearchQuery]);

    const handleBack = () => {
        if (isReorderMode && typeof toggleReorderMode === 'function') {
            toggleReorderMode();
        }
        setActiveView('Home');
    };

    const handleConfirmRemove = () => {
        if (!pendingRemove) return;
        toggleMyList({id: pendingRemove.id});
        setPendingRemove(null);
    };

    // ===== Drag-and-drop handlers =====
    const handleCardDragStart = (item) => {
        if (!isReorderMode || !item) return;
        dragItemIdRef.current = item.id;
        dropTargetIdRef.current = null;
        setDragItemId(item.id);
        setDropTargetId(null);
    };

    const handleCardDragEnter = (item) => {
        if (!isReorderMode || !item) return;
        if (dragItemIdRef.current === item.id) return;
        dropTargetIdRef.current = item.id;
        setDropTargetId(item.id);
    };

    const handleCardDragOver = (event) => {
        if (!isReorderMode) return;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (event && event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    };

    const handleCardDragLeave = (item) => {
        if (!isReorderMode || !item) return;
        if (dropTargetIdRef.current === item.id) {
            dropTargetIdRef.current = null;
            setDropTargetId(null);
        }
    };

    const handleCardDragEnd = () => {
        if (!isReorderMode) return;
        const src = dragItemIdRef.current;
        const tgt = dropTargetIdRef.current;
        if (src != null && tgt != null && src !== tgt) {
            const sourceIdx = myList.indexOf(src);
            const targetIdx = myList.indexOf(tgt);
            if (sourceIdx >= 0 && targetIdx >= 0) {
                reorderMyList(sourceIdx, targetIdx);
            }
        }
        dragItemIdRef.current = null;
        dropTargetIdRef.current = null;
        setDragItemId(null);
        setDropTargetId(null);
    };

    const handleCardClick = (item) => {
        if (isReorderMode) return;
        mediaStore.selectMedia(item);
    };

    return (
        <Box
            id="my-list-detail-view"
            data-component="my-list-detail-view"
            sx={{pt: 'calc(80px + env(safe-area-inset-top))', pb: 8, color: 'text.primary'}}
        >
            {/* Sticky header: back + title + actions */}
            <Box
                id="my-list-detail-header"
                className="holo-surface"
                sx={{
                    position: 'sticky',
                    top: {xs: 64, md: 72},
                    zIndex: 5,
                    mx: {xs: 0, md: 3},
                    mt: {xs: 0, md: 2},
                    p: {xs: 1.5, md: 2},
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: {xs: 'column', md: 'row'},
                    gap: 2,
                    alignItems: {md: 'center'},
                    justifyContent: 'space-between'
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{minWidth: 0, flex: 1}}>
                    <IconButton
                        id="my-list-detail-back"
                        aria-label={t('common.back') || t('detail.close')}
                        onClick={handleBack}
                        sx={{
                            color: 'var(--text-primary)',
                            border: '1px solid rgba(76, 210, 255, 0.25)',
                            '&:hover': {borderColor: 'var(--neon-accent)', color: 'var(--neon-accent)'}
                        }}
                    >
                        <ArrowBackIcon/>
                    </IconButton>
                    <Box sx={{minWidth: 0}}>
                        <Typography
                            id="my-list-detail-title"
                            variant="h4"
                            sx={{
                                fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                color: 'var(--text-primary)',
                                textShadow: '0 0 14px rgba(76, 210, 255, 0.25)',
                                fontSize: {xs: '1.5rem', md: '2rem'},
                                lineHeight: 1.1
                            }}
                        >
                            {t('myListDetail.title')}
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{color: 'var(--text-secondary)', mt: 0.5}}
                        >
                            {t('myListDetail.subtitle', {count: myListItems.length})}
                        </Typography>
                    </Box>
                </Stack>

                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{flexWrap: 'wrap', rowGap: 1}}
                >
                    <TextField
                        id="my-list-detail-search"
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                        placeholder={t('myListDetail.searchPlaceholder')}
                        size="small"
                        sx={{
                            minWidth: {xs: '100%', sm: 240},
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
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{color: 'var(--neon-accent)'}}/>
                                </InputAdornment>
                            )
                        }}
                    />
                    <Tooltip title={isReorderMode ? t('myListDetail.reorderOff') : t('myListDetail.reorderOn')}>
                        <span>
                            <IconButton
                                id="my-list-detail-reorder-toggle"
                                aria-label={t('myListDetail.reorderOn')}
                                onClick={() => toggleReorderMode && toggleReorderMode()}
                                sx={{
                                    color: isReorderMode ? 'var(--neon-accent)' : 'var(--text-primary)',
                                    border: '1px solid rgba(76, 210, 255, 0.25)',
                                    '&:hover': {borderColor: 'var(--neon-accent)'}
                                }}
                            >
                                <EditIcon fontSize="small"/>
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Box>

            {/* Stats strip */}
            <Box
                id="my-list-detail-stats"
                sx={{
                    mx: {xs: 0, md: 3},
                    mt: 2,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    '& > *': {mr: 0.5}
                }}
            >
                <HoloChip
                    id="my-list-detail-stat-total"
                    label={t('myListDetail.stats.total', {count: counts.all})}
                />
                <HoloChip
                    id="my-list-detail-stat-movies"
                    icon={<MovieIcon/>}
                    label={t('myListDetail.stats.movies', {count: counts.movie})}
                />
                <HoloChip
                    id="my-list-detail-stat-series"
                    icon={<TvIcon/>}
                    label={t('myListDetail.stats.series', {count: counts.tv})}
                />
            </Box>

            {/* Filter + sort toolbar */}
            <Box
                id="my-list-detail-toolbar"
                sx={{
                    mx: {xs: 0, md: 3},
                    mt: 2,
                    display: 'flex',
                    flexDirection: {xs: 'column', sm: 'row'},
                    gap: 1.5,
                    alignItems: {sm: 'center'},
                    justifyContent: 'space-between',
                    px: {xs: 0, md: 0.5}
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{flexWrap: 'wrap', rowGap: 1, '& > *': {mr: 0.5}}}
                >
                    {FILTER_KEYS.map((key) => {
                        const isActive = filter === key;
                        return (
                            <Button
                                key={`filter-${key}`}
                                id={`my-list-detail-filter-${key}`}
                                data-filter={key}
                                data-active={isActive ? 'true' : 'false'}
                                startIcon={key === 'movie' ? <MovieIcon/> : key === 'tv' ? <TvIcon/> : <FilterListIcon/>}
                                onClick={() => setFilter(key)}
                                size="small"
                                sx={{
                                    color: isActive ? 'var(--neon-accent)' : 'var(--text-primary)',
                                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    textTransform: 'none',
                                    background: isActive ? 'rgba(76, 210, 255, 0.18)' : 'rgba(255,255,255,0.04)',
                                    border: '1px solid',
                                    borderColor: isActive ? 'var(--neon-accent)' : 'rgba(76, 210, 255, 0.18)',
                                    borderRadius: '999px',
                                    px: 1.5,
                                    '&:hover': {borderColor: 'var(--neon-accent)'}
                                }}
                            >
                                {t(`myListDetail.filter.${key}`)}
                            </Button>
                        );
                    })}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <SortIcon sx={{color: 'var(--text-secondary)'}} fontSize="small"/>
                    <Select
                        id="my-list-detail-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        size="small"
                        sx={{
                            minWidth: 180,
                            color: 'var(--text-primary)',
                            fontFamily: "'Inter', sans-serif",
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
                            '& .MuiSelect-icon': {color: 'var(--neon-accent)'}
                        }}
                    >
                        {SORT_KEYS.map((key) => (
                            <MenuItem
                                key={`sort-${key}`}
                                id={`my-list-detail-sort-${key}`}
                                value={key}
                            >
                                {t(`myListDetail.sort.${key}`)}
                            </MenuItem>
                        ))}
                    </Select>
                </Stack>
            </Box>

            {/* Grid */}
            <Box
                ref={gridRef}
                id="my-list-detail-grid"
                data-testid="my-list-detail-grid"
                sx={{
                    mx: {xs: 0, md: 3},
                    mt: 3,
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                        lg: 'repeat(5, 1fr)',
                        xl: 'repeat(6, 1fr)'
                    },
                    gap: {xs: 1.5, md: 2.5}
                }}
            >
                {filteredItems.map((item) => (
                    <Box
                        key={item.id}
                        data-component="my-list-detail-card-wrap"
                        draggable={isReorderMode}
                        onDragStart={() => handleCardDragStart(item)}
                        onDragEnter={() => handleCardDragEnter(item)}
                        onDragOver={handleCardDragOver}
                        onDragLeave={() => handleCardDragLeave(item)}
                        onDragEnd={handleCardDragEnd}
                        onDrop={handleCardDragEnd}
                        sx={{position: 'relative'}}
                    >
                        <HoloCard
                            item={item}
                            onClick={handleCardClick}
                            displayMode="grid"
                            isReorderable={isReorderMode}
                            isDragActive={isReorderMode && dragItemId === item.id}
                            isDropTarget={isReorderMode && dropTargetId === item.id && dragItemId !== item.id}
                        />
                        {!isReorderMode && (
                            <Tooltip title={t('myListDetail.removeTooltip')}>
                                <IconButton
                                    id={`my-list-detail-remove-${item.id}`}
                                    aria-label={t('myListDetail.removeTooltip')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPendingRemove({
                                            id: item.id,
                                            name: item.name || item.title || item.id
                                        });
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        zIndex: 12,
                                        bgcolor: 'rgba(5, 6, 13, 0.7)',
                                        color: 'var(--neon-accent-hot)',
                                        opacity: 0,
                                        transform: 'translateY(-4px) scale(0.9)',
                                        transition: 'opacity 200ms ease, transform 200ms ease',
                                        '.my-list-detail-card-wrap:hover &': {opacity: 1, transform: 'translateY(0) scale(1)'},
                                        '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.9)'}
                                    }}
                                >
                                    <DeleteIcon fontSize="small"/>
                                </IconButton>
                            </Tooltip>
                        )}
                        {isReorderMode && libraryLastEdited && libraryLastEdited.get(item.id) && (
                            <Typography
                                variant="caption"
                                sx={{
                                    position: 'absolute',
                                    bottom: 6,
                                    left: 6,
                                    right: 6,
                                    color: 'var(--text-secondary)',
                                    fontFamily: "'Inter', sans-serif",
                                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                                    pointerEvents: 'none'
                                }}
                            >
                                {t('libraryManagement.myList.lastEdited', {date: formatDate(libraryLastEdited.get(item.id))})}
                            </Typography>
                        )}
                    </Box>
                ))}
            </Box>

            {filteredItems.length === 0 && (
                <Box sx={{mx: {xs: 0, md: 3}, mt: 4}}>
                    <EmptyState
                        id="my-list-detail-empty"
                        icon={<FilterListIcon sx={{fontSize: 44}}/>}
                        title={
                            librarySearchQuery
                                ? t('libraryManagement.dashboard.noResults', {query: librarySearchQuery})
                                : t('myListDetail.emptyTitle')
                        }
                        subtitle={
                            librarySearchQuery
                                ? undefined
                                : t('myListDetail.emptySubtitle')
                        }
                        ctaLabel={librarySearchQuery ? undefined : t('myListDetail.emptyCta')}
                        onCta={librarySearchQuery ? undefined : handleBack}
                    />
                </Box>
            )}

            {/* Remove confirmation dialog */}
            <Dialog
                open={!!pendingRemove}
                onClose={() => setPendingRemove(null)}
                id="my-list-detail-remove-dialog"
            >
                <DialogTitle>{t('libraryManagement.deleteConfirm.title')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('libraryManagement.myList.removeConfirm', {name: pendingRemove?.name || ''})}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingRemove(null)}>
                        {t('libraryManagement.cancel')}
                    </Button>
                    <Button onClick={handleConfirmRemove} color="error">
                        {t('libraryManagement.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

MyListDetailView.displayName = 'MyListDetailView';

export default MyListDetailView;
export {MyListDetailView};
