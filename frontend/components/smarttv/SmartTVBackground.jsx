import React from 'react';
import {Box} from '@mui/material';

const SmartTVBackground: React.FC = () => {
    return (
        <>
            {/* Animated background - fixed so it doesn't scroll */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                    zIndex: 0,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(0,163,255,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(76,175,80,0.06) 0%, transparent 50%)',
                        animation: 'bgMove 20s ease-in-out infinite',
                        '@keyframes bgMove': {
                            '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
                            '50%': { transform: 'translate(-5%, -5%) rotate(180deg)' },
                        },
                    },
                }}
            />
            {/* Decorative elements - fixed so they don't scroll */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '10%',
                    right: '10%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,163,255,0.1) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '10%',
                    width: 250,
                    height: 250,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(76,175,80,0.08) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
        </>
    );
};

export default SmartTVBackground;
