// IMMEDIATE FIX: Replace your entire eblIntegration.ts file with this code

import { createWorkingEBL } from '../services/workingEBL';

// HARDCODED ADDRESSES AS PROVIDED - EXPORTER, CARRIER, IMPORTER1 ARE THE SAME
const EXPORTER_ADDRESS = 'EWYZFEJLQOZV25XLSMU5TSNPU3LY4U36IWDPSRQXOKWYBOLFZEXEB6UNWE';
const CARRIER_ADDRESS = 'NGSCRH4EMXMTOG6L362K35XHWEMCMAHFI3LUE46B4I23D4U2K334SG5CRM';

export const handleRealBLCreation = async (
  blData: any, 
  activeAddress: string | null,
  signTransactions: any,
  setIsCreatingBL: (value: boolean) => void,
  setCreatedBLs: (fn: (prev: any[]) => any[]) => void
) => {
  console.log('=== CREATING eBL WITH HARDCODED ADDRESSES ===');
  console.log('Hardcoded Exporter Address:', EXPORTER_ADDRESS);
  console.log('Wallet Active Address:', activeAddress);

  // Use wallet address if available, otherwise use hardcoded carrier address
  const senderAddress = activeAddress && activeAddress.trim() !== '' ? activeAddress : CARRIER_ADDRESS;
  
  console.log('Using sender address:', senderAddress);
  console.log('Using exporter address:', EXPORTER_ADDRESS);

  if (!signTransactions || typeof signTransactions !== 'function') {
    alert('Wallet signing function is not available. Please reconnect your wallet.');
    return;
  }
  
  if (!blData || !blData.isRealBlockchainTransaction) {
    console.warn('Warning: This should be a real blockchain transaction');
    return;
  }

  if (!blData.eblReference || blData.eblReference.trim() === '') {
    alert('eBL reference is required');
    return;
  }

  setIsCreatingBL(true);
  
  try {
    console.log('Creating eBL with parameters:');
    console.log('- instrumentNumber:', blData.eblReference);
    console.log('- exporterAddress:', EXPORTER_ADDRESS);
    console.log('- sender:', senderAddress);
    console.log('- cargoDescription:', blData.cargoDescription || 'General Cargo');
    console.log('- cargoValue:', blData.cargoValue || 0);
    
    // Create the eBL with hardcoded addresses
    const result = await createWorkingEBL({
      instrumentNumber: blData.eblReference.trim(),
      exporterAddress: EXPORTER_ADDRESS, // Always use hardcoded exporter
      cargoDescription: blData.cargoDescription || 'General Cargo',
      cargoValue: (blData.cargoValue || 0) * 100,
      sender: senderAddress, // Use wallet or fallback to hardcoded carrier
      signer: signTransactions
    });
    
    console.log('eBL created successfully:', result);
    
    const newBL = {
      id: blData.eblReference,
      reference: blData.eblReference,
      transportDocumentReference: blData.eblReference,
      status: 'ISSUED',
      assignedToExporter: EXPORTER_ADDRESS, // Direct field for easier filtering
      currentHolder: EXPORTER_ADDRESS, // Direct field for current owner
      createdByCarrier: {
        carrierAddress: senderAddress,
        assignedToExporter: EXPORTER_ADDRESS,
        creationTxId: result.txId,
        explorerUrl: result.explorerUrl
      },
      tokenizationData: {
        tokenCreationTx: {
          txId: result.txId,
          confirmedRound: result.confirmedRound,
          explorerUrl: result.explorerUrl,
          blId: blData.eblReference,
          amount: blData.cargoValue
        },
        assetId: result.assetId,
        assetExplorerUrl: result.assetId 
          ? `https://testnet.algoexplorer.io/asset/${result.assetId}`
          : undefined,
        assetMetadata: {
          assetName: 'eBL',
          unitName: 'eBL',
          totalSupply: 1,
          decimals: 0
        },
        ownershipInfo: {
          owner: EXPORTER_ADDRESS,
          manager: EXPORTER_ADDRESS,
          reserve: EXPORTER_ADDRESS,
          freeze: EXPORTER_ADDRESS
        }
      },
      billOfLadingNumber: blData.eblReference,
      carrierName: 'Digital Carrier',
      shipper: {
        name: blData.selectedExporter || 'Digital Exporter',
        address: 'India'
      },
      consignee: {
        name: 'To Be Assigned',
        address: 'Netherlands'
      },
      vessel: {
        name: blData.vesselName || 'Digital Vessel',
        voyage: 'V001'
      },
      portOfLoading: {
        name: blData.portOfLoading || 'Chennai',
        country: 'India'
      },
      portOfDischarge: {
        name: blData.portOfDischarge || 'Rotterdam',
        country: 'Netherlands'
      },
      cargoDescription: blData.cargoDescription || 'General Cargo',
      packages: [
        {
          quantity: 100,
          type: 'PP Bags',
          description: blData.cargoDescription || 'General Cargo'
        }
      ],
      grossWeight: { value: 2500, unit: 'KGS' },
      measurement: { value: 50, unit: 'CBM' },
      dateOfIssue: new Date().toISOString(),
      placeOfIssue: 'Chennai',
      freightAndCharges: 'Prepaid',
      declaredValue: {
        amount: blData.cargoValue || 0,
        currency: blData.currency || 'USD'
      },
      transactions: [
        {
          id: result.txId,
          type: 'CREATE_EBL',
          status: 'CONFIRMED',
          timestamp: new Date().toISOString(),
          fromAddress: senderAddress,
          toAddress: EXPORTER_ADDRESS,
          amount: blData.cargoValue || 0,
          explorerUrl: result.explorerUrl,
          description: `eBL created by carrier and assigned to exporter`
        }
      ]
    };
    
    setCreatedBLs(prev => [newBL, ...prev]);
    
    // Return success data instead of showing alert
    return {
      success: true,
      bl: newBL,
      txId: result.txId,
      assetId: result.assetId,
      explorerUrl: result.explorerUrl,
      exporterAddress: EXPORTER_ADDRESS,
      carrierAddress: senderAddress
    };
    
  } catch (error) {
    console.error('Error creating eBL:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error('Full error details:', {
      error,
      activeAddress,
      senderAddress,
      exporterAddress: EXPORTER_ADDRESS,
      blData: {
        eblReference: blData?.eblReference,
        selectedExporter: blData?.selectedExporter
      }
    });
    
    // Return error data instead of showing alert
    return {
      success: false,
      error: errorMessage,
      exporterAddress: EXPORTER_ADDRESS,
      carrierAddress: senderAddress
    };
  } finally {
    setIsCreatingBL(false);
  }
};