/**
 * @fileoverview FloatingDock - cinematic morphing navigation shell.
 *
 * Replaces the legacy `Header.jsx` with a floating, contextual dock that:
 *  - Anchors the primary navigation (Home / Series / Movies / Anime / List / Library).
 *  - Anchors the secondary actions (Search, Notifications, QR, SmartTV, Profile).
 *  - On mobile, collapses into a slim bottom bar; the primary items remain
 *    accessible via a single FAB that morphs the dock open.
 *  - On desktop, sits as a floating glass bar at the top with a holographic
 *    edge, matching the rest of the futuristic visual language.
 *
 * MobX-driven. Reads `mediaStore.activeView` to highlight the current section
 * and calls `mediaStore.setActiveView(...)` to navigate. The dock does not own
 * the active-view key itself; that responsibility stays with mediaStore.
 *
 * The component is also the canonical place where the `data-view-key` attribute
 * of the active section is reported to the transition portal via a MobX
 * effect on the `fxStore.setTargetViewKey` action.
 */

import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
    Badge,
    Box,
    Button,
    IconButton,
    TextField,
    useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import TvIcon from '@mui/icons-material/Tv';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { mediaStore } from '../../store/mediaStore.js';
import { remoteStore } from '../../store/remoteStore.js';
import { useTranslations } from '../../hooks/useTranslations.js';

const NAV_KEYS = [
    { key: 'home', view: 'Home', icon: HomeIcon },
    { key: 'series', view: 'Serie TV' },
    { key: 'movies', view: 'Film' },
    { key: 'anime', view: 'Anime' },
    { key: 'myList', view: 'La mia lista' },
    { key: 'library', view: 'Libreria' }
];

