/**
 * @fileoverview QR Scanner View - QR Code Scanner for Remote Connection
 * 
 * Displays the QR scanner component for connecting as a remote master
 * to a SmartTV slave device.
 */

import React from 'react';
import MasterScreen from '@/remote/MasterScreen.jsx';

/**
 * QRScannerView Component
 * 
 * Wrapper for the MasterScreen component used when remoteStore.isQRScannerOpen is true.
 * 
 * @returns {React.ReactElement} QR Scanner view
 */
export const QRScannerView = () => {
    return <MasterScreen />;
};

QRScannerView.displayName = 'QRScannerView';
