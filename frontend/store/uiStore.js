/**
 * UIStore
 *
 * Owns the cross-cutting UI state: snackbar, notifications,
 * debug overlay, the various "isOpen" modal flags, and the
 * selection/episode/import context fields. No domain data and
 * no I/O: this is the part of the previous `mediaStore` that
 * was pure view state.
 */
import {makeAutoObservable, runInAction} from 'mobx';

class UIStore {
    // ===== SNACKBAR =====
    snackbarMessage = null;

    // ===== NOTIFICATIONS =====
    notifications = [];
    isNotificationsModalOpen = false;

    // ===== DEBUG =====
    isDebugModeActive = false;
    debugMessages = [];

    // ===== PROFILE / DRAWERS =====
    isProfileDrawerOpen = false;

    // ===== MODAL FLAGS =====
    isShareModalOpen = false;
    isImportModalOpen = false;
    isImportingLibrary = false;
    importUrl = null;
    isRevisionsModalOpen = false;
    isRevisionsLoading = false;
    revisions = [];
    isLinkEpisodesModalOpen = false;
    linkingEpisodesForItem = null;
    isLinkMovieModalOpen = false;
    linkingMovieItem = null;
    isLinkSelectionModalOpen = false;
    itemForLinkSelection = null;
    linksForSelection = [];
    linkSelectionContext = 'local';
    expandedLinkAccordionId = false;
    isEpisodesDrawerOpen = false;
    isEpisodeInfoModalOpen = false;
    episodeInfoModalData = null;

    // ===== DETAIL / EPISODE UI =====
    expandedEpisodeId = null;
    episodeDetailsDialogOpenForEpisodeId = null;
    linkEpisodesTab = 'add';
    linkEpisodesSeason = '';

    // ===== ACTIVE VIEW =====
    activeView = 'Home';

    constructor() {
        makeAutoObservable(this);
    }

    // ===== SNACKBAR =====
    showSnackbar(message, severity = 'info', isTranslationKey = false, translationValues) {
        this.snackbarMessage = { message, severity, isTranslationKey, translationValues };
    }

    hideSnackbar() {
        this.snackbarMessage = null;
    }

