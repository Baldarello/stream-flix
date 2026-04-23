import React from 'react';
import {Box, Paper} from '@mui/material';
import {useTranslations} from '../../hooks/useTranslations.ts';

interface QRCodeCardProps {
    qrCodeUrl: string;
}

const QRCodeCard: React.FC<QRCodeCardProps> = ({qrCodeUrl}) => {
    const {t} = useTranslations();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                display: 'inline-block',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -2,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, rgba(0,163,255,0.5), rgba(76,175,80,0.5))',
                    zIndex: -1,
                    filter: 'blur(8px)',
                    animation: 'glow 3s ease-in-out infinite',
                    '@keyframes glow': {
                        '0%, 100%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                    },
                },
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
            {/* Scanline effect overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
                    pointerEvents: 'none',
                    borderRadius: 3,
                }}
            />
        </Paper>
    );
};

export default QRCodeCard;
