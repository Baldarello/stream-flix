/**
 * @fileoverview QR Scanner View - QR Code Scanner for Remote Connection
 * 
 * Displays the QR scanner component for connecting as a remote master
 * to a SmartTV slave device.
 */

import React from 'react';
import QRScanner from '../../components/smarttv/QRScanner.jsx';

/**
 * QRScannerView Component
 * 
 * Wrapper for the QRScanner component used when remoteStore.isQRScannerOpen is true.
 * 
 * @returns {React.ReactElement} QR Scanner view
 */
export const QRScannerView = () => {
    return <QRScanner />;
};

QRScannerView.displayName = 'QRScannerView';
