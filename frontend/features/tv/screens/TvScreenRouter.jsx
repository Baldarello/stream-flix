import React from 'react';
import { observer } from 'mobx-react-lite';
import tvStore from '../tvStore.js';
import TvHomeView from './TvHomeView.jsx';
import TvMyListView from './TvMyListView.jsx';
import TvPairingView from './TvPairingView.jsx';
import TvPlayerView from './TvPlayerView.jsx';

/**
 * TvScreenRouter - Switches between TV views based on tvStore.screen
 */
const TvScreenRouter = observer(() => {
    const currentScreen = tvStore.screen;

    const renderScreen = () => {
        switch (currentScreen) {
            case 'home':
                return <TvHomeView />;
            case 'myList':
                return <TvMyListView />;
            case 'pairing':
                return <TvPairingView />;
            case 'player':
                return <TvPlayerView />;
            default:
                return <TvHomeView />;
        }
    };

    return (
        <div 
            id="tv-screen" 
            className="tv-screen"
            data-screen={currentScreen}
        >
            {renderScreen()}
        </div>
    );
});

export default TvScreenRouter;