    // ===== NOTIFICATIONS =====
    addNotification(notification) {
        const newNotification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            read: false,
            createdAt: Date.now(),
        };
        this.notifications.unshift(newNotification);
    }

    markNotificationRead(id) {
        const notification = this.notifications.find((n) => n.id === id);
        if (notification) notification.read = true;
    }

    markAllNotificationsRead() {
        this.notifications.forEach((n) => (n.read = true));
    }

    clearNotifications() {
        this.notifications = [];
    }

    dismissNotification(id) {
        this.notifications = this.notifications.filter((n) => n.id !== id);
    }

    openNotificationsModal() {
        this.isNotificationsModalOpen = true;
    }

    closeNotificationsModal() {
        this.isNotificationsModalOpen = false;
    }

    get unreadNotificationsCount() {
        return this.notifications.filter((n) => !n.read).length;
    }

    // ===== DEBUG =====
    addDebugMessage(message) {
        this.debugMessages.push({ ...message, ts: Date.now() });
    }

    // ===== VIEW =====
    setActiveView(view) {
        this.activeView = view;
    }

    // ===== PROFILE DRAWER =====
    toggleProfileDrawer(isOpen) {
        this.isProfileDrawerOpen = isOpen;
    }

    // ===== SHARE / IMPORT =====
    openShareModal() {
        this.isShareModalOpen = true;
    }

    closeShareModal() {
        this.isShareModalOpen = false;
    }

    openImportModal() {
        this.isImportModalOpen = true;
    }

    closeImportModal() {
        this.isImportModalOpen = false;
        if (this.importUrl) this.importUrl = null;
    }

    setImportUrl(url) {
        this.importUrl = url;
    }

    setIsImportingLibrary(flag) {
        this.isImportingLibrary = flag;
    }

    // ===== REVISIONS =====
    openRevisionsModal() {
        this.isRevisionsModalOpen = true;
    }

    closeRevisionsModal() {
        this.isRevisionsModalOpen = false;
    }

    setRevisions(revisions) {
        this.revisions = revisions;
    }

    setRevisionsLoading(flag) {
        this.isRevisionsLoading = flag;
    }

    openLinkEpisodesModal(item) {
        this.linkingEpisodesForItem = item;
        this.isLinkEpisodesModalOpen = true;
    }

    closeLinkEpisodesModal() {
        this.isLinkEpisodesModalOpen = false;
        this.linkingEpisodesForItem = null;
    }

    setLinkEpisodesTab(tab) {
        // ponytail: MobX 6 stores administration on an own Symbol property on the
        // Proxy target. Symbol.for() creates a GLOBAL symbol but MobX may use a
        // different instance. Use Object.getOwnPropertySymbols to find it reliably.
        const syms = Object.getOwnPropertySymbols(this);
        const mobxSym = syms.find(s => s.toString().includes('mobx administration'));
        const admin = mobxSym ? this[mobxSym] : null;
        if (admin?.values_) {
            const entry = admin.values_.get('linkEpisodesTab');
            // entry.value_ is the actual observable storage; entry.set is an empty fn
            if (entry) entry.value_ = tab;
        } else {
            // Fallback: direct assignment (works without MobX)
            this.linkEpisodesTab = tab;
        }
    }

    setLinkEpisodesSeason(season) {
        // ponytail: guard against any caller (handleSeasonChange, useEffect, async
        // callbacks, MobX reactions) programmatically resetting season to Specials (0)
        // when a valid season is already selected. MUI Select onChange can fire with
        // value=0 during re-render/remount even when user selected a different season.
        const isSpecialsReset = (season == 0) && (this.linkEpisodesSeason != 0) && (this.linkEpisodesSeason != '');
        if (isSpecialsReset) return;
        this.linkEpisodesSeason = season;
    }

    setExpandedLinkAccordionId(id) {
        this.expandedLinkAccordionId = id;
    }

    setExpandedEpisodeId(id) {
        this.expandedEpisodeId = id;
    }

    openEpisodeDetails(episodeId) {
        this.episodeDetailsDialogOpenForEpisodeId = episodeId;
    }

    closeEpisodeDetails() {
        this.episodeDetailsDialogOpenForEpisodeId = null;
    }

    // ===== LINK MOVIE =====
    openLinkMovieModal(item) {
        this.linkingMovieItem = item;
        this.isLinkMovieModalOpen = true;
    }

    closeLinkMovieModal() {
        this.isLinkMovieModalOpen = false;
        this.linkingMovieItem = null;
    }

    // ===== LINK SELECTION =====
    openLinkSelectionModal(item, links, context = 'local') {
        this.itemForLinkSelection = item;
        this.linksForSelection = links;
        this.linkSelectionContext = context;
        this.isLinkSelectionModalOpen = true;
    }

    closeLinkSelectionModal() {
        this.isLinkSelectionModalOpen = false;
        this.itemForLinkSelection = null;
        this.linkSelectionContext = 'local';
    }

    // ===== EPISODES DRAWER =====
    openEpisodesDrawer() {
        this.isEpisodesDrawerOpen = true;
    }

    closeEpisodesDrawer() {
        this.isEpisodesDrawerOpen = false;
    }

    // ===== EPISODE INFO =====
    openEpisodeInfoModal(episode, seasonNumber, uniqueLanguages) {
        this.episodeInfoModalData = { episode, seasonNumber, uniqueLanguages };
        this.isEpisodeInfoModalOpen = true;
    }

    closeEpisodeInfoModal() {
        this.isEpisodeInfoModalOpen = false;
        this.episodeInfoModalData = null;
    }
}

export const uiStore = new UIStore();
