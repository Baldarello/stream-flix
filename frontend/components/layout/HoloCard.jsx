/**
 * @fileoverview HoloCard - the futuristic content card.
 *
 * Replaces the legacy `Card.jsx`. Same public prop contract so feature
 * folders (ContentRow, GridView) keep working without changes.
 *
 * Visual upgrades:
 *  - CSS 3D tilt on pointer move (perspective 900px, rotateX / rotateY).
 *  - Holographic edge using the unified `--neon-accent` and a moving
 *    specular sweep on hover (`.holo-surface` + custom sweep).
 *  - Kinetic info reveal (year / runtime / genres) using the
 *    `kinetic-reveal` keyframe.
 *  - GPU-friendly `will-change: transform`.
 *  - Reduced motion: tilt and sweep collapse to a static glow.
 *
 * The card is a single atomic component. The new id is `card-holo`;
 * the legacy class names (`.add-to-list-btn`, `.title-overlay`) are kept
 * so existing tests and CSS hooks continue to work.
 */

import React, {useEffect, useRef} from 'react';
import {observer} from 'mobx-react-lite';
import {Box, CardMedia, IconButton, Tooltip, Typography} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TheatersIcon from '@mui/icons-material/Theaters';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {mediaStore} from '../../store/mediaStore.js';
import {useTranslations} from '../../hooks/useTranslations.js';
import {reducedMotion} from '../../utils/reducedMotion.js';

