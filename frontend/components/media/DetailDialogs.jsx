import React from 'react';
import { observer } from 'mobx-react-lite';
import LinkEpisodesModal from '../modals/LinkEpisodesModal.jsx';
import { mediaStore } from '../../store/mediaStore.js';
import { uiStore } from '../../store/uiStore.js';

// ponytail: observer so DetailDialogs re-renders when modal open state changes.
// Without this, LinkEpisodesModal never mounts when the store updates because
// DetailDialogs has no MobX observable dependency.
export const DetailDialogs = observer(() => {
    // ponytail: track the observable so MobX knows to re-render.
    void mediaStore.isLinkEpisodesModalOpen;
    void uiStore.linkingEpisodesForItem;
    return <LinkEpisodesModal />;
});

DetailDialogs.displayName = 'DetailDialogs';

export default DetailDialogs;