export const FloatingDock = observer(() => {
    const {
        isSearchActive,
        toggleSearch,
        searchQuery,
        setSearchQuery,
        unreadNotificationsCount,
        openNotificationsModal,
        currentActiveView
    } = mediaStore;
    const { t } = useTranslations();
    const searchInputRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 720px)');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (isSearchActive) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isSearchActive]);

    const handleNavClick = (view) => {
        toggleSearch(false);
        setOpen(false);
        if (remoteStore.isRemoteMaster) {
            remoteStore._masterUiSelectedItem = null;
            remoteStore.sendRemoteCommand({ command: 'clear_selection' });
            mediaStore.setActiveView(view);
        } else {
            mediaStore.setActiveView(view);
        }
    };

    return (
        <Box
            id="dock-floating"
            data-component="floating-dock"
            data-mode={isMobile ? 'mobile' : 'desktop'}
            data-open={isMobile ? (open || isSearchActive) : 'true'}
            className="holo-surface dock-morph"
            sx={{
                position: 'fixed',
                top: isMobile ? 'auto' : 'calc(16px + env(safe-area-inset-top))',
                bottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 'auto',
                left: '50%',
                transform: 'translateX(-50%)',
                width: isMobile ? 'calc(100% - 24px)' : 'auto',
                maxWidth: isMobile ? '420px' : '1180px',
                minHeight: 56,
                padding: isMobile ? '8px 12px' : '6px 18px',
                borderRadius: isMobile ? '28px' : '999px',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                zIndex: 1300,
                boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45), 0 0 24px rgba(76, 210, 255, 0.18)'
            }}
        >
            {/* Brand */}
            <Box
                id="dock-brand"
                onClick={() => handleNavClick('Home')}
                sx={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'var(--text-primary)',
                    textShadow: 'var(--hologram-shadow)',
                    cursor: 'pointer',
                    px: 1,
                    flexShrink: 0,
                    userSelect: 'none'
                }}
            >
                QUIX
            </Box>

            {/* Primary nav (desktop) */}
            {!isMobile && (
                <Box
                    id="dock-nav"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}
                >
                    {NAV_KEYS.map((item) => {
                        const isActive = currentActiveView === item.view;
                        return (
                            <Button
                                key={String(item.key)}
                                data-nav-key={String(item.key)}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => handleNavClick(item.view)}
                                sx={{
                                    color: 'var(--text-primary)',
                                    fontWeight: isActive ? 700 : 500,
                                    opacity: isActive ? 1 : 0.75,
                                    minWidth: 'auto',
                                    px: 1.4,
                                    py: 0.6,
                                    borderRadius: '999px',
                                    position: 'relative',
                                    transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1), background 180ms cubic-bezier(0.22,1,0.36,1), transform 180ms cubic-bezier(0.22,1,0.36,1)',
                                    background: isActive ? 'rgba(76, 210, 255, 0.12)' : 'transparent',
                                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(76, 210, 255, 0.45), 0 0 12px rgba(76, 210, 255, 0.25)' : 'none',
                                    '&:hover': { opacity: 1, background: 'rgba(76, 210, 255, 0.08)' },
                                    '&:focus-visible': { outline: '2px solid var(--neon-accent)', outlineOffset: 2 }
                                }}
                            >
                                {t(`header.${String(item.key)}`)}
                            </Button>
                        );
                    })}
                </Box>
            )}

            {/* Mobile expand trigger */}
            {isMobile && !open && !isSearchActive && (
                <Box sx={{ flex: 1 }} />
            )}

            {/* Mobile open nav */}
            {isMobile && (open || isSearchActive) && (
                <Box
                    id="dock-nav"
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        ml: 1,
                        flex: 1
                    }}
                >
                    {NAV_KEYS.map((item) => {
                        const isActive = currentActiveView === item.view;
                        return (
                            <Button
                                key={String(item.key)}
                                data-nav-key={String(item.key)}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => handleNavClick(item.view)}
                                size="small"
                                sx={{
                                    color: 'var(--text-primary)',
                                    fontWeight: isActive ? 700 : 500,
                                    minWidth: 'auto',
                                    px: 1.2,
                                    py: 0.4,
                                    borderRadius: '999px',
                                    fontSize: '0.78rem',
                                    background: isActive ? 'rgba(76, 210, 255, 0.18)' : 'rgba(255,255,255,0.04)',
                                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(76, 210, 255, 0.6)' : 'none',
                                    '&:focus-visible': { outline: '2px solid var(--neon-accent)', outlineOffset: 2 }
                                }}
                            >
                                {t(`header.${String(item.key)}`)}
                            </Button>
                        );
                    })}
                </Box>
            )}

            {/* Search */}
            {isSearchActive && (
                <TextField
                    id="dock-search"
                    fullWidth
                    variant="standard"
                    placeholder={t('header.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    inputRef={searchInputRef}
                    sx={{
                        ml: 1,
                        '& .MuiInput-underline:before': { borderBottomColor: 'rgba(76, 210, 255, 0.45)' },
                        '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'var(--neon-accent-hot)' },
                        flex: isMobile ? 1 : 'unset',
                        minWidth: isMobile ? 120 : 200
                    }}
                    InputProps={{
                        startAdornment: (
                            <Box component="span" sx={{ display: 'inline-flex', mr: 1, color: 'var(--neon-accent)' }}>
                                <SearchIcon fontSize="small" />
                            </Box>
                        )
                    }}
                />
            )}

            {/* Right side actions */}
            <Box
                id="dock-actions"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}
            >
                <IconButton
                    id="dock-action-search"
                    aria-label="search"
                    onClick={() => toggleSearch(!isSearchActive)}
                    sx={{ color: 'var(--text-primary)' }}
                >
                    {isSearchActive ? <CloseIcon /> : <SearchIcon />}
                </IconButton>
                {!isSearchActive && (
                    <>
                        <IconButton
                            id="dock-action-notifications"
                            aria-label="notifications"
                            onClick={openNotificationsModal}
                            sx={{ color: 'var(--text-primary)' }}
                        >
                            <Badge badgeContent={unreadNotificationsCount} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>
                        <IconButton
                            id="dock-action-slave"
                            aria-label="smart-tv"
                            onClick={() => remoteStore.enableSmartTVMode()}
                            sx={{ color: 'var(--text-primary)' }}
                        >
                            <TvIcon />
                        </IconButton>
                        <IconButton
                            id="dock-action-qr"
                            aria-label="qr-scanner"
                            onClick={() => remoteStore.openQRScanner()}
                            sx={{ color: 'var(--text-primary)' }}
                        >
                            <QrCodeScannerIcon />
                        </IconButton>
                        <IconButton
                            id="dock-action-profile"
                            aria-label="profile"
                            onClick={() => mediaStore.toggleProfileDrawer(true)}
                            sx={{ color: 'var(--text-primary)' }}
                        >
                            <MenuIcon />
                        </IconButton>
                        {isMobile && (
                            <IconButton
                                id="dock-action-toggle"
                                aria-label="toggle-nav"
                                onClick={() => setOpen((v) => !v)}
                                sx={{ color: 'var(--text-primary)' }}
                            >
                                {open ? <CloseIcon /> : <MenuIcon />}
                            </IconButton>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
});

FloatingDock.displayName = 'FloatingDock';