const HoloCardInner = ({
                           item,
                           onClick,
                           displayMode = 'row',
                           className,
                           style,
                           isContinueWatching = false,
                           isReorderable = false,
                           onReorderTop,
                           onReorderBottom,
                           isDragActive = false,
                           isDropTarget = false,
                           onDragStartCard,
                           onDragEnterCard,
                           onDragOverCard,
                           onDragLeaveCard,
                           onDragEndCard
                       }) => {
    const {t} = useTranslations();
    const rootRef = useRef(null);
    const innerRef = useRef(null);
    const title = item.title || item.name;
    const isInMyList = mediaStore.myList.includes(item.id);

    // Stop the mousedown/pointerdown bubbling to the root. The 3D
    // tilt handler updates the inner transform on every mousemove,
    // so without this the inner can drift between mousedown and
    // mouseup, the visual hit-area moves out from under the cursor,
    // and the click event fires on the root (which opens the detail
    // view) instead of the button.
    const stopMouseDownBubble = (event) => {
        event.stopPropagation();
    };

    const handleActionButtonClick = (event) => {
        event.stopPropagation();
        if (isContinueWatching) {
            mediaStore.removeFromContinueWatching(item.id);
        } else {
            mediaStore.toggleMyList(item);
        }
    };

    // ===== Drag-and-drop handlers =====
    // The card is only draggable when the parent (CinematicRow)
    // has set `isReorderable` to true and the viewport is not
    // mobile. In that case we expose the native HTML5
    // drag-and-drop API and forward the events to the parent
    // via the `onDragStartCard` / `onDragEnterCard` / etc.
    // callbacks. The parent (CinematicRow) is the source of
    // truth for the current drag state.
    const handleDragStart = (event) => {
        if (!isReorderable) return;
        try {
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', String(item.id));
                // Some browsers default to "move" already; being
                // explicit helps with cross-browser behaviour.
                event.dataTransfer.effectAllowed = 'move';
            }
        } catch (_) { /* setData can throw in jsdom / tests */
        }
        onDragStartCard && onDragStartCard(item);
    };

    const handleDragEnter = (event) => {
        if (!isReorderable) return;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        onDragEnterCard && onDragEnterCard(item);
    };

    const handleDragOver = (event) => {
        if (!isReorderable) return;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (event && event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        onDragOverCard && onDragOverCard(event);
    };

    const handleDragLeave = (event) => {
        if (!isReorderable) return;
        onDragLeaveCard && onDragLeaveCard(item, event);
    };

    const handleDragEnd = (event) => {
        if (!isReorderable) return;
        onDragEndCard && onDragEndCard(item, event);
    };

    const handleDrop = (event) => {
        if (!isReorderable) return;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        // The drop is persisted in handleDragEnd once we have a
        // valid source/target pair, but we still mark this card
        // as the drop target here so the parent can clear state
        // on dragend cleanly.
        onDragEndCard && onDragEndCard(item, event);
    };

    const cardClass = [
        'card-3d-wrap',
        isDragActive ? 'selected-for-reorder' : '',
        isDropTarget ? 'reorder-target' : '',
        className || ''
    ].filter(Boolean).join(' ');

    const actionButtonTooltip = isContinueWatching
        ? t('card.removeFromContinueWatching')
        : (isInMyList ? t('card.removeFromList') : t('card.addToList'));

    const actionButtonIcon = isContinueWatching
        ? <CloseIcon/>
        : (isInMyList ? <CheckIcon/> : <AddIcon/>);

    // 3D tilt on hover. Reduced motion collapses to a static glow.
    //
    // The tilt is applied to `innerRef` (the visual layer that
    // contains the holographic surface and the poster image) – NOT
    // to the interactive layer that contains the buttons and the
    // title overlay. This way the buttons stay perfectly aligned
    // with the cursor: a tiny cursor drift between mousedown and
    // mouseup can no longer move the button hit area out from
    // under the cursor and dispatch the `click` event on the
    // common ancestor (the card root), which would open the
    // detail view instead of triggering the button's action.
    useEffect(() => {
        if (reducedMotion()) return undefined;
        const root = rootRef.current;
        const inner = innerRef.current;
        if (!root || !inner) return undefined;
        const neutral = () => {
            inner.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        };
        const onMove = (event) => {
            const rect = root.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            inner.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateZ(0)`;
        };
        const onLeave = () => {
            inner.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        };
        root.addEventListener('mousemove', onMove);
        root.addEventListener('mouseleave', onLeave);
        return () => {
            root.removeEventListener('mousemove', onMove);
            root.removeEventListener('mouseleave', onLeave);
            onLeave();
        };
    }, []);

    const cardBaseStyles = {
        position: 'relative',
        backgroundColor: 'transparent',
        flexShrink: 0,
        width: {xs: 160, md: 208, lg: 256},
        aspectRatio: '2/3',
        transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms cubic-bezier(0.22, 1, 0.36, 1), border-color 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'visible',
        zIndex: 1,
        borderRadius: '12px',
        cursor: isReorderable ? 'grab' : 'pointer',
        border: '1px solid rgba(76, 210, 255, 0.18)',
        // Suppress browser text selection so the user can hold the
        // left mouse button on a card to start a drag-and-drop
        // reorder without the text being highlighted in blue.
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        '& .title-overlay': {opacity: 0, transition: 'opacity 240ms cubic-bezier(0.22,1,0.36,1)'},
        '&:hover .title-overlay': {opacity: 1},
        '& .add-to-list-btn': {
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'opacity 240ms cubic-bezier(0.22,1,0.36,1), transform 240ms cubic-bezier(0.22,1,0.36,1)'
        },
        '&:hover .add-to-list-btn': {opacity: 1, transform: 'translateY(0)'},
        '& .reorder-btn': {opacity: 0, transform: 'scale(0.8)', transition: 'opacity 200ms ease, transform 200ms ease'},
        '&:hover .reorder-btn': {opacity: 1, transform: 'scale(1)'},
        ...(displayMode === 'row' && {
            '&:hover': {
                transform: 'translateY(-6px) scale(1.05)',
                zIndex: 5,
                borderColor: 'var(--neon-accent)',
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55), 0 0 18px rgba(76, 210, 255, 0.45)'
            }
        }),
        ...(displayMode === 'grid' && {
            width: '100%',
            '&:hover': {
                transform: 'translateY(-4px) scale(1.03)',
                zIndex: 10,
                borderColor: 'var(--neon-accent)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(76, 210, 255, 0.35)'
            }
        }),
        ...(isDragActive && {
            transform: 'scale(1.1) translateY(-6px)',
            borderColor: 'var(--neon-accent)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(76, 210, 255, 0.45)',
            zIndex: 100
        })
    };

    return (
        <Box
            id="card-holo"
            data-component="holo-card"
            data-card-id={item && item.id ? String(item.id) : ''}
            ref={rootRef}
            className={cardClass.trim()}
            style={style}
            sx={cardBaseStyles}
            draggable={isReorderable ? true : undefined}
            onClick={() => onClick(item)}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            role="button"
            aria-label={t('card.detailsFor', {title})}
        >
            {/* Tilted visual layer (the only element that gets the 3D
                transform written to it). Contains the holographic
                surface and the poster image. */}
            <Box
                ref={innerRef}
                className="card-3d-inner"
                sx={{position: 'absolute', inset: 0, borderRadius: '12px', overflow: 'hidden'}}
            >
                {/* Holographic surface (sweep on hover) */}
                <Box aria-hidden className="holo-surface"
                     sx={{position: 'absolute', inset: 0, zIndex: 0, borderRadius: '12px', pointerEvents: 'none'}}/>
                {/* Poster / placeholder */}
                {item.poster_path ? (
                    <CardMedia
                        component="img"
                        image={item.poster_path}
                        alt={title}
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(item);
                        }}
                        onMouseDown={stopMouseDownBubble}
                        onPointerDown={stopMouseDownBubble}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'relative',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}
                    />
                ) : (
                    <Box sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(10, 14, 28, 0.55)',
                        position: 'relative',
                        zIndex: 1
                    }}>
                        <TheatersIcon sx={{fontSize: '6rem', color: 'var(--text-dim)'}}/>
                    </Box>
                )}
            </Box>

            {/* Un-tilted interactive layer. Sits on top of the
                tilted visual layer and holds the buttons and the
                title overlay. Because this layer is *not* inside
                the tilted element, the buttons never drift under
                (or away from) the cursor and HTML5 drag-and-drop
                hit-testing on the buttons is stable. */}
            <Box
                className="card-3d-overlay"
                sx={{position: 'absolute', inset: 0, zIndex: 10, borderRadius: '12px', overflow: 'hidden'}}
            >
                {/* Reorder buttons */}
                {isReorderable && (
                    <>
                        <Tooltip title={t('card.moveToTop') || 'Move to top'}>
                            <IconButton
                                className="reorder-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReorderTop && onReorderTop();
                                }}
                                onMouseDown={stopMouseDownBubble}
                                onPointerDown={stopMouseDownBubble}
                                aria-label={t('card.moveToTop') || 'Move to top'}
                                sx={{
                                    position: 'absolute', top: 8, left: 8, zIndex: 11,
                                    bgcolor: 'rgba(5, 6, 13, 0.7)', color: 'var(--text-primary)',
                                    width: 28, height: 28,
                                    '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.9)', transform: 'scale(1.1)'}
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
                                    onReorderBottom && onReorderBottom();
                                }}
                                onMouseDown={stopMouseDownBubble}
                                onPointerDown={stopMouseDownBubble}
                                aria-label={t('card.moveToBottom') || 'Move to bottom'}
                                sx={{
                                    position: 'absolute', top: 42, left: 8, zIndex: 11,
                                    bgcolor: 'rgba(5, 6, 13, 0.7)', color: 'var(--text-primary)',
                                    width: 28, height: 28,
                                    '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.9)', transform: 'scale(1.1)'}
                                }}
                            >
                                <ArrowDownwardIcon sx={{fontSize: 18}}/>
                            </IconButton>
                        </Tooltip>
                    </>
                )}

                {/* Add to list / remove */}
                <Tooltip title={actionButtonTooltip}>
                    <IconButton
                        className="add-to-list-btn"
                        onClick={handleActionButtonClick}
                        onMouseDown={stopMouseDownBubble}
                        onPointerDown={stopMouseDownBubble}
                        aria-label={actionButtonTooltip}
                        sx={{
                            position: 'absolute', top: 8, right: 8, zIndex: 11,
                            bgcolor: 'rgba(5, 6, 13, 0.65)', color: 'var(--neon-accent)',
                            '&:hover': {bgcolor: 'rgba(5, 6, 13, 0.85)', transform: 'scale(1.1)'}
                        }}
                    >
                        {actionButtonIcon}
                    </IconButton>
                </Tooltip>

                {/* Title overlay with kinetic info reveal */}
                <Box
                    className="title-overlay"
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 1.5,
                        background: 'linear-gradient(to top, rgba(5,6,13,0.95) 0%, rgba(5,6,13,0.4) 70%, transparent 100%)',
                        zIndex: 5
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        className="kinetic-reveal"
                        sx={{
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            letterSpacing: '0.01em',
                            textShadow: 'var(--hologram-shadow)',
                            animationDelay: '40ms'
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export const HoloCard = observer(HoloCardInner);
HoloCard.displayName = 'HoloCard';
