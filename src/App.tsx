/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Wand2, Download, RefreshCw, AlertCircle, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [instruction, setInstruction] = useState<string>('Remove the background and place the product on a clean white surface with a soft shadow.');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    setOriginalImage(file);
    setEditedImage(null);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearImage = () => {
    setOriginalImage(null);
    setOriginalImagePreview(null);
    setEditedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !instruction.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Extract base64 string from data URL
      const base64String = originalImagePreview?.split(',')[1];
      if (!base64String) throw new Error("Failed to read image data.");
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64String,
                mimeType: originalImage.type,
              },
            },
            {
              text: instruction,
            },
          ],
        },
      });
      
      let newImageUrl = null;
      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (newImageUrl) {
        setEditedImage(newImageUrl);
      } else {
        setError("Failed to generate edited image. The model might not have returned an image.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const a = document.createElement('a');
    a.href = editedImage;
    a.download = `edited-product-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Product Photo Cleaner</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Upload a product photo and describe how you want to clean it up. 
            Perfect for removing backgrounds or enhancing lighting.
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Input */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                Original Photo
              </h2>
              
              {!originalImagePreview ? (
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-4" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 min-h-[300px] flex items-center justify-center group">
                  <img 
                    src={originalImagePreview} 
                    alt="Original" 
                    className="max-w-full max-h-[400px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-500" />
                Instructions
              </h2>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="E.g., Remove the background and place the product on a clean white surface..."
                className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none text-sm"
                disabled={isGenerating}
              />
              
              <button
                onClick={handleGenerate}
                disabled={!originalImage || !instruction.trim() || isGenerating}
                className="w-full mt-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Clean Up Photo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-500" />
                Result
              </h2>
              {editedImage && (
                <button
                  onClick={handleDownload}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>

            <div className="flex-1 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center min-h-[400px] relative">
              {error ? (
                <div className="p-6 text-center text-red-500 flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : isGenerating ? (
                <div className="flex flex-col items-center text-gray-400">
                  <RefreshCw className="w-10 h-10 mb-4 animate-spin text-purple-500" />
                  <p className="text-sm font-medium animate-pulse">AI is working its magic...</p>
                </div>
              ) : editedImage ? (
                <img 
                  src={editedImage} 
                  alt="Edited result" 
                  className="max-w-full max-h-[600px] object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center text-gray-400 p-6">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Your cleaned up photo will appear here</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
