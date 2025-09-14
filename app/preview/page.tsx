'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DesignCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

const designCategories: DesignCategory[] = [
  {
    id: 'floor',
    name: 'Floor',
    icon: '🔲',
    description: 'Change your floor design and materials'
  },
  {
    id: 'walls',
    name: 'Walls',
    icon: '🏗️',
    description: 'Transform your wall appearance'
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: '🪑',
    description: 'Add or replace furniture'
  },
  {
    id: 'lighting',
    name: 'Lighting',
    icon: '💡',
    description: 'Modify lighting and fixtures'
  },
  {
    id: 'decor',
    name: 'Decor',
    icon: '🎭',
    description: 'Add decorative elements'
  }
];

export default function PreviewPage() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        // Get the image data from sessionStorage
        const photo = sessionStorage.getItem('capturedPhoto');
        if (photo) {
          setImageUrl(photo);
          // Clear the data from sessionStorage to free up memory
          sessionStorage.removeItem('capturedPhoto');
        } else {
          // If no photo is found, redirect back to capture
          router.replace('/');
        }
      } catch (error) {
        console.error('Error accessing sessionStorage:', error);
        router.replace('/');
      }
    }
  }, [isMounted, router]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleGenerateDesign = async () => {
    if (!imageUrl) {
      console.error('No image URL available');
      return;
    }

    try {
      // Validate that we have a proper data URL
      if (!imageUrl.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      const categoriesParam = Array.from(selectedCategories).join(',');
      
      // Double-check that the image data is valid base64
      const [header, base64Data] = imageUrl.split(',');
      if (!header.includes(';base64') || !base64Data) {
        throw new Error('Invalid image data format');
      }

      // Test decoding to catch any issues early
      try {
        atob(base64Data);
      } catch (e) {
        throw new Error('Invalid base64 image data');
      }

      // Store the image in sessionStorage
      sessionStorage.setItem('designPhoto', imageUrl);
      
      // Only pass categories in the URL
      router.push(`/compare?categories=${encodeURIComponent(categoriesParam)}`);
    } catch (error) {
      console.error('Error preparing image:', error);
      // TODO: Show error to user
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <header className="w-full py-6 px-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Design Generator</h1>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 text-sm bg-transparent border border-white/20 rounded-full hover:bg-white/10 transition"
        >
          Take New Photo
        </button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {imageUrl ? (
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12 min-h-[calc(100vh-120px)]">
            {/* Left Side - Photo Preview */}
            <div className="w-full lg:w-1/2 lg:sticky lg:top-8">
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black/40 shadow-2xl">
                  <img
                    src={imageUrl}
                    alt="Captured photo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm border border-white/10">
                  Your Room Photo
                </div>
              </div>
            </div>

            {/* Right Side - Options */}
            <div className="w-full lg:w-1/2 mt-12 lg:mt-0">
              <div className="space-y-8">
                {/* Design Categories */}
                <div>
                  <h2 className="text-2xl font-semibold mb-6">What would you like to redesign?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {designCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`
                          p-4 rounded-xl border transition-all duration-200 text-left
                          ${selectedCategories.has(category.id)
                            ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{category.icon}</div>
                          <div>
                            <div className="font-medium">{category.name}</div>
                            <div className="text-sm text-gray-400">{category.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Design Button - Only shown when categories are selected */}
                {selectedCategories.size > 0 && (
                  <div className="pt-4">
                    <button
                      onClick={handleGenerateDesign}
                      className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-lg font-semibold 
                               hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] 
                               shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <span>Generate Design</span>
                      <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                        {selectedCategories.size} selected
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-[60vh]">
            <div className="animate-pulse">Loading your photo...</div>
          </div>
        )}
      </main>
    </div>
  );
}
