/**
 * @fileoverview Playback Middleware - QR Scanner Handler
 * 
 * This middleware handles the QR scanner mode for SmartTV pairing,
 * displaying the QR scanner component when enabled.
 */

import React from 'react';
import QRScanner from '../../components/smarttv/QRScanner.jsx';

/**
 * QR Scanner Middleware
 * 
 * Checks if the QR scanner is open and displays the QR scanner component.
 * This middleware runs after system middlewares and before other playback modes.
 * 
 * @param {Object} context - Middleware context
 * @param {Object} context.stores - Application stores
 * @param {Object} context.stores.remoteStore - Remote store with QR scanner state
 * @param {React.ReactNode} context.children - Child content from previous middleware
 * @returns {React.ReactElement|null} QR Scanner component or null to continue chain
 */
export const QRScannerMiddleware = ({ stores, children }) => {
    const { isQRScannerOpen } = stores.remoteStore;

    if (isQRScannerOpen) {
        return <QRScanner />;
    }

    return children;
};
