import React from 'react';
import { Box, Paper } from '@mui/material';
import { useTranslations } from '../../../hooks/useTranslations.js';

const QRCodeCard = ({ qrCodeUrl }) => {
    const { t } = useTranslations();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                display: 'inline-block',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 3,
            }}
        >
            <Box
                component="img"
                src={qrCodeUrl}
                alt={t('smartTV.qrAlt')}
                sx={{
                    width: 200,
                    height: 200,
                    borderRadius: 2,
                    display: 'block',
                }}
            />
        </Paper>
    );
};

export default QRCodeCard;
