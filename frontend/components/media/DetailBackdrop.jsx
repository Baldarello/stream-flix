/**
 * @fileoverview DetailBackdrop - Backdrop image for detail view.
 */

import React from 'react';
import {observer} from 'mobx-react-lite';
import {Box} from '@mui/material';

export const DetailBackdrop = observer(({ backgroundImage }) => (
    backgroundImage ? (
        <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(20px) brightness(0.5)', transform: 'scale(1.1)',
        }} />
    ) : (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'var(--bg-deep)' }} />
    )
));

DetailBackdrop.displayName = 'DetailBackdrop';

export default DetailBackdrop;
