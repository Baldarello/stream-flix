/**
 * @fileoverview DetailDialogs - Dialog modals for detail view.
 *
 * Contains edit modal, create modal, link-edit modal.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import LinkEpisodesModal from '../modals/LinkEpisodesModal.jsx';

export const DetailDialogs = observer(() => {
    return <LinkEpisodesModal />;
});

DetailDialogs.displayName = 'DetailDialogs';

export default DetailDialogs;
