import React, { useState, useRef } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { realAPI, DocumentSubmission } from '../services/realAPI';

interface DocumentUploadProps {
  onDocumentSubmitted: (doc: DocumentSubmission) => void;
}

export function DocumentUpload({ onDocumentSubmitted }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentSubmission['documentType']>('INVOICE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { activeAddress, signTransactions } = useWallet();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !activeAddress) {
      alert('Please select a file and connect your wallet');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const document = await realAPI.submitDocument({
        exporterAddress: activeAddress,
        documentType,
        fileName: selectedFile.name,
        fileContent: selectedFile,
        signer: signTransactions,
      });
      
      onDocumentSubmitted(document);
      setSelectedFile(null);
      setDocumentType('INVOICE');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      alert('Document submitted successfully!');
    } catch (error) {
      console.error('Error submitting document:', error);
      alert('Error submitting document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        📄 Submit Trade Documents
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentSubmission['documentType'])}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            disabled={isSubmitting}
          >
            <option value="INVOICE">Commercial Invoice</option>
            <option value="PACKING_LIST">Packing List</option>
            <option value="CERTIFICATE">Certificate of Origin</option>
            <option value="OTHER">Other Document</option>
          </select>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document File
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="text-green-600 text-2xl">📎</div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-400 text-3xl">📁</div>
                <div className="text-sm text-gray-600">
                  Drag and drop a file here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800 underline"
                    disabled={isSubmitting}
                  >
                    click to select
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Supports: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </div>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || !activeAddress || isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !selectedFile || !activeAddress || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <>
              ⏳ Submitting to IPFS...
              <div className="text-xs opacity-90">Creating immutable document record</div>
            </>
          ) : (
            <>
              🚀 Submit Document
              <div className="text-xs opacity-90">Upload to decentralized storage</div>
            </>
          )}
        </button>
      </form>

      {!activeAddress && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 Please connect your wallet to submit documents
          </p>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
