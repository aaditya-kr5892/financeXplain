import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragging(true);
        } else if (e.type === 'dragleave') {
            setDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        const validExts = ['.csv', '.xlsx', '.xls'];

        const isTypeValid = validTypes.includes(file.type);
        const isExtValid = validExts.some(ext => file.name.endsWith(ext));

        if (!isTypeValid && !isExtValid) {
            setStatus('error');
            setMessage('Please upload a valid CSV or Excel file.');
            return;
        }

        setUploading(true);
        setStatus(null);
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Use relative path via Vite Proxy
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setStatus('success');
            setMessage(`Successfully processed ${file.name}!`);
            if (onUploadSuccess) onUploadSuccess();

        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage('Failed to upload file. Check console.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${dragging
                ? 'border-blue-400 bg-blue-500/10 scale-[1.02]'
                : 'border-white/10 hover:border-white/20 bg-slate-800/30'
                }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                className="hidden"
                id="file-upload"
                accept=".csv, .xlsx, .xls"
                onChange={handleChange}
                disabled={uploading}
            />

            <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-4"
            >
                {uploading ? (
                    <Loader2 className="animate-spin text-blue-400" size={48} />
                ) : status === 'success' ? (
                    <CheckCircle className="text-green-400" size={48} />
                ) : status === 'error' ? (
                    <AlertCircle className="text-red-400" size={48} />
                ) : (
                    <UploadCloud className="text-blue-400" size={48} />
                )}

                <div>
                    <p className="text-lg font-medium text-white">
                        {uploading ? 'Processing Data...' : status === 'success' ? 'Upload Complete!' : 'Upload Bank Statement'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        {message || 'Drag & drop CSV/Excel or click to browse'}
                    </p>
                </div>
            </label>
        </div>
    );
};

export default FileUpload;
